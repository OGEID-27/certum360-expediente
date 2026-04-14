import { Injectable } from '@angular/core';
import {
  Answer,
  Assignment,
  Attempt,
  Certification,
  FileAnswerValue,
  FilterAnswerValue,
  FilterQuestionConfig,
  MixtaAnswerValue,
  Question,
  Questionnaire,
  Section,
} from '../models';
import { LocalStorageEvaluacionesRepository } from './local-storage-evaluaciones.repository';

export interface DemoQuestionState {
  answered: boolean;
  correct: boolean;
}

export interface DemoAssignmentProfile {
  assignmentId: string;
  clientId: string;
  clientName: string;
  certificationId: string;
  certificationName: string;
  accent: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

export interface DemoSectionMetrics {
  section: Section;
  questions: Question[];
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  completionPercent: number;
  scorePercent: number | null;
}

export interface DemoAttemptMetrics {
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  progressPercent: number;
  scorePercent: number | null;
  passScore: number | null;
  passed: boolean | null;
  isScored: boolean;
  sectionMetrics: DemoSectionMetrics[];
}

interface DemoRegistry {
  questions: string[];
  sections: string[];
  questionnaires: string[];
  certifications: string[];
  assignments: string[];
  attempts: string[];
}

interface DemoStore {
  version: string;
  registry: DemoRegistry;
  profiles: Record<string, DemoAssignmentProfile>;
  attemptStates: Record<string, Record<string, DemoQuestionState>>;
}

type DemoScenario =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'INFO_SUBMITTED'
  | 'EXPIRED';

@Injectable({ providedIn: 'root' })
export class UserEvaluationsDemoService {
  readonly storageKey = 'evaluaciones.user.demo';

  private readonly version = '2026-03-premium-v1';
  private readonly legacyIds = {
    questions: [
      'q_demo_1',
      'q_demo_2',
      'q_demo_3',
      'q_demo_4',
      'q_demo_5',
      'q_demo_6',
      'q_demo_7',
      'q_demo_8',
      'q_demo_9',
      'q_demo_10',
      'q_demo_11',
    ],
    sections: ['s_demo_1'],
    questionnaires: ['cq_demo_1'],
    certifications: ['cert_demo_1'],
    assignments: ['asg_demo_1', 'asg_demo_2'],
  } as const;

  constructor(private readonly repository: LocalStorageEvaluacionesRepository) {}

  ensureDemoData(): void {
    const store = this.readStore();
    if (store?.version === this.version && this.registryStillExists(store.registry)) {
      return;
    }

    this.seedDemoData();
  }

  resetDemoData(): void {
    this.seedDemoData();
  }

  getProfile(assignmentId: string): DemoAssignmentProfile | undefined {
    return this.readStore()?.profiles[assignmentId];
  }

  getCertificationByQuestionnaire(questionnaireId: string): Certification | undefined {
    return this.repository
      .getCertifications()
      .find((certification) => certification.questionnaireIds.includes(questionnaireId));
  }

  isExpired(questionnaire: Questionnaire, referenceDate = new Date()): boolean {
    const activeTo = questionnaire.settings.activeTo;
    return !!activeTo && Date.parse(activeTo) < referenceDate.getTime();
  }

  getAttemptState(
    attemptId: string,
    questions: Question[],
  ): Record<string, DemoQuestionState> {
    const store = this.readStore();
    const existing = store?.attemptStates[attemptId];
    if (existing) {
      return this.normalizeAttemptState(existing, questions);
    }

    const derived = this.deriveAttemptStateFromAnswers(attemptId, questions);
    if (Object.keys(derived).length > 0) {
      this.persistAttemptState(attemptId, questions, derived);
    }

    return derived;
  }

  saveAttemptState(
    attemptId: string,
    questions: Question[],
    state: Record<string, DemoQuestionState>,
  ): Attempt | undefined {
    const normalized = this.normalizeAttemptState(state, questions);
    this.persistAttemptState(attemptId, questions, normalized);
    const answers = this.buildAnswers(questions, normalized);
    return this.repository.saveAttemptAnswers(attemptId, answers);
  }

  submitAttempt(
    attemptId: string,
    questions: Question[],
    state: Record<string, DemoQuestionState>,
  ): Attempt | undefined {
    const normalized = this.normalizeAttemptState(state, questions);
    this.persistAttemptState(attemptId, questions, normalized);
    const answers = this.buildAnswers(questions, normalized);
    return this.repository.submitAttempt(attemptId, answers);
  }

  getAttemptMetrics(
    questionnaire: Questionnaire,
    attempt?: Attempt,
  ): DemoAttemptMetrics {
    const sectionMetrics = this.buildSectionMetrics(questionnaire, attempt);
    const answeredCount = sectionMetrics.reduce((sum, section) => sum + section.answeredCount, 0);
    const correctCount = sectionMetrics.reduce((sum, section) => sum + section.correctCount, 0);
    const totalQuestions = sectionMetrics.reduce((sum, section) => sum + section.totalQuestions, 0);
    const isScored = this.isQuestionnaireScored(questionnaire.id);
    const passScore = this.getPassScore(questionnaire.id);
    const scorePercent =
      isScored && totalQuestions > 0 ? this.toPercent((correctCount / totalQuestions) * 100) : null;

    return {
      answeredCount,
      correctCount,
      totalQuestions,
      progressPercent: totalQuestions > 0 ? this.toPercent((answeredCount / totalQuestions) * 100) : 0,
      scorePercent,
      passScore,
      passed:
        !isScored || scorePercent === null || passScore === null
          ? isScored
            ? null
            : true
          : scorePercent >= passScore,
      isScored,
      sectionMetrics,
    };
  }

  getAttemptStateForQuestion(
    attemptId: string,
    questionId: string,
    questions: Question[],
  ): DemoQuestionState {
    return this.getAttemptState(attemptId, questions)[questionId] ?? {
      answered: false,
      correct: false,
    };
  }

  createOrResumeAttempt(assignmentId: string, userId: string): Attempt {
    const attempt = this.repository.getOrCreateInProgressAttempt(assignmentId, userId);
    const questionnaire = this.getQuestionnaireForAssignment(assignmentId);
    if (questionnaire) {
      this.getAttemptState(attempt.id, this.getQuestionsForQuestionnaire(questionnaire.id));
    }
    return attempt;
  }

  getQuestionnaireForAssignment(assignmentId: string): Questionnaire | undefined {
    const assignment = this.repository.getAssignmentById(assignmentId);
    if (!assignment) {
      return undefined;
    }

    return this.repository
      .getQuestionnaires()
      .find((item) => item.id === assignment.questionnaireId);
  }

  getQuestionsForQuestionnaire(questionnaireId: string): Question[] {
    const sections = this.getSectionsForQuestionnaire(questionnaireId);
    const questionsById = new Map(
      this.repository.getQuestions().map((question) => [question.id, question]),
    );

    return sections.flatMap((section) =>
      section.questionIds
        .map((questionId) => questionsById.get(questionId))
        .filter((question): question is Question => !!question),
    );
  }

  getSectionsForQuestionnaire(questionnaireId: string): Section[] {
    const questionnaire = this.repository
      .getQuestionnaires()
      .find((item) => item.id === questionnaireId);
    if (!questionnaire) {
      return [];
    }

    const sectionsById = new Map(
      this.repository.getSections().map((section) => [section.id, section]),
    );

    return questionnaire.sectionIds
      .map((sectionId) => sectionsById.get(sectionId))
      .filter((section): section is Section => !!section);
  }

  private seedDemoData(): void {
    const previousStore = this.readStore();
    this.cleanupExistingDemo(previousStore?.registry);

    const now = new Date();
    const createdAt = now.toISOString();

    const questions = this.buildQuestions(createdAt);
    const sections = this.buildSections();
    const questionnaires = this.buildQuestionnaires(now);
    const certifications = this.buildCertifications();

    questions.forEach((question) => this.repository.saveQuestion(question));
    sections.forEach((section) => this.repository.saveSection(section));
    questionnaires.forEach((questionnaire) => this.repository.saveQuestionnaire(questionnaire));
    certifications.forEach((certification) => this.repository.saveCertification(certification));

    const seeded = this.buildAssignmentsAndAttempts(now, questions);
    seeded.assignments.forEach((assignment) => this.repository.saveAssignment(assignment));
    seeded.attempts.forEach((attempt) => this.repository.saveAttempt(attempt));

    const store: DemoStore = {
      version: this.version,
      registry: {
        questions: questions.map((question) => question.id),
        sections: sections.map((section) => section.id),
        questionnaires: questionnaires.map((questionnaire) => questionnaire.id),
        certifications: certifications.map((certification) => certification.id),
        assignments: seeded.assignments.map((assignment) => assignment.id),
        attempts: seeded.attempts.map((attempt) => attempt.id),
      },
      profiles: seeded.profiles,
      attemptStates: seeded.attemptStates,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private cleanupExistingDemo(previousRegistry?: DemoRegistry): void {
    const questions = this.repository
      .getQuestions()
      .filter(
        (question) =>
          !this.legacyIds.questions.includes(question.id as (typeof this.legacyIds.questions)[number]) &&
          !(previousRegistry?.questions.includes(question.id) ?? false) &&
          !question.id.startsWith('q_udemo_'),
      );

    const sections = this.repository
      .getSections()
      .filter(
        (section) =>
          !this.legacyIds.sections.includes(section.id as (typeof this.legacyIds.sections)[number]) &&
          !(previousRegistry?.sections.includes(section.id) ?? false) &&
          !section.id.startsWith('s_udemo_'),
      );

    const questionnaires = this.repository
      .getQuestionnaires()
      .filter(
        (questionnaire) =>
          !this.legacyIds.questionnaires.includes(
            questionnaire.id as (typeof this.legacyIds.questionnaires)[number],
          ) &&
          !(previousRegistry?.questionnaires.includes(questionnaire.id) ?? false) &&
          !questionnaire.id.startsWith('cq_udemo_'),
      );

    const certifications = this.repository
      .getCertifications()
      .filter(
        (certification) =>
          !this.legacyIds.certifications.includes(
            certification.id as (typeof this.legacyIds.certifications)[number],
          ) &&
          !(previousRegistry?.certifications.includes(certification.id) ?? false) &&
          !certification.id.startsWith('cert_udemo_'),
      );

    const assignments = this.repository
      .getAssignments()
      .filter(
        (assignment) =>
          !this.legacyIds.assignments.includes(
            assignment.id as (typeof this.legacyIds.assignments)[number],
          ) &&
          !(previousRegistry?.assignments.includes(assignment.id) ?? false) &&
          !assignment.id.startsWith('asg_udemo_'),
      );

    const attempts = this.repository
      .getAttempts()
      .filter(
        (attempt) =>
          !(previousRegistry?.attempts.includes(attempt.id) ?? false) &&
          !attempt.id.startsWith('att_udemo_') &&
          !this.legacyIds.assignments.includes(
            attempt.assignmentId as (typeof this.legacyIds.assignments)[number],
          ) &&
          !attempt.assignmentId.startsWith('asg_udemo_'),
      );

    localStorage.setItem(this.repository.storageKeys.questions, JSON.stringify(questions));
    localStorage.setItem(this.repository.storageKeys.sections, JSON.stringify(sections));
    localStorage.setItem(this.repository.storageKeys.questionnaires, JSON.stringify(questionnaires));
    localStorage.setItem(this.repository.storageKeys.certifications, JSON.stringify(certifications));
    localStorage.setItem(this.repository.storageKeys.assignments, JSON.stringify(assignments));
    localStorage.setItem(this.repository.storageKeys.attempts, JSON.stringify(attempts));
    localStorage.removeItem(this.storageKey);
  }

  private registryStillExists(registry: DemoRegistry): boolean {
    const questions = new Set(this.repository.getQuestions().map((question) => question.id));
    const sections = new Set(this.repository.getSections().map((section) => section.id));
    const questionnaires = new Set(
      this.repository.getQuestionnaires().map((questionnaire) => questionnaire.id),
    );
    const certifications = new Set(
      this.repository.getCertifications().map((certification) => certification.id),
    );
    const assignments = new Set(this.repository.getAssignments().map((assignment) => assignment.id));
    const attempts = new Set(this.repository.getAttempts().map((attempt) => attempt.id));

    return (
      registry.questions.every((id) => questions.has(id)) &&
      registry.sections.every((id) => sections.has(id)) &&
      registry.questionnaires.every((id) => questionnaires.has(id)) &&
      registry.certifications.every((id) => certifications.has(id)) &&
      registry.assignments.every((id) => assignments.has(id)) &&
      registry.attempts.every((id) => attempts.has(id))
    );
  }

  private buildQuestions(createdAt: string): Question[] {
    return [
      {
        id: 'q_udemo_1',
        titulo: 'Selecciona el EPP principal para ingreso a planta.',
        tipo: 'MULTIPLE',
        obligatoria: true,
        ayuda: 'Esta tarjeta se usa en modo demo con respuesta local.',
        createdAt,
        config: {
          opciones: [
            { id: 'q_udemo_1_op_1', texto: 'Casco de seguridad' },
            { id: 'q_udemo_1_op_2', texto: 'Lentes de proteccion' },
            { id: 'q_udemo_1_op_3', texto: 'Calzado de seguridad' },
          ],
          multiple: false,
        },
      },
      {
        id: 'q_udemo_2',
        titulo: 'Resume el protocolo de arranque seguro del turno.',
        tipo: 'TEXT',
        obligatoria: true,
        ayuda: 'Respuesta abierta corta.',
        createdAt,
        config: {
          minLength: 20,
          maxLength: 240,
          placeholder: 'Escribe el procedimiento en tus palabras',
        },
      },
      {
        id: 'q_udemo_3',
        titulo: 'Adjunta evidencia del checklist diario.',
        tipo: 'FILE',
        obligatoria: false,
        createdAt,
        config: {
          allowedExtensions: ['pdf', 'jpg', 'png'],
          maxSizeMB: 10,
        },
      },
      {
        id: 'q_udemo_4',
        titulo: 'Indica el medio principal de traslado al sitio.',
        tipo: 'MIXTA',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'q_udemo_4_op_1', texto: 'Transporte de empresa' },
            { id: 'q_udemo_4_op_2', texto: 'Auto propio' },
            { id: 'q_udemo_4_op_3', texto: 'Transporte publico' },
          ],
          multiple: false,
          otherOptionValue: '__other__',
          otherLabel: 'Otros',
          otherPlaceholder: 'Especifica tu respuesta',
        },
      },
      {
        id: 'q_udemo_5',
        titulo: 'Confirmas que recibiste induccion de seguridad este mes?',
        tipo: 'DICOTOMICA',
        obligatoria: true,
        createdAt,
        config: {
          trueLabel: 'Si',
          falseLabel: 'No',
        },
      },
      {
        id: 'q_udemo_6',
        titulo: 'Selecciona los riesgos detectados en tu area.',
        tipo: 'MULTIPLE_SELECT',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'q_udemo_6_op_1', texto: 'Riesgo electrico' },
            { id: 'q_udemo_6_op_2', texto: 'Superficie resbalosa' },
            { id: 'q_udemo_6_op_3', texto: 'Obstaculos en pasillo' },
          ],
        },
      },
      {
        id: 'q_udemo_7',
        titulo: 'Ordena las prioridades de inicio de operacion.',
        tipo: 'RANKING',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'q_udemo_7_op_1', texto: 'Inspeccion visual del equipo' },
            { id: 'q_udemo_7_op_2', texto: 'Revision de permisos' },
            { id: 'q_udemo_7_op_3', texto: 'Briefing de seguridad' },
          ],
        },
      },
      {
        id: 'q_udemo_8',
        titulo: 'La explicacion del procedimiento fue clara.',
        tipo: 'LIKERT',
        obligatoria: true,
        createdAt,
        config: {
          levels: [
            'Totalmente en desacuerdo',
            'En desacuerdo',
            'Neutral',
            'De acuerdo',
            'Totalmente de acuerdo',
          ],
        },
      },
      {
        id: 'q_udemo_9',
        titulo: 'Califica de 1 a 10 la limpieza del area.',
        tipo: 'NUMERIC_SCALE',
        obligatoria: true,
        createdAt,
        config: {
          min: 1,
          max: 10,
          step: 1,
        },
      },
      {
        id: 'q_udemo_10',
        titulo: 'Frecuencia de uso del checklist de seguridad.',
        tipo: 'NOMINAL_SCALE',
        obligatoria: true,
        createdAt,
        config: {
          labels: ['Siempre', 'Frecuente', 'Ocasional', 'Nunca'],
          orientation: 'horizontal',
        },
      },
      {
        id: 'q_udemo_11',
        titulo: 'Clasifica tu nivel de experiencia en el proceso.',
        tipo: 'FILTER',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'q_udemo_11_op_1', texto: 'Nuevo ingreso' },
            { id: 'q_udemo_11_op_2', texto: 'Intermedio' },
            { id: 'q_udemo_11_op_3', texto: 'Avanzado' },
          ],
          rules: [
            { answerValue: 'q_udemo_11_op_1', goToQuestionId: 'q_udemo_2' },
            { answerValue: 'q_udemo_11_op_2', goToQuestionId: 'q_udemo_8' },
            { answerValue: 'q_udemo_11_op_3', endQuiz: true },
          ],
        },
      },
    ];
  }

  private buildSections(): Section[] {
    return [
      {
        id: 's_udemo_contexto',
        nombre: 'Contexto operativo',
        descripcion: 'Validaciones iniciales antes de ingresar al proceso.',
        questionIds: ['q_udemo_1', 'q_udemo_2', 'q_udemo_3', 'q_udemo_4'],
      },
      {
        id: 's_udemo_cumplimiento',
        nombre: 'Cumplimiento y riesgos',
        descripcion: 'Controles criticos, riesgos y consistencia del turno.',
        questionIds: ['q_udemo_5', 'q_udemo_6', 'q_udemo_7', 'q_udemo_8'],
      },
      {
        id: 's_udemo_cierre',
        nombre: 'Cierre y seguimiento',
        descripcion: 'Indicadores finales y clasificacion de experiencia.',
        questionIds: ['q_udemo_9', 'q_udemo_10', 'q_udemo_11'],
      },
    ];
  }

  private buildQuestionnaires(referenceDate: Date): Questionnaire[] {
    return [
      {
        id: 'cq_udemo_not_started',
        nombre: 'Certificacion Base de Seguridad',
        descripcion: 'Diagnostico inicial para validar conocimientos de ingreso.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          timeLimitMinutes: 25,
          maxAttempts: 2,
          activeFrom: this.addDays(referenceDate, -3).toISOString(),
          activeTo: this.addDays(referenceDate, 12).toISOString(),
        },
      },
      {
        id: 'cq_udemo_in_progress',
        nombre: 'Revalidacion de Maniobras Seguras',
        descripcion: 'Seguimiento parcial del operador en campo.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          timeLimitMinutes: 18,
          maxAttempts: 1,
          activeFrom: this.addDays(referenceDate, -2).toISOString(),
          activeTo: this.addDays(referenceDate, 8).toISOString(),
        },
      },
      {
        id: 'cq_udemo_passed',
        nombre: 'Certificacion Operativa Montacargas',
        descripcion: 'Evaluacion con score para revalidacion operativa.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          timeLimitMinutes: 30,
          maxAttempts: 2,
          activeFrom: this.addDays(referenceDate, -10).toISOString(),
          activeTo: this.addDays(referenceDate, 14).toISOString(),
        },
      },
      {
        id: 'cq_udemo_failed',
        nombre: 'Auditoria Express SST',
        descripcion: 'Cuestionario scored para detectar brechas de cumplimiento.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          timeLimitMinutes: 20,
          maxAttempts: 1,
          activeFrom: this.addDays(referenceDate, -5).toISOString(),
          activeTo: this.addDays(referenceDate, 10).toISOString(),
        },
      },
      {
        id: 'cq_udemo_info',
        nombre: 'Induccion Informativa de Planta',
        descripcion: 'Recorrido informativo sin puntaje final.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          activeFrom: this.addDays(referenceDate, -1).toISOString(),
          activeTo: this.addDays(referenceDate, 30).toISOString(),
        },
      },
      {
        id: 'cq_udemo_expired',
        nombre: 'Permiso de Trabajo en Caliente',
        descripcion: 'Ejemplo expirado para validar la UI de bloqueo.',
        sectionIds: ['s_udemo_contexto', 's_udemo_cumplimiento', 's_udemo_cierre'],
        settings: {
          timeLimitMinutes: 15,
          maxAttempts: 1,
          activeFrom: this.addDays(referenceDate, -20).toISOString(),
          activeTo: this.addDays(referenceDate, -2).toISOString(),
        },
      },
    ];
  }

  private buildCertifications(): Certification[] {
    return [
      {
        id: 'cert_udemo_not_started',
        nombre: 'Seguridad Nivel 1',
        descripcion: 'Certificacion base para personal de nuevo ingreso.',
        questionnaireIds: ['cq_udemo_not_started'],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
      {
        id: 'cert_udemo_in_progress',
        nombre: 'Maniobras Seguras',
        descripcion: 'Revalidacion operativa semestral.',
        questionnaireIds: ['cq_udemo_in_progress'],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
      {
        id: 'cert_udemo_passed',
        nombre: 'Montacargas Senior',
        descripcion: 'Certificacion scored con liberacion operativa.',
        questionnaireIds: ['cq_udemo_passed'],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
      {
        id: 'cert_udemo_failed',
        nombre: 'Auditoria SST',
        descripcion: 'Validacion scored para seguimiento de brechas.',
        questionnaireIds: ['cq_udemo_failed'],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
      {
        id: 'cert_udemo_info',
        nombre: 'Induccion General',
        descripcion: 'Contenido informativo sin score.',
        questionnaireIds: ['cq_udemo_info'],
        rules: {
          requireAll: false,
        },
      },
      {
        id: 'cert_udemo_expired',
        nombre: 'Trabajo en Caliente',
        descripcion: 'Escenario expirado para pruebas visuales.',
        questionnaireIds: ['cq_udemo_expired'],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
    ];
  }

  private buildAssignmentsAndAttempts(
    referenceDate: Date,
    questions: Question[],
  ): {
    assignments: Assignment[];
    attempts: Attempt[];
    profiles: Record<string, DemoAssignmentProfile>;
    attemptStates: Record<string, Record<string, DemoQuestionState>>;
  } {
    const assignments: Assignment[] = [];
    const attempts: Attempt[] = [];
    const profiles: Record<string, DemoAssignmentProfile> = {};
    const attemptStates: Record<string, Record<string, DemoQuestionState>> = {};

    const configs: Array<{
      scenario: DemoScenario;
      questionnaireId: string;
      certificationId: string;
      certificationName: string;
      clientId: string;
      clientName: string;
      accent: DemoAssignmentProfile['accent'];
    }> = [
      {
        scenario: 'NOT_STARTED',
        questionnaireId: 'cq_udemo_not_started',
        certificationId: 'cert_udemo_not_started',
        certificationName: 'Seguridad Nivel 1',
        clientId: 'clt_north',
        clientName: 'Northwind Metals',
        accent: 'brand',
      },
      {
        scenario: 'IN_PROGRESS',
        questionnaireId: 'cq_udemo_in_progress',
        certificationId: 'cert_udemo_in_progress',
        certificationName: 'Maniobras Seguras',
        clientId: 'clt_orbit',
        clientName: 'Orbit Logistics',
        accent: 'sky',
      },
      {
        scenario: 'PASSED',
        questionnaireId: 'cq_udemo_passed',
        certificationId: 'cert_udemo_passed',
        certificationName: 'Montacargas Senior',
        clientId: 'clt_vertex',
        clientName: 'Vertex Supply',
        accent: 'emerald',
      },
      {
        scenario: 'FAILED',
        questionnaireId: 'cq_udemo_failed',
        certificationId: 'cert_udemo_failed',
        certificationName: 'Auditoria SST',
        clientId: 'clt_apex',
        clientName: 'Apex Contractors',
        accent: 'rose',
      },
      {
        scenario: 'INFO_SUBMITTED',
        questionnaireId: 'cq_udemo_info',
        certificationId: 'cert_udemo_info',
        certificationName: 'Induccion General',
        clientId: 'clt_faro',
        clientName: 'Faro Industrial',
        accent: 'amber',
      },
      {
        scenario: 'EXPIRED',
        questionnaireId: 'cq_udemo_expired',
        certificationId: 'cert_udemo_expired',
        certificationName: 'Trabajo en Caliente',
        clientId: 'clt_summit',
        clientName: 'Summit Energy',
        accent: 'slate',
      },
    ];

    const questionIds = questions.map((question) => question.id);
    const users = ['user1', 'user2'] as const;

    users.forEach((userId) => {
      configs.forEach((config) => {
        const assignmentId = `asg_udemo_${userId}_${config.scenario.toLowerCase()}`;
        const assignment: Assignment = {
          id: assignmentId,
          targetUserId: userId,
          questionnaireId: config.questionnaireId,
          status: 'ACTIVE',
          createdAt: this.addDays(referenceDate, -6).toISOString(),
        };

        assignments.push(assignment);
        profiles[assignmentId] = {
          assignmentId,
          clientId: config.clientId,
          clientName: config.clientName,
          certificationId: config.certificationId,
          certificationName: config.certificationName,
          accent: config.accent,
        };

        const attemptPreset = this.createAttemptPreset(
          assignmentId,
          userId,
          config.scenario,
          referenceDate,
          questionIds,
          questions,
        );

        if (!attemptPreset) {
          return;
        }

        attempts.push(attemptPreset.attempt);
        attemptStates[attemptPreset.attempt.id] = attemptPreset.state;
      });
    });

    return { assignments, attempts, profiles, attemptStates };
  }

  private createAttemptPreset(
    assignmentId: string,
    userId: string,
    scenario: DemoScenario,
    referenceDate: Date,
    questionIds: string[],
    questions: Question[],
  ): { attempt: Attempt; state: Record<string, DemoQuestionState> } | undefined {
    switch (scenario) {
      case 'NOT_STARTED':
      case 'EXPIRED':
        return undefined;
      case 'IN_PROGRESS': {
        const state = this.createStateMap(questionIds, questionIds.slice(0, 4), questionIds.slice(0, 3));
        return {
          attempt: {
            id: `att_udemo_${userId}_in_progress`,
            assignmentId,
            userId,
            startedAt: this.addHours(referenceDate, -2).toISOString(),
            status: 'IN_PROGRESS',
            answers: this.buildAnswers(questions, state),
          },
          state,
        };
      }
      case 'PASSED': {
        const answeredIds = [...questionIds];
        const correctIds = questionIds.filter((_, index) => index !== 2 && index !== 7);
        const state = this.createStateMap(questionIds, answeredIds, correctIds);
        return {
          attempt: {
            id: `att_udemo_${userId}_passed`,
            assignmentId,
            userId,
            startedAt: this.addDays(referenceDate, -1).toISOString(),
            submittedAt: this.addHours(referenceDate, -20).toISOString(),
            status: 'SUBMITTED',
            answers: this.buildAnswers(questions, state),
          },
          state,
        };
      }
      case 'FAILED': {
        const answeredIds = [...questionIds];
        const correctIds = questionIds.filter((_, index) => index < 4);
        const state = this.createStateMap(questionIds, answeredIds, correctIds);
        return {
          attempt: {
            id: `att_udemo_${userId}_failed`,
            assignmentId,
            userId,
            startedAt: this.addDays(referenceDate, -2).toISOString(),
            submittedAt: this.addDays(referenceDate, -2, 2).toISOString(),
            status: 'SUBMITTED',
            answers: this.buildAnswers(questions, state),
          },
          state,
        };
      }
      case 'INFO_SUBMITTED': {
        const answeredIds = questionIds.slice(0, 8);
        const correctIds = questionIds.slice(0, 5);
        const state = this.createStateMap(questionIds, answeredIds, correctIds);
        return {
          attempt: {
            id: `att_udemo_${userId}_info`,
            assignmentId,
            userId,
            startedAt: this.addHours(referenceDate, -30).toISOString(),
            submittedAt: this.addHours(referenceDate, -26).toISOString(),
            status: 'SUBMITTED',
            answers: this.buildAnswers(questions, state),
          },
          state,
        };
      }
      default:
        return undefined;
    }
  }

  private buildSectionMetrics(questionnaire: Questionnaire, attempt?: Attempt): DemoSectionMetrics[] {
    const questionsById = new Map(
      this.repository.getQuestions().map((question) => [question.id, question]),
    );

    return this.getSectionsForQuestionnaire(questionnaire.id).map((section) => {
      const questions = section.questionIds
        .map((questionId) => questionsById.get(questionId))
        .filter((question): question is Question => !!question);

      const state = attempt ? this.getAttemptState(attempt.id, questions) : {};
      const answeredCount = questions.filter((question) => state[question.id]?.answered).length;
      const correctCount = questions.filter(
        (question) => state[question.id]?.answered && state[question.id]?.correct,
      ).length;
      const totalQuestions = questions.length;

      return {
        section,
        questions,
        answeredCount,
        correctCount,
        totalQuestions,
        completionPercent:
          totalQuestions > 0 ? this.toPercent((answeredCount / totalQuestions) * 100) : 0,
        scorePercent:
          this.isQuestionnaireScored(questionnaire.id) && totalQuestions > 0
            ? this.toPercent((correctCount / totalQuestions) * 100)
            : null,
      };
    });
  }

  private isQuestionnaireScored(questionnaireId: string): boolean {
    return typeof this.getPassScore(questionnaireId) === 'number';
  }

  private getPassScore(questionnaireId: string): number | null {
    const questionnaire = this.repository
      .getQuestionnaires()
      .find((entry) => entry.id === questionnaireId);
    if (typeof questionnaire?.settings.passScore === 'number') {
      return questionnaire.settings.passScore;
    }

    const certification = this.getCertificationByQuestionnaire(questionnaireId);
    return typeof certification?.rules.minScore === 'number' ? certification.rules.minScore : null;
  }

  private deriveAttemptStateFromAnswers(
    attemptId: string,
    questions: Question[],
  ): Record<string, DemoQuestionState> {
    const attempt = this.repository.getAttemptById(attemptId);
    if (!attempt) {
      return {};
    }

    const answersByQuestionId = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer]),
    );

    return questions.reduce<Record<string, DemoQuestionState>>((acc, question) => {
      const answer = answersByQuestionId.get(question.id);
      const answered = this.hasAnswerValue(answer, question);
      acc[question.id] = {
        answered,
        correct: answered,
      };
      return acc;
    }, {});
  }

  private persistAttemptState(
    attemptId: string,
    questions: Question[],
    state: Record<string, DemoQuestionState>,
  ): void {
    const store = this.readStore();
    if (!store) {
      return;
    }

    const normalized = this.normalizeAttemptState(state, questions);
    const nextStore: DemoStore = {
      ...store,
      attemptStates: {
        ...store.attemptStates,
        [attemptId]: normalized,
      },
    };

    localStorage.setItem(this.storageKey, JSON.stringify(nextStore));
  }

  private normalizeAttemptState(
    state: Record<string, DemoQuestionState>,
    questions: Question[],
  ): Record<string, DemoQuestionState> {
    return questions.reduce<Record<string, DemoQuestionState>>((acc, question) => {
      const current = state[question.id];
      const answered = !!current?.answered;
      acc[question.id] = {
        answered,
        correct: answered ? !!current?.correct : false,
      };
      return acc;
    }, {});
  }

  private buildAnswers(
    questions: Question[],
    state: Record<string, DemoQuestionState>,
  ): Answer[] {
    return questions.map((question) => {
      const answered = !!state[question.id]?.answered;

      return {
        questionId: question.id,
        type: question.tipo,
        value: this.buildAnswerValue(question, answered),
      };
    });
  }

  private buildAnswerValue(question: Question, answered: boolean): Answer['value'] {
    if (!answered) {
      if (question.tipo === 'MULTIPLE' || question.tipo === 'MULTIPLE_SELECT' || question.tipo === 'RANKING') {
        return [];
      }

      if (question.tipo === 'TEXT' || question.tipo === 'LIKERT' || question.tipo === 'NOMINAL_SCALE') {
        return '';
      }

      return null;
    }

    switch (question.tipo) {
      case 'MULTIPLE': {
        const firstOption = 'opciones' in question.config ? question.config.opciones[0]?.id ?? '' : '';
        return firstOption ? [firstOption] : [];
      }
      case 'MULTIPLE_SELECT': {
        const options = 'opciones' in question.config ? question.config.opciones.slice(0, 2) : [];
        return options.map((option) => option.id);
      }
      case 'RANKING': {
        const options = 'opciones' in question.config ? question.config.opciones : [];
        return options.map((option) => option.id);
      }
      case 'TEXT':
        return 'Respuesta demo almacenada localmente para la vista premium.';
      case 'FILE': {
        const fileValue: FileAnswerValue = {
          fileName: 'evidencia-demo.pdf',
          fileSize: 245000,
          fileType: 'application/pdf',
        };
        return fileValue;
      }
      case 'MIXTA': {
        const value: MixtaAnswerValue = {
          selectedOptionIds:
            'opciones' in question.config && question.config.opciones[0]
              ? [question.config.opciones[0].id]
              : [],
        };
        return value;
      }
      case 'DICOTOMICA':
        return true;
      case 'NUMERIC_SCALE':
        return 'min' in question.config ? question.config.min : 1;
      case 'LIKERT':
        return 'levels' in question.config ? question.config.levels?.[4] ?? 'De acuerdo' : 'De acuerdo';
      case 'NOMINAL_SCALE':
        return 'labels' in question.config ? question.config.labels[0] ?? 'Siempre' : 'Siempre';
      case 'FILTER': {
        const config = question.config as FilterQuestionConfig;
        const selectedValue = config.opciones[0]?.id ?? '';
        const matchedRule = config.rules.find((rule) => rule.answerValue === selectedValue);
        const value: FilterAnswerValue = {
          selectedValue,
          matchedRule: matchedRule
            ? {
                goToQuestionId: matchedRule.goToQuestionId,
                endQuiz: matchedRule.endQuiz,
              }
            : undefined,
        };
        return value;
      }
      default:
        return null;
    }
  }

  private hasAnswerValue(answer: Answer | undefined, question: Question): boolean {
    if (!answer) {
      return false;
    }

    const value = answer.value;

    if (question.tipo === 'MULTIPLE' || question.tipo === 'MULTIPLE_SELECT' || question.tipo === 'RANKING') {
      return Array.isArray(value) && value.length > 0;
    }

    if (question.tipo === 'TEXT' || question.tipo === 'LIKERT' || question.tipo === 'NOMINAL_SCALE') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (question.tipo === 'MIXTA') {
      return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'selectedOptionIds' in value &&
        Array.isArray(value.selectedOptionIds) &&
        value.selectedOptionIds.length > 0
      );
    }

    if (question.tipo === 'DICOTOMICA') {
      return typeof value === 'boolean';
    }

    if (question.tipo === 'NUMERIC_SCALE') {
      return typeof value === 'number';
    }

    if (question.tipo === 'FILTER') {
      return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'selectedValue' in value &&
        typeof value.selectedValue === 'string' &&
        value.selectedValue.trim().length > 0
      );
    }

    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private createStateMap(
    questionIds: string[],
    answeredIds: string[],
    correctIds: string[],
  ): Record<string, DemoQuestionState> {
    const answeredSet = new Set(answeredIds);
    const correctSet = new Set(correctIds);

    return questionIds.reduce<Record<string, DemoQuestionState>>((acc, questionId) => {
      const answered = answeredSet.has(questionId);
      acc[questionId] = {
        answered,
        correct: answered && correctSet.has(questionId),
      };
      return acc;
    }, {});
  }

  private readStore(): DemoStore | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as DemoStore;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private addDays(referenceDate: Date, days: number, hours = 0): Date {
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + days);
    next.setHours(next.getHours() + hours);
    return next;
  }

  private addHours(referenceDate: Date, hours: number): Date {
    const next = new Date(referenceDate);
    next.setHours(next.getHours() + hours);
    return next;
  }

  private toPercent(value: number): number {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(Math.max(0, Math.min(100, safe)) * 100) / 100;
  }
}

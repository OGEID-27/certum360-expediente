import { Injectable, inject } from '@angular/core';
import {
  Answer,
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
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from './assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from './local-storage-evaluaciones.repository';
import { ClientsStoreService } from '../../../pages/alta-clientes/clients-store.service';

interface DemoUserIdentity {
  userId: string;
  displayName: string;
  email: string;
}

interface DemoQuestionState {
  answered: boolean;
  correct: boolean;
}

interface DemoSeedMeta {
  seeded: boolean;
  seededAt: string;
}

interface DemoAssignmentProfile {
  assignmentId: string;
  clientId: string;
  clientName: string;
  certificationId: string;
  certificationName: string;
  accent: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

interface DemoStore {
  version: string;
  registry: {
    questions: string[];
    sections: string[];
    questionnaires: string[];
    certifications: string[];
    assignments: string[];
    attempts: string[];
  };
  profiles: Record<string, DemoAssignmentProfile>;
  attemptStates: Record<string, Record<string, DemoQuestionState>>;
}

interface DemoScenarioSpec {
  key: string;
  assignmentId: string;
  attemptId?: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireArea: string;
  certificationId: string;
  certificationName: string;
  clientId: string;
  clientName: string;
  accent: DemoAssignmentProfile['accent'];
  createdAt: string;
  questionnaire: Questionnaire;
  assignmentUser: EvaluationAssignmentUser;
  attempt?: Attempt;
  attemptState?: Record<string, DemoQuestionState>;
}

@Injectable({ providedIn: 'root' })
export class UserEvaluationsDemoSeedService {
  readonly defaultUser: DemoUserIdentity = {
    userId: 'adrian',
    displayName: 'Adrian',
    email: 'adrian@moontest.mx',
  };

  private readonly version = '2026-03-user-login-seed-v1';
  private readonly demoStoreKey = 'evaluaciones.user.demo';

  private readonly repository = inject(LocalStorageEvaluacionesRepository);
  private readonly assignmentsStorage = inject(AssignmentsStorageService);
  private readonly clientsStore = inject(ClientsStoreService);

  seedUserEvaluationsDemoIfNeeded(identity: DemoUserIdentity = this.defaultUser): void {
    if (this.hasValidSeed(identity)) {
      return;
    }

    this.seedUserEvaluationsDemo(identity);
  }

  resetUserEvaluationsDemo(identity: DemoUserIdentity = this.defaultUser): void {
    this.removeUserDemoData(identity);
    this.seedUserEvaluationsDemo(identity);
  }

  private seedUserEvaluationsDemo(identity: DemoUserIdentity): void {
    const now = new Date();
    const questionCreatedAt = now.toISOString();
    const questions = this.buildQuestions(questionCreatedAt);
    const sections = this.buildSections();
    const scenarios = this.buildScenarios(identity, now, questions);
    const certifications = this.buildCertifications(scenarios);

    questions.forEach((question) => this.repository.saveQuestion(question));
    sections.forEach((section) => this.repository.saveSection(section));
    scenarios.forEach((scenario) => this.repository.saveQuestionnaire(scenario.questionnaire));
    certifications.forEach((certification) => this.repository.saveCertification(certification));

    this.upsertEvaluationAssignments(
      scenarios.map((scenario) => ({
        id: scenario.assignmentId,
        clientId: scenario.clientId,
        clientName: scenario.clientName,
        certificationId: scenario.certificationId,
        certificationName: scenario.certificationName,
        users: [scenario.assignmentUser],
        currency: 'MXN',
        price: 0,
        paymentStatus: 'PAID',
        createdAt: scenario.createdAt,
        paidAt: scenario.createdAt,
      })),
    );

    scenarios
      .map((scenario) => scenario.attempt)
      .filter((attempt): attempt is Attempt => !!attempt)
      .forEach((attempt) => this.repository.saveAttempt(attempt));

    const store: DemoStore = {
      version: this.version,
      registry: {
        questions: questions.map((question) => question.id),
        sections: sections.map((section) => section.id),
        questionnaires: scenarios.map((scenario) => scenario.questionnaireId),
        certifications: certifications.map((certification) => certification.id),
        assignments: scenarios.map((scenario) => scenario.assignmentId),
        attempts: scenarios
          .map((scenario) => scenario.attemptId)
          .filter((attemptId): attemptId is string => !!attemptId),
      },
      profiles: scenarios.reduce<Record<string, DemoAssignmentProfile>>((acc, scenario) => {
        acc[scenario.assignmentId] = {
          assignmentId: scenario.assignmentId,
          clientId: scenario.clientId,
          clientName: scenario.clientName,
          certificationId: scenario.certificationId,
          certificationName: scenario.certificationName,
          accent: scenario.accent,
        };
        return acc;
      }, {}),
      attemptStates: scenarios.reduce<Record<string, Record<string, DemoQuestionState>>>(
        (acc, scenario) => {
          if (scenario.attemptId && scenario.attemptState) {
            acc[scenario.attemptId] = scenario.attemptState;
          }
          return acc;
        },
        {},
      ),
    };

    localStorage.setItem(this.demoStoreKey, JSON.stringify(store));
    localStorage.setItem(
      this.getMetaKey(identity.userId),
      JSON.stringify({
        seeded: true,
        seededAt: now.toISOString(),
      } satisfies DemoSeedMeta),
    );
  }

  private hasValidSeed(identity: DemoUserIdentity): boolean {
    const meta = this.readMeta(identity.userId);
    if (!meta?.seeded) {
      return false;
    }

    const questions = this.buildQuestions(new Date().toISOString());
    const sections = this.buildSections();
    const scenarios = this.buildScenarios(identity, new Date(), questions);
    const demoStore = this.readDemoStore();
    if (!demoStore || demoStore.version !== this.version) {
      return false;
    }

    const assignmentIds = new Set(this.readEvaluationAssignments().map((assignment) => assignment.id));
    const attemptIds = new Set(this.repository.getAttempts().map((attempt) => attempt.id));
    const questionIds = new Set(this.repository.getQuestions().map((question) => question.id));
    const sectionIds = new Set(this.repository.getSections().map((section) => section.id));
    const questionnaireIds = new Set(
      this.repository.getQuestionnaires().map((questionnaire) => questionnaire.id),
    );
    const certificationIds = new Set(
      this.repository.getCertifications().map((certification) => certification.id),
    );

    return (
      questions.every((question) => questionIds.has(question.id)) &&
      sections.every((section) => sectionIds.has(section.id)) &&
      scenarios.every((scenario) => questionnaireIds.has(scenario.questionnaireId)) &&
      scenarios.every((scenario) => certificationIds.has(scenario.certificationId)) &&
      scenarios.every((scenario) => assignmentIds.has(scenario.assignmentId)) &&
      scenarios
        .filter((scenario) => !!scenario.attemptId)
        .every((scenario) => attemptIds.has(scenario.attemptId as string))
    );
  }

  private removeUserDemoData(identity: DemoUserIdentity): void {
    const questions = this.buildQuestions(new Date().toISOString());
    const sections = this.buildSections();
    const scenarios = this.buildScenarios(identity, new Date(), questions);

    const assignmentIds = new Set(scenarios.map((scenario) => scenario.assignmentId));
    const attemptIds = new Set(
      scenarios
        .map((scenario) => scenario.attemptId)
        .filter((attemptId): attemptId is string => !!attemptId),
    );
    const questionnaireIds = new Set(scenarios.map((scenario) => scenario.questionnaireId));
    const certificationIds = new Set(scenarios.map((scenario) => scenario.certificationId));
    const questionIds = new Set(questions.map((question) => question.id));
    const sectionIds = new Set(sections.map((section) => section.id));

    localStorage.setItem(
      this.assignmentsStorage.storageKey,
      JSON.stringify(
        this.readEvaluationAssignments().filter((assignment) => !assignmentIds.has(assignment.id)),
      ),
    );
    localStorage.setItem(
      this.repository.storageKeys.attempts,
      JSON.stringify(
        this.repository
          .getAttempts()
          .filter(
            (attempt) =>
              !attemptIds.has(attempt.id) && !assignmentIds.has(attempt.assignmentId),
          ),
      ),
    );
    localStorage.setItem(
      this.repository.storageKeys.questionnaires,
      JSON.stringify(
        this.repository
          .getQuestionnaires()
          .filter((questionnaire) => !questionnaireIds.has(questionnaire.id)),
      ),
    );
    localStorage.setItem(
      this.repository.storageKeys.certifications,
      JSON.stringify(
        this.repository
          .getCertifications()
          .filter((certification) => !certificationIds.has(certification.id)),
      ),
    );
    localStorage.setItem(
      this.repository.storageKeys.sections,
      JSON.stringify(
        this.repository.getSections().filter((section) => !sectionIds.has(section.id)),
      ),
    );
    localStorage.setItem(
      this.repository.storageKeys.questions,
      JSON.stringify(
        this.repository.getQuestions().filter((question) => !questionIds.has(question.id)),
      ),
    );

    localStorage.removeItem(this.demoStoreKey);
    localStorage.removeItem(this.getMetaKey(identity.userId));
  }

  private buildScenarios(
    identity: DemoUserIdentity,
    referenceDate: Date,
    questions: Question[],
  ): DemoScenarioSpec[] {
    const questionIds = questions.map((question) => question.id);
    const allSectionIds = ['demo_section_context', 'demo_section_compliance', 'demo_section_close'];
    const passedSectionIds = ['demo_section_passed_a', 'demo_section_passed_b'];
    const failedSectionIds = ['demo_section_failed_a', 'demo_section_failed_b'];
    const infoSectionIds = ['demo_section_info_a', 'demo_section_info_b'];
    const userId = `demo_user_${identity.userId}`;
    const clients = this.buildClientNames();

    const buildUser = (
      questionnaireId: string,
      questionnaireName: string,
      questionnaireArea: string,
    ): EvaluationAssignmentUser => ({
      userId,
      userName: identity.displayName,
      userArea: questionnaireArea,
      questionnaireId,
      questionnaireName,
      questionnaireArea,
    });

    const createState = (
      answeredIds: string[],
      correctIds: string[],
    ): Record<string, DemoQuestionState> =>
      questionIds.reduce<Record<string, DemoQuestionState>>((acc, questionId) => {
        const answered = answeredIds.includes(questionId);
        acc[questionId] = {
          answered,
          correct: answered && correctIds.includes(questionId),
        };
        return acc;
      }, {});

    const createAttempt = (
      attemptId: string,
      assignmentId: string,
      startedAt: string,
      state: Record<string, DemoQuestionState>,
      status: Attempt['status'],
      submittedAt?: string,
    ): Attempt => ({
      id: attemptId,
      assignmentId,
      userId,
      startedAt,
      submittedAt,
      status,
      answers: this.buildAnswers(questions, state),
    });

    const createQuestionnaire = (
      id: string,
      nombre: string,
      area: string,
      sectionIds: string[],
      settings: Questionnaire['settings'],
    ): Questionnaire => ({
      id,
      nombre,
      descripcion: `Cuestionario demo para el area de ${area}.`,
      area,
      sectionIds,
      settings,
    });

    const partialAnswered = questionIds.slice(0, 3);
    const urgentAnswered = questionIds.slice(0, 7);
    const passedAnswered = questionIds.slice(0, 7);
    const passedCorrect = questionIds.slice(0, 6);
    const failedAnswered = questionIds.slice(0, 8);
    const failedCorrect = questionIds.slice(0, 5);
    const infoAnswered = questionIds.slice(0, 6);

    return [
      {
        key: 'not_started',
        assignmentId: 'demo_assignment_adrian_not_started',
        questionnaireId: 'demo_questionnaire_sistemas_pending',
        questionnaireName: 'Sistemas',
        questionnaireArea: 'Sistemas',
        certificationId: 'demo_cert_seguridad_nivel_1',
        certificationName: 'Seguridad Nivel 1',
        clientId: '1',
        clientName: clients['1'],
        accent: 'brand',
        createdAt: this.addHours(referenceDate, -1).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_sistemas_pending',
          'Sistemas',
          'Sistemas',
          allSectionIds,
          {
            activeFrom: this.addDays(referenceDate, -1).toISOString(),
            activeTo: this.addDays(referenceDate, 7).toISOString(),
            maxAttempts: 2,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_sistemas_pending',
          'Sistemas',
          'Sistemas',
        ),
      },
      {
        key: 'in_progress_partial',
        assignmentId: 'demo_assignment_adrian_in_progress',
        attemptId: 'demo_attempt_adrian_in_progress',
        questionnaireId: 'demo_questionnaire_contaduria_progress',
        questionnaireName: 'Contaduria',
        questionnaireArea: 'Contaduria',
        certificationId: 'demo_cert_controles_admin',
        certificationName: 'Controles Administrativos',
        clientId: '1',
        clientName: clients['1'],
        accent: 'sky',
        createdAt: this.addHours(referenceDate, -2).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_contaduria_progress',
          'Contaduria',
          'Contaduria',
          allSectionIds,
          {
            activeFrom: this.addDays(referenceDate, -2).toISOString(),
            activeTo: this.addDays(referenceDate, 5).toISOString(),
            maxAttempts: 1,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_contaduria_progress',
          'Contaduria',
          'Contaduria',
        ),
        attemptState: createState(partialAnswered, partialAnswered),
        attempt: createAttempt(
          'demo_attempt_adrian_in_progress',
          'demo_assignment_adrian_in_progress',
          this.addMinutes(referenceDate, -35).toISOString(),
          createState(partialAnswered, partialAnswered),
          'IN_PROGRESS',
        ),
      },
      {
        key: 'in_progress_deadline',
        assignmentId: 'demo_assignment_adrian_near_deadline',
        attemptId: 'demo_attempt_adrian_near_deadline',
        questionnaireId: 'demo_questionnaire_operaciones_deadline',
        questionnaireName: 'Operaciones',
        questionnaireArea: 'Operaciones',
        certificationId: 'demo_cert_operacion_segura',
        certificationName: 'Operacion Segura',
        clientId: '4',
        clientName: clients['4'],
        accent: 'amber',
        createdAt: this.addHours(referenceDate, -3).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_operaciones_deadline',
          'Operaciones',
          'Operaciones',
          allSectionIds,
          {
            timeLimitMinutes: 30,
            activeFrom: this.addDays(referenceDate, -1).toISOString(),
            activeTo: this.addDays(referenceDate, 1).toISOString(),
            maxAttempts: 1,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_operaciones_deadline',
          'Operaciones',
          'Operaciones',
        ),
        attemptState: createState(urgentAnswered, questionIds.slice(0, 6)),
        attempt: createAttempt(
          'demo_attempt_adrian_near_deadline',
          'demo_assignment_adrian_near_deadline',
          this.addMinutes(referenceDate, -25).toISOString(),
          createState(urgentAnswered, questionIds.slice(0, 6)),
          'IN_PROGRESS',
        ),
      },
      {
        key: 'expired',
        assignmentId: 'demo_assignment_adrian_expired',
        questionnaireId: 'demo_questionnaire_rh_expired',
        questionnaireName: 'RH',
        questionnaireArea: 'RH',
        certificationId: 'demo_cert_vigencia_rh',
        certificationName: 'Vigencia RH',
        clientId: '3',
        clientName: clients['3'],
        accent: 'rose',
        createdAt: this.addHours(referenceDate, -4).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_rh_expired',
          'RH',
          'RH',
          allSectionIds,
          {
            timeLimitMinutes: 10,
            activeFrom: this.addDays(referenceDate, -5).toISOString(),
            activeTo: this.addDays(referenceDate, -1).toISOString(),
            maxAttempts: 1,
          },
        ),
        assignmentUser: buildUser('demo_questionnaire_rh_expired', 'RH', 'RH'),
      },
      {
        key: 'submitted_passed',
        assignmentId: 'demo_assignment_adrian_passed',
        attemptId: 'demo_attempt_adrian_passed',
        questionnaireId: 'demo_questionnaire_operaciones_passed',
        questionnaireName: 'Operaciones Senior',
        questionnaireArea: 'Operaciones',
        certificationId: 'demo_cert_operaciones_senior',
        certificationName: 'Seguridad Nivel 2',
        clientId: '4',
        clientName: clients['4'],
        accent: 'emerald',
        createdAt: this.addHours(referenceDate, -5).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_operaciones_passed',
          'Operaciones Senior',
          'Operaciones',
          passedSectionIds,
          {
            timeLimitMinutes: 30,
            activeFrom: this.addDays(referenceDate, -3).toISOString(),
            activeTo: this.addDays(referenceDate, 10).toISOString(),
            maxAttempts: 2,
            passScore: 80,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_operaciones_passed',
          'Operaciones Senior',
          'Operaciones',
        ),
        attemptState: createState(passedAnswered, passedCorrect),
        attempt: createAttempt(
          'demo_attempt_adrian_passed',
          'demo_assignment_adrian_passed',
          this.addHours(referenceDate, -30).toISOString(),
          createState(passedAnswered, passedCorrect),
          'SUBMITTED',
          this.addHours(referenceDate, -27).toISOString(),
        ),
      },
      {
        key: 'submitted_failed',
        assignmentId: 'demo_assignment_adrian_failed',
        attemptId: 'demo_attempt_adrian_failed',
        questionnaireId: 'demo_questionnaire_contaduria_failed',
        questionnaireName: 'Contaduria Normativa',
        questionnaireArea: 'Contaduria',
        certificationId: 'demo_cert_contaduria_norma',
        certificationName: 'Cumplimiento Administrativo',
        clientId: '1',
        clientName: clients['1'],
        accent: 'rose',
        createdAt: this.addHours(referenceDate, -6).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_contaduria_failed',
          'Contaduria Normativa',
          'Contaduria',
          failedSectionIds,
          {
            timeLimitMinutes: 20,
            activeFrom: this.addDays(referenceDate, -4).toISOString(),
            activeTo: this.addDays(referenceDate, 9).toISOString(),
            maxAttempts: 1,
            passScore: 80,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_contaduria_failed',
          'Contaduria Normativa',
          'Contaduria',
        ),
        attemptState: createState(failedAnswered, failedCorrect),
        attempt: createAttempt(
          'demo_attempt_adrian_failed',
          'demo_assignment_adrian_failed',
          this.addDays(referenceDate, -2).toISOString(),
          createState(failedAnswered, failedCorrect),
          'SUBMITTED',
          this.addDays(referenceDate, -2, 2).toISOString(),
        ),
      },
      {
        key: 'submitted_info',
        assignmentId: 'demo_assignment_adrian_info',
        attemptId: 'demo_attempt_adrian_info',
        questionnaireId: 'demo_questionnaire_rh_info',
        questionnaireName: 'RH Informativa',
        questionnaireArea: 'RH',
        certificationId: 'demo_cert_induccion_general',
        certificationName: 'Induccion General',
        clientId: '3',
        clientName: clients['3'],
        accent: 'slate',
        createdAt: this.addHours(referenceDate, -7).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_rh_info',
          'RH Informativa',
          'RH',
          infoSectionIds,
          {
            activeFrom: this.addDays(referenceDate, -2).toISOString(),
            activeTo: this.addDays(referenceDate, 14).toISOString(),
            maxAttempts: 1,
          },
        ),
        assignmentUser: buildUser('demo_questionnaire_rh_info', 'RH Informativa', 'RH'),
        attemptState: createState(infoAnswered, questionIds.slice(0, 4)),
        attempt: createAttempt(
          'demo_attempt_adrian_info',
          'demo_assignment_adrian_info',
          this.addHours(referenceDate, -18).toISOString(),
          createState(infoAnswered, questionIds.slice(0, 4)),
          'SUBMITTED',
          this.addHours(referenceDate, -16).toISOString(),
        ),
      },
      {
        key: 'pending_future_expiry',
        assignmentId: 'demo_assignment_adrian_future_expiry',
        questionnaireId: 'demo_questionnaire_sistemas_future',
        questionnaireName: 'Sistemas Backup',
        questionnaireArea: 'Sistemas',
        certificationId: 'demo_cert_seguridad_nivel_1_futuro',
        certificationName: 'Seguridad Nivel 1',
        clientId: '2',
        clientName: clients['2'],
        accent: 'brand',
        createdAt: this.addHours(referenceDate, -8).toISOString(),
        questionnaire: createQuestionnaire(
          'demo_questionnaire_sistemas_future',
          'Sistemas Backup',
          'Sistemas',
          allSectionIds,
          {
            activeFrom: this.addDays(referenceDate, -1).toISOString(),
            activeTo: this.addDays(referenceDate, 2).toISOString(),
            maxAttempts: 2,
          },
        ),
        assignmentUser: buildUser(
          'demo_questionnaire_sistemas_future',
          'Sistemas Backup',
          'Sistemas',
        ),
      },
    ];
  }

  private buildQuestions(createdAt: string): Question[] {
    return [
      {
        id: 'demo_question_1',
        titulo: 'Selecciona el control principal de acceso a la plataforma.',
        tipo: 'MULTIPLE',
        obligatoria: true,
        ayuda: 'Pregunta demo para poblar la UI.',
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_1_op_1', texto: 'Doble factor' },
            { id: 'demo_question_1_op_2', texto: 'Solo usuario' },
            { id: 'demo_question_1_op_3', texto: 'Acceso compartido' },
          ],
          multiple: false,
        },
      },
      {
        id: 'demo_question_2',
        titulo: 'Describe el procedimiento de respaldo diario.',
        tipo: 'TEXT',
        obligatoria: true,
        createdAt,
        config: {
          minLength: 20,
          maxLength: 220,
          placeholder: 'Escribe el procedimiento',
        },
      },
      {
        id: 'demo_question_3',
        titulo: 'Adjunta una evidencia del ultimo checklist.',
        tipo: 'FILE',
        obligatoria: false,
        createdAt,
        config: {
          allowedExtensions: ['pdf', 'jpg', 'png'],
          maxSizeMB: 8,
        },
      },
      {
        id: 'demo_question_4',
        titulo: 'Indica el area de soporte principal.',
        tipo: 'MIXTA',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_4_op_1', texto: 'Mesa de ayuda' },
            { id: 'demo_question_4_op_2', texto: 'Infraestructura' },
            { id: 'demo_question_4_op_3', texto: 'Aplicaciones' },
          ],
          multiple: false,
          otherOptionValue: '__other__',
          otherLabel: 'Otro',
          otherPlaceholder: 'Especifica el area',
        },
      },
      {
        id: 'demo_question_5',
        titulo: 'Confirmas que conoces la politica vigente?',
        tipo: 'DICOTOMICA',
        obligatoria: true,
        createdAt,
        config: {
          trueLabel: 'Si',
          falseLabel: 'No',
        },
      },
      {
        id: 'demo_question_6',
        titulo: 'Selecciona los riesgos detectados.',
        tipo: 'MULTIPLE_SELECT',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_6_op_1', texto: 'Error de captura' },
            { id: 'demo_question_6_op_2', texto: 'Acceso no autorizado' },
            { id: 'demo_question_6_op_3', texto: 'Retraso operativo' },
          ],
        },
      },
      {
        id: 'demo_question_7',
        titulo: 'Ordena las prioridades de inicio de jornada.',
        tipo: 'RANKING',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_7_op_1', texto: 'Revisar pendientes' },
            { id: 'demo_question_7_op_2', texto: 'Validar accesos' },
            { id: 'demo_question_7_op_3', texto: 'Confirmar responsables' },
          ],
        },
      },
      {
        id: 'demo_question_8',
        titulo: 'La documentacion fue clara.',
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
        id: 'demo_question_9',
        titulo: 'Califica la trazabilidad del proceso.',
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
        id: 'demo_question_10',
        titulo: 'Frecuencia de revision de evidencias.',
        tipo: 'NOMINAL_SCALE',
        obligatoria: true,
        createdAt,
        config: {
          labels: ['Diaria', 'Semanal', 'Mensual', 'Nunca'],
          orientation: 'horizontal',
        },
      },
      {
        id: 'demo_question_11',
        titulo: 'Clasifica tu nivel de experiencia.',
        tipo: 'FILTER',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_11_op_1', texto: 'Nuevo ingreso' },
            { id: 'demo_question_11_op_2', texto: 'Intermedio' },
            { id: 'demo_question_11_op_3', texto: 'Avanzado' },
          ],
          rules: [
            { answerValue: 'demo_question_11_op_1', goToQuestionId: 'demo_question_2' },
            { answerValue: 'demo_question_11_op_2', goToQuestionId: 'demo_question_8' },
            { answerValue: 'demo_question_11_op_3', endQuiz: true },
          ],
        },
      },
      {
        id: 'demo_question_12',
        titulo: 'Selecciona el indicador que monitoreas con mayor frecuencia.',
        tipo: 'MULTIPLE',
        obligatoria: true,
        createdAt,
        config: {
          opciones: [
            { id: 'demo_question_12_op_1', texto: 'Tiempo de respuesta' },
            { id: 'demo_question_12_op_2', texto: 'Incidencias abiertas' },
            { id: 'demo_question_12_op_3', texto: 'Cumplimiento diario' },
          ],
          multiple: false,
        },
      },
    ];
  }

  private buildSections(): Section[] {
    return [
      {
        id: 'demo_section_context',
        nombre: 'Contexto operativo',
        descripcion: 'Bloque demo con preguntas base.',
        questionIds: ['demo_question_1', 'demo_question_2', 'demo_question_3', 'demo_question_4'],
      },
      {
        id: 'demo_section_compliance',
        nombre: 'Cumplimiento',
        descripcion: 'Bloque demo de control y riesgos.',
        questionIds: ['demo_question_5', 'demo_question_6', 'demo_question_7', 'demo_question_8'],
      },
      {
        id: 'demo_section_close',
        nombre: 'Cierre',
        descripcion: 'Bloque demo de cierre y seguimiento.',
        questionIds: ['demo_question_9', 'demo_question_10', 'demo_question_11', 'demo_question_12'],
      },
      {
        id: 'demo_section_passed_a',
        nombre: 'Escenario aprobado A',
        descripcion: 'Subset demo para resultado aprobado.',
        questionIds: ['demo_question_1', 'demo_question_2', 'demo_question_3', 'demo_question_4'],
      },
      {
        id: 'demo_section_passed_b',
        nombre: 'Escenario aprobado B',
        descripcion: 'Subset demo para resultado aprobado.',
        questionIds: ['demo_question_5', 'demo_question_6', 'demo_question_7'],
      },
      {
        id: 'demo_section_failed_a',
        nombre: 'Escenario reprobado A',
        descripcion: 'Subset demo para resultado reprobado.',
        questionIds: ['demo_question_1', 'demo_question_2', 'demo_question_3', 'demo_question_4'],
      },
      {
        id: 'demo_section_failed_b',
        nombre: 'Escenario reprobado B',
        descripcion: 'Subset demo para resultado reprobado.',
        questionIds: ['demo_question_5', 'demo_question_6', 'demo_question_7', 'demo_question_8'],
      },
      {
        id: 'demo_section_info_a',
        nombre: 'Escenario informativo A',
        descripcion: 'Subset demo para contenido informativo.',
        questionIds: ['demo_question_1', 'demo_question_2', 'demo_question_3'],
      },
      {
        id: 'demo_section_info_b',
        nombre: 'Escenario informativo B',
        descripcion: 'Subset demo para contenido informativo.',
        questionIds: ['demo_question_4', 'demo_question_5', 'demo_question_6'],
      },
    ];
  }

  private buildCertifications(scenarios: DemoScenarioSpec[]): Certification[] {
    const certificationsById = new Map<string, Certification>();

    scenarios.forEach((scenario) => {
      if (certificationsById.has(scenario.certificationId)) {
        return;
      }

      certificationsById.set(scenario.certificationId, {
        id: scenario.certificationId,
        nombre: scenario.certificationName,
        descripcion: `Certificacion demo para ${scenario.questionnaireArea}.`,
        questionnaireIds: [scenario.questionnaireId],
        rules:
          scenario.key === 'submitted_info'
            ? { requireAll: true }
            : { requireAll: true, minScore: 80 },
      });
    });

    return Array.from(certificationsById.values());
  }

  private buildAnswers(
    questions: Question[],
    state: Record<string, DemoQuestionState>,
  ): Answer[] {
    return questions.map((question) => ({
      questionId: question.id,
      type: question.tipo,
      value: this.buildAnswerValue(question, !!state[question.id]?.answered),
    }));
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
        return 'Respuesta demo generada al iniciar sesion.';
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
        return 'labels' in question.config ? question.config.labels[0] ?? 'Diaria' : 'Diaria';
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

  private upsertEvaluationAssignments(nextAssignments: EvaluationAssignment[]): void {
    const existingAssignments = this.readEvaluationAssignments();
    const assignmentsById = new Map(existingAssignments.map((assignment) => [assignment.id, assignment]));

    nextAssignments.forEach((assignment) => {
      assignmentsById.set(assignment.id, assignment);
    });

    localStorage.setItem(
      this.assignmentsStorage.storageKey,
      JSON.stringify(Array.from(assignmentsById.values())),
    );
  }

  private readEvaluationAssignments(): EvaluationAssignment[] {
    const raw = localStorage.getItem(this.assignmentsStorage.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as EvaluationAssignment[]) : [];
    } catch {
      return [];
    }
  }

  private readMeta(userId: string): DemoSeedMeta | null {
    const raw = localStorage.getItem(this.getMetaKey(userId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as DemoSeedMeta;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private readDemoStore(): DemoStore | null {
    const raw = localStorage.getItem(this.demoStoreKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as DemoStore;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private buildClientNames(): Record<string, string> {
    const clients = new Map(
      this.clientsStore.listClients().map((client) => [String(client.id), client.nombreCliente]),
    );

    return {
      '1': clients.get('1') ?? 'Agroinsumos del Norte',
      '2': clients.get('2') ?? 'Soluciones Hidraulicas MX',
      '3': clients.get('3') ?? 'Grupo Clinico Integral',
      '4': clients.get('4') ?? 'Logistica Costera',
    };
  }

  private getMetaKey(userId: string): string {
    return `evaluaciones.user.demoSeeded.${encodeURIComponent(userId.trim().toLowerCase())}`;
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

  private addMinutes(referenceDate: Date, minutes: number): Date {
    const next = new Date(referenceDate);
    next.setMinutes(next.getMinutes() + minutes);
    return next;
  }
}

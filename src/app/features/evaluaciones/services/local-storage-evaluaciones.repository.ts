import { Injectable } from '@angular/core';
import {
  Answer,
  Assignment,
  Attempt,
  Certification,
  Question,
  Questionnaire,
  Section,
} from '../models';

@Injectable({ providedIn: 'root' })
export class LocalStorageEvaluacionesRepository {
  readonly storageKeys = {
    questions: 'dynEval.questions.v1',
    sections: 'dynEval.sections.v1',
    questionnaires: 'dynEval.questionnaires.v1',
    certifications: 'dynEval.certifications.v1',
    assignments: 'dynEval.assignments.v1',
    attempts: 'dynEval.attempts.v1',
  } as const;

  constructor() {
    this.seedDemoData();
  }

  getQuestions(): Question[] {
    return this.readArray<Question>(this.storageKeys.questions);
  }

  saveQuestion(payload: Omit<Question, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Question {
    const questions = this.getQuestions();
    const existing = payload.id ? questions.find((item) => item.id === payload.id) : undefined;
    const question: Question = {
      ...payload,
      id: payload.id ?? this.generateId('q'),
      createdAt: payload.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    };

    const index = questions.findIndex((item) => item.id === question.id);
    if (index >= 0) {
      questions[index] = question;
    } else {
      questions.push(question);
    }

    this.writeArray(this.storageKeys.questions, questions);
    return question;
  }

  deleteQuestion(questionId: string): void {
    const questions = this.getQuestions().filter((item) => item.id !== questionId);
    this.writeArray(this.storageKeys.questions, questions);

    const sections = this.getSections().map((section) => ({
      ...section,
      questionIds: section.questionIds.filter((id) => id !== questionId),
    }));
    this.writeArray(this.storageKeys.sections, sections);

    const attempts = this.getAttempts().map((attempt) => ({
      ...attempt,
      answers: attempt.answers.filter((answer) => answer.questionId !== questionId),
    }));
    this.writeArray(this.storageKeys.attempts, attempts);
  }

  getSections(): Section[] {
    return this.readArray<Section>(this.storageKeys.sections);
  }

  saveSection(payload: Omit<Section, 'id'> & { id?: string }): Section {
    const sections = this.getSections();
    const section: Section = {
      ...payload,
      id: payload.id ?? this.generateId('s'),
    };

    const index = sections.findIndex((item) => item.id === section.id);
    if (index >= 0) {
      sections[index] = section;
    } else {
      sections.push(section);
    }

    this.writeArray(this.storageKeys.sections, sections);
    return section;
  }

  deleteSection(sectionId: string): void {
    const sections = this.getSections().filter((item) => item.id !== sectionId);
    this.writeArray(this.storageKeys.sections, sections);

    const questionnaires = this.getQuestionnaires().map((questionnaire) => ({
      ...questionnaire,
      sectionIds: questionnaire.sectionIds.filter((id) => id !== sectionId),
    }));
    this.writeArray(this.storageKeys.questionnaires, questionnaires);
  }

  getQuestionnaires(): Questionnaire[] {
    return this.readArray<Questionnaire>(this.storageKeys.questionnaires).map((questionnaire) =>
      this.normalizeQuestionnaire(questionnaire),
    );
  }

  saveQuestionnaire(payload: Omit<Questionnaire, 'id'> & { id?: string }): Questionnaire {
    const questionnaires = this.getQuestionnaires();
    const questionnaire = this.normalizeQuestionnaire({
      ...payload,
      id: payload.id ?? this.generateId('cq'),
    });

    const index = questionnaires.findIndex((item) => item.id === questionnaire.id);
    if (index >= 0) {
      questionnaires[index] = questionnaire;
    } else {
      questionnaires.push(questionnaire);
    }

    this.writeArray(this.storageKeys.questionnaires, questionnaires);
    return questionnaire;
  }

  deleteQuestionnaire(questionnaireId: string): void {
    const questionnaires = this.getQuestionnaires().filter((item) => item.id !== questionnaireId);
    this.writeArray(this.storageKeys.questionnaires, questionnaires);

    const certifications = this.getCertifications().map((certification) => ({
      ...certification,
      questionnaireIds: certification.questionnaireIds.filter((id) => id !== questionnaireId),
    }));
    this.writeArray(this.storageKeys.certifications, certifications);

    const assignments = this.getAssignments().filter(
      (assignment) => assignment.questionnaireId !== questionnaireId,
    );
    this.writeArray(this.storageKeys.assignments, assignments);
  }

  getCertifications(): Certification[] {
    return this.readArray<Certification>(this.storageKeys.certifications);
  }

  saveCertification(payload: Omit<Certification, 'id'> & { id?: string }): Certification {
    const certifications = this.getCertifications();
    const certification: Certification = {
      ...payload,
      id: payload.id ?? this.generateId('cert'),
    };

    const index = certifications.findIndex((item) => item.id === certification.id);
    if (index >= 0) {
      certifications[index] = certification;
    } else {
      certifications.push(certification);
    }

    this.writeArray(this.storageKeys.certifications, certifications);
    return certification;
  }

  deleteCertification(certificationId: string): void {
    const certifications = this.getCertifications().filter((item) => item.id !== certificationId);
    this.writeArray(this.storageKeys.certifications, certifications);
  }

  getAssignments(): Assignment[] {
    return this.readArray<Assignment>(this.storageKeys.assignments);
  }

  getAssignmentById(assignmentId: string): Assignment | undefined {
    return this.getAssignments().find((item) => item.id === assignmentId);
  }

  getAssignmentsForUser(userId: string): Assignment[] {
    return this.getAssignments().filter((item) => item.targetUserId === userId);
  }

  saveAssignment(payload: Omit<Assignment, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Assignment {
    const assignments = this.getAssignments();
    const assignment: Assignment = {
      ...payload,
      id: payload.id ?? this.generateId('asg'),
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    const index = assignments.findIndex((item) => item.id === assignment.id);
    if (index >= 0) {
      assignments[index] = assignment;
    } else {
      assignments.push(assignment);
    }

    this.writeArray(this.storageKeys.assignments, assignments);
    return assignment;
  }

  deleteAssignment(assignmentId: string): void {
    const assignments = this.getAssignments().filter((item) => item.id !== assignmentId);
    this.writeArray(this.storageKeys.assignments, assignments);

    const attempts = this.getAttempts().filter((attempt) => attempt.assignmentId !== assignmentId);
    this.writeArray(this.storageKeys.attempts, attempts);
  }

  getAttempts(): Attempt[] {
    return this.readArray<Attempt>(this.storageKeys.attempts);
  }

  getAttemptById(attemptId: string): Attempt | undefined {
    return this.getAttempts().find((item) => item.id === attemptId);
  }

  getAttemptsForAssignment(
    assignmentId: string,
    userId: string,
    questionnaireId?: string,
  ): Attempt[] {
    return this.getAttempts().filter((attempt) => {
      if (attempt.assignmentId !== assignmentId || attempt.userId !== userId) {
        return false;
      }

      if (!questionnaireId) {
        return true;
      }

      return !attempt.questionnaireId || attempt.questionnaireId === questionnaireId;
    });
  }

  getLatestAttemptForAssignment(
    assignmentId: string,
    userId: string,
    questionnaireId?: string,
  ): Attempt | undefined {
    const attempts = this.getAttemptsForAssignment(
      assignmentId,
      userId,
      questionnaireId,
    );
    return attempts.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  }

  getInProgressAttempt(
    assignmentId: string,
    userId: string,
    questionnaireId?: string,
  ): Attempt | undefined {
    return this.getAttemptsForAssignment(assignmentId, userId, questionnaireId).find(
      (attempt) => attempt.status === 'IN_PROGRESS',
    );
  }

  createAttempt(
    assignmentId: string,
    userId: string,
    questionnaireId?: string,
  ): Attempt {
    const attempts = this.getAttempts();
    const attempt: Attempt = {
      id: this.generateId('att'),
      assignmentId,
      userId,
      questionnaireId,
      startedAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      answers: [],
    };
    attempts.push(attempt);
    this.writeArray(this.storageKeys.attempts, attempts);
    return attempt;
  }

  getOrCreateInProgressAttempt(
    assignmentId: string,
    userId: string,
    questionnaireId?: string,
  ): Attempt {
    const existing = this.getInProgressAttempt(assignmentId, userId, questionnaireId);
    if (existing) {
      return existing;
    }
    return this.createAttempt(assignmentId, userId, questionnaireId);
  }

  saveAttempt(attempt: Attempt): Attempt {
    const attempts = this.getAttempts();
    const index = attempts.findIndex((item) => item.id === attempt.id);

    if (index >= 0) {
      attempts[index] = attempt;
    } else {
      attempts.push(attempt);
    }

    this.writeArray(this.storageKeys.attempts, attempts);
    return attempt;
  }

  saveAttemptAnswers(attemptId: string, answers: Answer[]): Attempt | undefined {
    const attempt = this.getAttemptById(attemptId);
    if (!attempt) {
      return undefined;
    }

    const updated: Attempt = {
      ...attempt,
      answers,
    };

    return this.saveAttempt(updated);
  }

  submitAttempt(
    attemptId: string,
    answers: Answer[],
    reviewStatus?: Attempt['reviewStatus'],
  ): Attempt | undefined {
    const attempt = this.getAttemptById(attemptId);
    if (!attempt) {
      return undefined;
    }

    const updated: Attempt = {
      ...attempt,
      answers,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      reviewStatus: reviewStatus ?? attempt.reviewStatus ?? 'GRADED',
    };

    return this.saveAttempt(updated);
  }

  seedDemoData(): void {
    if (!this.areAllKeysEmpty()) {
      return;
    }    const now = new Date().toISOString();
    const questions: Question[] = [
      {
        id: 'q_demo_1',
        titulo: 'Selecciona el EPP principal para ingreso a planta',
        tipo: 'MULTIPLE',
        obligatoria: true,
        createdAt: now,
        ayuda: 'Elige una sola opcion.',
        config: {
          opciones: [
            { id: 'op_1', texto: 'Casco de seguridad' },
            { id: 'op_2', texto: 'Lentes de proteccion' },
            { id: 'op_3', texto: 'Calzado de seguridad' },
          ],
          multiple: false,
        },
      },
      {
        id: 'q_demo_2',
        titulo: 'Describe el procedimiento de bloqueo y etiquetado (LOTO)',
        tipo: 'TEXT',
        obligatoria: true,
        createdAt: now,
        config: {
          minLength: 20,
          maxLength: 500,
          placeholder: 'Escribe el procedimiento en tus palabras',
        },
      },
      {
        id: 'q_demo_3',
        titulo: 'Adjunta evidencia de inspeccion previa',
        tipo: 'FILE',
        obligatoria: false,
        createdAt: now,
        config: {
          allowedExtensions: ['pdf', 'jpg', 'png'],
          maxSizeMB: 10,
        },
      },
      {
        id: 'q_demo_4',
        titulo: 'Que transporte utilizas para llegar a planta?',
        tipo: 'MIXTA',
        obligatoria: true,
        createdAt: now,
        config: {
          opciones: [
            { id: 'mi_1', texto: 'Transporte de empresa' },
            { id: 'mi_2', texto: 'Auto propio' },
            { id: 'mi_3', texto: 'Transporte publico' },
          ],
          multiple: false,
          otherOptionValue: '__other__',
          otherLabel: 'Otros',
          otherPlaceholder: 'Especifica tu respuesta',
        },
      },
      {
        id: 'q_demo_5',
        titulo: 'Has recibido capacitacion de seguridad este mes?',
        tipo: 'DICOTOMICA',
        obligatoria: true,
        createdAt: now,
        config: {
          trueLabel: 'Si',
          falseLabel: 'No',
        },
      },
      {
        id: 'q_demo_6',
        titulo: 'Selecciona los riesgos identificados en tu area',
        tipo: 'MULTIPLE_SELECT',
        obligatoria: true,
        createdAt: now,
        config: {
          opciones: [
            { id: 'ms_1', texto: 'Riesgo electrico' },
            { id: 'ms_2', texto: 'Superficie resbalosa' },
            { id: 'ms_3', texto: 'Obstaculos en pasillo' },
          ],
        },
      },
      {
        id: 'q_demo_7',
        titulo: 'Ordena estas prioridades para inicio de turno',
        tipo: 'RANKING',
        obligatoria: true,
        createdAt: now,
        config: {
          opciones: [
            { id: 'rk_1', texto: 'Inspeccion visual de equipo' },
            { id: 'rk_2', texto: 'Revision de permisos' },
            { id: 'rk_3', texto: 'Briefing de seguridad' },
          ],
        },
      },
      {
        id: 'q_demo_8',
        titulo: 'La informacion del procedimiento fue clara',
        tipo: 'LIKERT',
        obligatoria: true,
        createdAt: now,
        config: {
          levels: [
            'Totalmente en desacuerdo',
            'En desacuerdo',
            'Ni de acuerdo ni en desacuerdo',
            'De acuerdo',
            'Totalmente de acuerdo',
          ],
        },
      },
      {
        id: 'q_demo_9',
        titulo: 'Califica de 1 a 10 la limpieza del area',
        tipo: 'NUMERIC_SCALE',
        obligatoria: true,
        createdAt: now,
        config: {
          min: 1,
          max: 10,
          step: 1,
        },
      },
      {
        id: 'q_demo_10',
        titulo: 'Frecuencia de uso de checklist de seguridad',
        tipo: 'NOMINAL_SCALE',
        obligatoria: true,
        createdAt: now,
        config: {
          labels: ['Muchas veces', 'A veces', 'Casi nunca', 'Nunca'],
          orientation: 'horizontal',
        },
      },
      {
        id: 'q_demo_11',
        titulo: 'Clasifica tu nivel de experiencia',
        tipo: 'FILTER',
        obligatoria: true,
        createdAt: now,
        config: {
          opciones: [
            { id: 'f_1', texto: 'Nuevo ingreso' },
            { id: 'f_2', texto: 'Intermedio' },
            { id: 'f_3', texto: 'Avanzado' },
          ],
          rules: [
            { answerValue: 'f_1', goToQuestionId: 'q_demo_2' },
            { answerValue: 'f_2', goToQuestionId: 'q_demo_8' },
            { answerValue: 'f_3', endQuiz: true },
          ],
        },
      },
    ];

    const sections: Section[] = [
      {
        id: 's_demo_1',
        nombre: 'Seguridad Operativa',
        descripcion: 'Preguntas base de cumplimiento en campo.',
        questionIds: [
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
      },
      {
        id: 's_demo_contexto',
        nombre: 'Contexto y preparacion',
        descripcion: 'Validaciones previas y contexto del usuario.',
        questionIds: ['q_demo_1', 'q_demo_2', 'q_demo_3', 'q_demo_4'],
      },
      {
        id: 's_demo_control',
        nombre: 'Control operativo',
        descripcion: 'Revision de riesgos, criterios y cumplimiento.',
        questionIds: ['q_demo_5', 'q_demo_6', 'q_demo_7', 'q_demo_8'],
      },
      {
        id: 's_demo_cierre',
        nombre: 'Cierre y seguimiento',
        descripcion: 'Indicadores finales y validacion de experiencia.',
        questionIds: ['q_demo_9', 'q_demo_10', 'q_demo_11'],
      },
    ];

    const questionnaires: Questionnaire[] = [
      {
        id: 'cq_demo_1',
        nombre: 'Evaluación Inicial de Seguridad',
        descripcion: 'Cuestionario de verificación para ingreso.',
        area: 'Sistemas',
        sectionIds: ['s_demo_1'],
        settings: {
          timeLimitMinutes: 25,
          maxAttempts: 2,
        },
      },
      {
        id: 'cq_demo_sistemas',
        nombre: 'Sistemas - Seguridad Operativa',
        descripcion: 'Ruta scored para personal de sistemas.',
        area: 'Sistemas',
        sectionIds: ['s_demo_contexto', 's_demo_control', 's_demo_cierre'],
        settings: {
          timeLimitMinutes: 30,
          maxAttempts: 2,
          activeFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          activeTo: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
          passScore: 80,
        },
      },
      {
        id: 'cq_demo_contaduria',
        nombre: 'Contaduria - Control Documental',
        descripcion: 'Cuestionario scored para controles administrativos.',
        area: 'Contaduria',
        sectionIds: ['s_demo_contexto', 's_demo_control', 's_demo_cierre'],
        settings: {
          timeLimitMinutes: 25,
          maxAttempts: 1,
          activeFrom: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          activeTo: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          passScore: 75,
        },
      },
      {
        id: 'cq_demo_operaciones',
        nombre: 'Operaciones - Ejecucion en Campo',
        descripcion: 'Cuestionario scored para evaluaciones de operacion.',
        area: 'Operaciones',
        sectionIds: ['s_demo_contexto', 's_demo_control', 's_demo_cierre'],
        settings: {
          timeLimitMinutes: 35,
          maxAttempts: 2,
          activeFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          activeTo: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          passScore: 80,
        },
      },
      {
        id: 'cq_demo_rh_info',
        nombre: 'RH - Induccion General',
        descripcion: 'Contenido informativo para onboarding y seguimiento.',
        area: 'RH',
        sectionIds: ['s_demo_contexto', 's_demo_control'],
        settings: {
          maxAttempts: 1,
          activeFrom: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          activeTo: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ];

    const certifications: Certification[] = [
      {
        id: 'cert_demo_1',
        nombre: 'Certificación Seguridad Nivel 1',
        descripcion: 'Aprobación mínima para acceso a operación.',
        questionnaireIds: ['cq_demo_1'],
        rules: {
          requireAll: true,
          minScore: 70,
        },
      },
      {
        id: 'cert_demo_multi_area',
        nombre: 'Operacion Segura Multiarea',
        descripcion: 'Certificacion demo con varios cuestionarios por usuario.',
        questionnaireIds: [
          'cq_demo_sistemas',
          'cq_demo_contaduria',
          'cq_demo_operaciones',
        ],
        rules: {
          requireAll: true,
          minScore: 80,
        },
      },
      {
        id: 'cert_demo_induccion_rh',
        nombre: 'Induccion RH',
        descripcion: 'Certificacion informativa para onboarding.',
        questionnaireIds: ['cq_demo_rh_info'],
        rules: {
          requireAll: false,
        },
      },
    ];

    const assignments: Assignment[] = [
      {
        id: 'asg_demo_1',
        targetUserId: 'user1',
        questionnaireId: 'cq_demo_1',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'asg_demo_2',
        targetUserId: 'user2',
        questionnaireId: 'cq_demo_1',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    ];

    this.writeArray(this.storageKeys.questions, questions);
    this.writeArray(this.storageKeys.sections, sections);
    this.writeArray(this.storageKeys.questionnaires, questionnaires);
    this.writeArray(this.storageKeys.certifications, certifications);
    this.writeArray(this.storageKeys.assignments, assignments);
    this.writeArray(this.storageKeys.attempts, []);
  }

  resetDemoData(): void {
    this.removeKey(this.storageKeys.questions);
    this.removeKey(this.storageKeys.sections);
    this.removeKey(this.storageKeys.questionnaires);
    this.removeKey(this.storageKeys.certifications);
    this.removeKey(this.storageKeys.assignments);
    this.removeKey(this.storageKeys.attempts);
    this.seedDemoData();
  }

  private areAllKeysEmpty(): boolean {
    const keys = Object.values(this.storageKeys);
    return keys.every((key) => {
      const value = localStorage.getItem(key);
      if (!value) {
        return true;
      }

      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed.length === 0 : false;
      } catch {
        return true;
      }
    });
  }

  private readArray<T>(key: string): T[] {
    const value = localStorage.getItem(key);
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private writeArray<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private normalizeQuestionnaire(questionnaire: Partial<Questionnaire>): Questionnaire {
    return {
      id: String(questionnaire.id ?? ''),
      nombre: String(questionnaire.nombre ?? '').trim(),
      descripcion: questionnaire.descripcion?.trim() || undefined,
      area: questionnaire.area?.trim() || 'Otro',
      sectionIds: Array.isArray(questionnaire.sectionIds)
        ? questionnaire.sectionIds.map((sectionId) => String(sectionId))
        : [],
      settings: {
        timeLimitMinutes:
          typeof questionnaire.settings?.timeLimitMinutes === 'number'
            ? questionnaire.settings.timeLimitMinutes
            : undefined,
        maxAttempts:
          typeof questionnaire.settings?.maxAttempts === 'number'
            ? questionnaire.settings.maxAttempts
            : undefined,
        activeFrom: questionnaire.settings?.activeFrom || undefined,
        activeTo: questionnaire.settings?.activeTo || undefined,
        passScore:
          typeof questionnaire.settings?.passScore === 'number'
            ? questionnaire.settings.passScore
            : undefined,
      },
    };
  }

  private removeKey(key: string): void {
    localStorage.removeItem(key);
  }

  private generateId(prefix: string): string {
    const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    return `${prefix}_${uuid}`;
  }
}



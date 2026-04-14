import { Injectable, inject } from '@angular/core';
import { AREAS_USUARIO_OPTIONS, UsuarioCliente } from '../../../pages/alta-clientes/alta-clientes.models';
import { ClientsStoreService } from '../../../pages/alta-clientes/clients-store.service';
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
} from '../models';
import { LocalStorageEvaluacionesRepository } from './local-storage-evaluaciones.repository';

export type AssignmentCurrency = 'MXN' | 'USD';
export type AssignmentPaymentStatus = 'PENDING' | 'WAITING' | 'PAID' | 'CANCELED';

export interface EvaluationAssignmentUser {
  userId: string;
  userName: string;
  userArea: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireArea: string;
}

export interface EvaluationAssignment {
  id: string;
  clientId: string;
  clientName: string;
  certificationId: string;
  certificationName: string;
  users: EvaluationAssignmentUser[];
  currency: AssignmentCurrency;
  price: number;
  paymentStatus: AssignmentPaymentStatus;
  createdAt: string;
  paidAt?: string;
}

export type SaveEvaluationAssignmentPayload = Omit<
  EvaluationAssignment,
  'id' | 'createdAt'
> & {
  paidAt?: string;
};

type LegacyEvaluationAssignment = Partial<EvaluationAssignment> & {
  assignedUserIds?: unknown;
};

@Injectable({ providedIn: 'root' })
export class AssignmentsStorageService {
  readonly storageKey = 'evaluaciones.assignments';

  private readonly clientsStore = inject(ClientsStoreService);
  private readonly repository = inject(LocalStorageEvaluacionesRepository);

  constructor() {
    this.seedDemoAssignments();
  }

  list(): EvaluationAssignment[] {
    return this.read()
      .map((item) => this.normalize(item))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  getById(assignmentId: string): EvaluationAssignment | undefined {
    return this.list().find((item) => item.id === assignmentId);
  }

  create(payload: SaveEvaluationAssignmentPayload): EvaluationAssignment {
    const assignments = this.read();
    const assignment = this.normalize({
      ...payload,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    });

    assignments.push(assignment);
    this.write(assignments.map((item) => this.normalize(item)));
    return assignment;
  }

  update(
    assignmentId: string,
    payload: Partial<SaveEvaluationAssignmentPayload>,
  ): EvaluationAssignment | undefined {
    const assignments = this.read();
    const index = assignments.findIndex((item) => String(item.id ?? '') === assignmentId);

    if (index < 0) {
      return undefined;
    }

    const updated = this.normalize(
      {
        ...assignments[index],
        ...payload,
        id: assignmentId,
        createdAt: String(assignments[index].createdAt ?? new Date().toISOString()),
      },
      this.normalize(assignments[index]),
    );

    assignments[index] = updated;
    this.write(assignments.map((item) => this.normalize(item)));
    return updated;
  }

  delete(assignmentId: string): void {
    const assignments = this.read()
      .filter((item) => String(item.id ?? '') !== assignmentId)
      .map((item) => this.normalize(item));
    this.write(assignments);
  }

  private normalize(
    item: LegacyEvaluationAssignment,
    existing?: EvaluationAssignment,
  ): EvaluationAssignment {
    const paymentStatus = this.normalizePaymentStatus(
      item.paymentStatus ?? existing?.paymentStatus,
    );
    const paidAt =
      paymentStatus === 'PAID'
        ? item.paidAt ?? existing?.paidAt ?? new Date().toISOString()
        : undefined;

    const clientId = String(item.clientId ?? existing?.clientId ?? '').trim();
    const certificationId = String(
      item.certificationId ?? existing?.certificationId ?? '',
    ).trim();
    const users = this.normalizeUsers(
      item.users,
      item.assignedUserIds,
      clientId,
      certificationId,
      existing?.users ?? [],
    );

    return {
      id: String(item.id ?? existing?.id ?? this.generateId()).trim(),
      clientId,
      clientName: String(item.clientName ?? existing?.clientName ?? '').trim(),
      certificationId,
      certificationName: String(
        item.certificationName ?? existing?.certificationName ?? '',
      ).trim(),
      users,
      currency: this.normalizeCurrency(item.currency ?? existing?.currency),
      price: this.normalizePrice(item.price ?? existing?.price ?? 0),
      paymentStatus,
      createdAt:
        String(item.createdAt ?? existing?.createdAt ?? new Date().toISOString()),
      paidAt,
    };
  }

  private normalizeUsers(
    value: unknown,
    legacyAssignedUserIds: unknown,
    clientId: string,
    certificationId: string,
    existingUsers: EvaluationAssignmentUser[],
  ): EvaluationAssignmentUser[] {
    if (Array.isArray(value) && value.length > 0) {
      return value
        .map((entry) => this.normalizeUser(entry, existingUsers))
        .filter((entry): entry is EvaluationAssignmentUser => !!entry);
    }

    const assignedUserIds = this.normalizeUserIds(legacyAssignedUserIds);
    if (assignedUserIds.length === 0) {
      return [];
    }

    const clientUsers = new Map(
      this.clientsStore
        .listUsersByClient(Number(clientId))
        .map((user) => [String(user.id), user]),
    );
    const certification = this.repository
      .getCertifications()
      .find((entry) => entry.id === certificationId);
    const certificationQuestionnaires = this.getQuestionnairesForCertification(certification);

    return assignedUserIds
      .map((userId) => {
        const existing = existingUsers.find((entry) => entry.userId === userId);
        if (existing) {
          return this.normalizeUser(existing, existingUsers);
        }

        const user = clientUsers.get(userId);
        const questionnaire = this.pickLegacyQuestionnaire(user, certificationQuestionnaires);
        return this.normalizeUser(
          {
            userId,
            userName: this.resolveUserName(user, userId),
            userArea: this.normalizeArea(user?.area),
            questionnaireId: questionnaire?.id ?? '',
            questionnaireName: questionnaire?.nombre ?? 'Sin cuestionario',
            questionnaireArea: this.normalizeArea(questionnaire?.area),
          },
          existingUsers,
        );
      })
      .filter((entry): entry is EvaluationAssignmentUser => !!entry);
  }

  private normalizeUser(
    value: unknown,
    existingUsers: EvaluationAssignmentUser[],
  ): EvaluationAssignmentUser | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const safe = value as Partial<EvaluationAssignmentUser>;
    const userId = String(safe.userId ?? '').trim();
    if (!userId) {
      return undefined;
    }

    const incomingQuestionnaireId = String(safe.questionnaireId ?? '').trim();
    const existing = existingUsers.find(
      (entry) =>
        entry.userId === userId &&
        (!incomingQuestionnaireId || entry.questionnaireId === incomingQuestionnaireId),
    );
    const questionnaire = this.repository
      .getQuestionnaires()
      .find(
        (entry) =>
          entry.id ===
          String(safe.questionnaireId ?? existing?.questionnaireId ?? '').trim(),
      );

    return {
      userId,
      userName: String(safe.userName ?? existing?.userName ?? `Usuario #${userId}`).trim(),
      userArea: this.normalizeArea(safe.userArea ?? existing?.userArea),
      questionnaireId: questionnaire?.id ?? String(safe.questionnaireId ?? existing?.questionnaireId ?? '').trim(),
      questionnaireName:
        questionnaire?.nombre ??
        String(safe.questionnaireName ?? existing?.questionnaireName ?? 'Sin cuestionario').trim(),
      questionnaireArea: this.normalizeArea(
        questionnaire?.area ?? safe.questionnaireArea ?? existing?.questionnaireArea,
      ),
    };
  }

  private pickLegacyQuestionnaire(
    user: UsuarioCliente | undefined,
    questionnaires: Questionnaire[],
  ): Questionnaire | undefined {
    if (questionnaires.length === 0) {
      return undefined;
    }

    const normalizedUserArea = this.normalizeArea(user?.area);
    return (
      questionnaires.find(
        (questionnaire) =>
          this.normalizeArea(questionnaire.area).toLowerCase() ===
          normalizedUserArea.toLowerCase(),
      ) ?? questionnaires[0]
    );
  }

  private getQuestionnairesForCertification(
    certification?: Certification,
  ): Questionnaire[] {
    if (!certification) {
      return [];
    }

    const questionnairesById = new Map(
      this.repository.getQuestionnaires().map((questionnaire) => [questionnaire.id, questionnaire]),
    );

    return certification.questionnaireIds
      .map((questionnaireId) => questionnairesById.get(questionnaireId))
      .filter((questionnaire): questionnaire is Questionnaire => !!questionnaire);
  }

  private resolveUserName(user: UsuarioCliente | undefined, userId: string): string {
    if (!user) {
      return `Usuario #${userId}`;
    }

    const fullName = `${user.nombres} ${user.apellidos}`.trim();
    return fullName || `Usuario #${user.id}`;
  }

  private normalizeCurrency(value: unknown): AssignmentCurrency {
    return value === 'USD' ? 'USD' : 'MXN';
  }

  private normalizePaymentStatus(value: unknown): AssignmentPaymentStatus {
    if (value === 'WAITING' || value === 'PAID' || value === 'CANCELED') {
      return value;
    }

    return 'PENDING';
  }

  private normalizePrice(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private normalizeUserIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map((item) => String(item ?? '').trim())
          .filter((item) => item.length > 0),
      ),
    );
  }

  private normalizeArea(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Otro';
    }

    return AREAS_USUARIO_OPTIONS.find(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    ) ?? normalized;
  }

  private read(): LegacyEvaluationAssignment[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as LegacyEvaluationAssignment[]) : [];
    } catch {
      return [];
    }
  }

  private write(assignments: EvaluationAssignment[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(assignments));
  }

  private seedDemoAssignments(): void {
    const clients = this.clientsStore.listClients();
    if (clients.length === 0) {
      return;
    }

    const client1 = this.clientsStore.getById(1);
    const client3 = this.clientsStore.getById(3);
    const clientUsers1 = this.clientsStore.listUsersByClient(1);
    const clientUsers3 = this.clientsStore.listUsersByClient(3);
    const adrian = clientUsers1.find((user) => user.email === 'adrian@moontest.mx');
    const mario = clientUsers1.find(
      (user) => user.email === 'mario.rangel@agroinsumos.mx',
    );
    const fernanda = clientUsers1.find(
      (user) => user.email === 'fernanda.solis@agroinsumos.mx',
    );
    const eduardo = clientUsers3.find((user) => user.email === 'eduardo.torres@gci.mx');

    if (!client1 || !client3 || !adrian || !mario || !fernanda || !eduardo) {
      return;
    }

    const existingAssignments = this.read().map((item) => this.normalize(item));
    const assignmentsById = new Map(
      existingAssignments.map((assignment) => [assignment.id, assignment]),
    );

    const now = new Date();
    const demoAssignments: EvaluationAssignment[] = [
      {
        id: 'assignment_demo_multi_adrian',
        clientId: String(client1.id),
        clientName: client1.nombreCliente,
        certificationId: 'cert_demo_multi_area',
        certificationName: 'Operacion Segura Multiarea',
        currency: 'MXN',
        price: 14500,
        paymentStatus: 'PAID',
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        users: [
          this.createAssignedUser(adrian, 'cq_demo_sistemas', 'Sistemas - Seguridad Operativa', 'Sistemas'),
          this.createAssignedUser(adrian, 'cq_demo_contaduria', 'Contaduria - Control Documental', 'Contaduria'),
          this.createAssignedUser(adrian, 'cq_demo_operaciones', 'Operaciones - Ejecucion en Campo', 'Operaciones'),
        ],
      },
      {
        id: 'assignment_demo_mario_review',
        clientId: String(client1.id),
        clientName: client1.nombreCliente,
        certificationId: 'cert_demo_multi_area',
        certificationName: 'Operacion Segura Multiarea',
        currency: 'MXN',
        price: 9800,
        paymentStatus: 'WAITING',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        users: [
          this.createAssignedUser(mario, 'cq_demo_operaciones', 'Operaciones - Ejecucion en Campo', 'Operaciones'),
        ],
      },
      {
        id: 'assignment_demo_fernanda_result',
        clientId: String(client1.id),
        clientName: client1.nombreCliente,
        certificationId: 'cert_demo_multi_area',
        certificationName: 'Operacion Segura Multiarea',
        currency: 'MXN',
        price: 8400,
        paymentStatus: 'PAID',
        createdAt: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(now.getTime() - 90 * 60 * 60 * 1000).toISOString(),
        users: [
          this.createAssignedUser(fernanda, 'cq_demo_contaduria', 'Contaduria - Control Documental', 'Contaduria'),
        ],
      },
      {
        id: 'assignment_demo_eduardo_info',
        clientId: String(client3.id),
        clientName: client3.nombreCliente,
        certificationId: 'cert_demo_induccion_rh',
        certificationName: 'Induccion RH',
        currency: 'MXN',
        price: 6200,
        paymentStatus: 'PENDING',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        users: [
          this.createAssignedUser(eduardo, 'cq_demo_rh_info', 'RH - Induccion General', 'RH'),
        ],
      },
    ];

    demoAssignments.forEach((assignment) => {
      if (!assignmentsById.has(assignment.id)) {
        assignmentsById.set(assignment.id, assignment);
      }
    });

    this.write(Array.from(assignmentsById.values()).map((item) => this.normalize(item)));
    this.seedDemoAttempts(adrian, mario, fernanda, eduardo);
  }

  private seedDemoAttempts(
    adrian: UsuarioCliente,
    mario: UsuarioCliente,
    fernanda: UsuarioCliente,
    eduardo: UsuarioCliente,
  ): void {
    const attempts = this.repository.getAttempts();
    const attemptsById = new Map(attempts.map((attempt) => [attempt.id, attempt]));
    const questions = this.repository.getQuestions();
    const baseQuestionIds = questions.map((question) => question.id);
    const now = new Date();

    const createAnswers = (answeredCount: number): Answer[] =>
      questions.map((question, index) => ({
        questionId: question.id,
        type: question.tipo,
        value: index < answeredCount ? this.buildAnsweredValue(question) : this.buildEmptyValue(question.tipo),
      }));

    const demoAttempts: Attempt[] = [
      {
        id: 'attempt_demo_adrian_contaduria_progress',
        assignmentId: 'assignment_demo_multi_adrian',
        userId: String(adrian.id),
        questionnaireId: 'cq_demo_contaduria',
        startedAt: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
        status: 'IN_PROGRESS',
        answers: createAnswers(Math.min(4, baseQuestionIds.length)),
      },
      {
        id: 'attempt_demo_adrian_operaciones_pending',
        assignmentId: 'assignment_demo_multi_adrian',
        userId: String(adrian.id),
        questionnaireId: 'cq_demo_operaciones',
        startedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        submittedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
        status: 'SUBMITTED',
        reviewStatus: 'PENDING_REVIEW',
        answers: createAnswers(baseQuestionIds.length),
      },
      {
        id: 'attempt_demo_mario_pending',
        assignmentId: 'assignment_demo_mario_review',
        userId: String(mario.id),
        questionnaireId: 'cq_demo_operaciones',
        startedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
        submittedAt: new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(),
        status: 'SUBMITTED',
        reviewStatus: 'PENDING_REVIEW',
        answers: createAnswers(baseQuestionIds.length),
      },
      {
        id: 'attempt_demo_fernanda_graded',
        assignmentId: 'assignment_demo_fernanda_result',
        userId: String(fernanda.id),
        questionnaireId: 'cq_demo_contaduria',
        startedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
        submittedAt: new Date(now.getTime() - 34 * 60 * 60 * 1000).toISOString(),
        status: 'SUBMITTED',
        reviewStatus: 'GRADED',
        answers: createAnswers(baseQuestionIds.length),
      },
      {
        id: 'attempt_demo_eduardo_progress',
        assignmentId: 'assignment_demo_eduardo_info',
        userId: String(eduardo.id),
        questionnaireId: 'cq_demo_rh_info',
        startedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        status: 'IN_PROGRESS',
        answers: createAnswers(Math.min(2, baseQuestionIds.length)),
      },
    ];

    demoAttempts.forEach((attempt) => {
      if (!attemptsById.has(attempt.id)) {
        this.repository.saveAttempt(attempt);
      }
    });
  }

  private createAssignedUser(
    user: UsuarioCliente,
    questionnaireId: string,
    questionnaireName: string,
    questionnaireArea: string,
  ): EvaluationAssignmentUser {
    return {
      userId: String(user.id),
      userName: `${user.nombres} ${user.apellidos}`.trim(),
      userArea: this.normalizeArea(user.area),
      questionnaireId,
      questionnaireName,
      questionnaireArea,
    };
  }

  private buildAnsweredValue(question: Question): Answer['value'] {
    switch (question.tipo) {
      case 'MULTIPLE': {
        const firstOption =
          'opciones' in question.config ? question.config.opciones[0]?.id ?? '' : '';
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
        return 'Respuesta demo almacenada localmente.';
      case 'FILE': {
        const fileValue: FileAnswerValue = {
          fileName: 'evidencia-demo.pdf',
          fileSize: 142000,
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
        return 'levels' in question.config
          ? question.config.levels?.[question.config.levels.length - 1] ?? 'De acuerdo'
          : 'De acuerdo';
      case 'NOMINAL_SCALE':
        return 'labels' in question.config ? question.config.labels[0] ?? 'Muchas veces' : 'Muchas veces';
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

  private buildEmptyValue(questionType: Question['tipo']): Answer['value'] {
    if (
      questionType === 'MULTIPLE' ||
      questionType === 'MULTIPLE_SELECT' ||
      questionType === 'RANKING'
    ) {
      return [];
    }

    if (
      questionType === 'TEXT' ||
      questionType === 'LIKERT' ||
      questionType === 'NOMINAL_SCALE'
    ) {
      return '';
    }

    return null;
  }

  private generateId(): string {
    const uuid =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    return `assignment_${uuid}`;
  }
}

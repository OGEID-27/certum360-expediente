import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  History,
  Hourglass,
  LucideAngularModule,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-angular';
import { Cliente } from '../alta-clientes.models';
import { ClientsStoreService } from '../clients-store.service';
import { Attempt, Questionnaire } from '../../../features/evaluaciones/models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../../features/evaluaciones/services/assignments-storage.service';
import {
  DemoAttemptMetrics,
  UserEvaluationsDemoService,
} from '../../../features/evaluaciones/services/user-evaluations-demo.service';
import { LocalStorageEvaluacionesRepository } from '../../../features/evaluaciones/services/local-storage-evaluaciones.repository';

type CompanyEvaluationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'GRADED'
  | 'EXPIRED'
  | 'MIXED';

interface CompanyQuestionnaireViewModel {
  assignmentId: string;
  userId: string;
  questionnaireId: string;
  nombre: string;
  area: string;
  questionnaire?: Questionnaire;
  latestAttempt?: Attempt;
  metrics: DemoAttemptMetrics;
  status: CompanyEvaluationStatus;
  statusLabel: string;
  lastActivityAt?: string;
}

interface CompanyEvaluationCardViewModel {
  assignment: EvaluationAssignment;
  client: Cliente;
  userId: string;
  userName: string;
  userArea: string;
  userEmail?: string;
  userSecondary?: string;
  questionnaires: CompanyQuestionnaireViewModel[];
  overallStatus: CompanyEvaluationStatus;
  overallStatusLabel: string;
  createdAt: string;
  lastActivityAt?: string;
}

@Component({
  selector: 'app-client-evaluations',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './client-evaluations.component.html',
})
export class ClientEvaluationsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsStore = inject(ClientsStoreService);
  private readonly assignmentsStorage = inject(AssignmentsStorageService);
  private readonly repository = inject(LocalStorageEvaluacionesRepository);
  private readonly demoService = inject(UserEvaluationsDemoService);

  readonly Building2 = Building2;
  readonly ShieldCheck = ShieldCheck;
  readonly Search = Search;
  readonly Users = Users;
  readonly ClipboardList = ClipboardList;
  readonly ClipboardCheck = ClipboardCheck;
  readonly History = History;
  readonly Hourglass = Hourglass;
  readonly Eye = Eye;

  client?: Cliente;
  items: CompanyEvaluationCardViewModel[] = [];
  filteredItems: CompanyEvaluationCardViewModel[] = [];
  searchTerm = '';
  selectedStatus = 'ALL';
  selectedUser = 'ALL';
  selectedDate = '';

  constructor() {
    this.loadData();
  }

  get userOptions(): string[] {
    return Array.from(new Set(this.items.map((item) => item.userName))).sort((a, b) =>
      a.localeCompare(b),
    );
  }

  get totalQuestionnaires(): number {
    return this.filteredItems.reduce(
      (total, item) => total + item.questionnaires.length,
      0,
    );
  }

  get pendingReviewCount(): number {
    return this.filteredItems.reduce(
      (total, item) =>
        total +
        item.questionnaires.filter(
          (questionnaire) => questionnaire.status === 'PENDING_REVIEW',
        ).length,
      0,
    );
  }

  onFiltersChange(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredItems = this.items.filter((item) => {
      const matchesStatus =
        this.selectedStatus === 'ALL' ||
        item.overallStatus === this.selectedStatus ||
        item.questionnaires.some(
          (questionnaire) => questionnaire.status === this.selectedStatus,
        );
      const matchesUser =
        this.selectedUser === 'ALL' || item.userName === this.selectedUser;
      const matchesDate = !this.selectedDate || this.matchesDate(item, this.selectedDate);
      const haystack = [
        item.assignment.id,
        item.assignment.certificationName,
        item.userName,
        item.userArea,
        item.userEmail,
        item.userSecondary,
        item.overallStatusLabel,
        ...item.questionnaires.map((questionnaire) => questionnaire.nombre),
        ...item.questionnaires.map((questionnaire) => questionnaire.area),
        ...item.questionnaires.map((questionnaire) => questionnaire.statusLabel),
      ]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();
      const matchesText = !term || haystack.includes(term);

      return matchesStatus && matchesUser && matchesDate && matchesText;
    });
  }

  openDetail(item: CompanyEvaluationCardViewModel): void {
    this.router.navigate([
      '/alta-clientes',
      item.client.id,
      'evaluaciones',
      item.assignment.id,
      'usuarios',
      item.userId,
    ], {
      queryParams: {
        mode: this.isPendingReviewItem(item) ? 'grading' : 'detail',
      },
    });
  }

  getPrimaryActionLabel(item: CompanyEvaluationCardViewModel): string {
    return this.isPendingReviewItem(item) ? 'Calificar' : 'Revisar cuestionarios';
  }

  getPrimaryActionIcon(item: CompanyEvaluationCardViewModel) {
    return this.isPendingReviewItem(item) ? this.ClipboardCheck : this.Eye;
  }

  getPrimaryActionClass(item: CompanyEvaluationCardViewModel): string {
    if (this.isPendingReviewItem(item)) {
      return 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber-500/20 active:bg-amber-600 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 dark:focus-visible:ring-amber-400/25';
    }

    return 'bg-brand-500 text-white hover:bg-brand-600 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand-500/20 active:bg-brand-600';
  }

  getStatusClass(status: CompanyEvaluationStatus): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'PENDING_REVIEW':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'GRADED':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'EXPIRED':
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
      case 'MIXED':
        return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
      case 'NOT_STARTED':
      default:
        return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
    }
  }

  getAreaChipClass(area: string): string {
    const normalized = area.trim().toLowerCase();
    if (normalized === 'sistemas' || normalized === 'operaciones') {
      return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
    }

    if (normalized === 'contaduria' || normalized === 'legal') {
      return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
    }

    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Sin actividad';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private isPendingReviewItem(item: CompanyEvaluationCardViewModel): boolean {
    return item.overallStatus === 'PENDING_REVIEW';
  }

  private loadData(): void {
    const clientId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(clientId)) {
      return;
    }

    const client = this.clientsStore.getById(clientId);
    if (!client) {
      return;
    }

    this.client = client;
    const questionnairesById = new Map(
      this.repository.getQuestionnaires().map((questionnaire) => [questionnaire.id, questionnaire]),
    );

    this.items = this.assignmentsStorage
      .list()
      .filter((assignment) => Number(assignment.clientId) === clientId)
      .flatMap((assignment) => this.buildCardsForAssignment(assignment, client, questionnairesById))
      .sort((a, b) => Date.parse(b.lastActivityAt ?? b.createdAt) - Date.parse(a.lastActivityAt ?? a.createdAt));

    this.onFiltersChange();
  }

  private buildCardsForAssignment(
    assignment: EvaluationAssignment,
    client: Cliente,
    questionnairesById: Map<string, Questionnaire>,
  ): CompanyEvaluationCardViewModel[] {
    const clientUsers = new Map(
      this.clientsStore
        .listUsersByClient(client.id)
        .map((user) => [String(user.id), user]),
    );
    const entriesByUserId = new Map<string, EvaluationAssignmentUser[]>();

    assignment.users.forEach((entry) => {
      const current = entriesByUserId.get(entry.userId) ?? [];
      current.push(entry);
      entriesByUserId.set(entry.userId, current);
    });

    return Array.from(entriesByUserId.entries()).map(([userId, entries]) => {
      const baseEntry = entries[0];
      const clientUser = clientUsers.get(userId);
      const questionnaires = entries.map<CompanyQuestionnaireViewModel>((entry) => {
        const questionnaire = questionnairesById.get(entry.questionnaireId);
        const latestAttempt = this.repository.getLatestAttemptForAssignment(
          assignment.id,
          userId,
          entry.questionnaireId,
        );
        const metrics = questionnaire
          ? this.demoService.getAttemptMetrics(questionnaire, latestAttempt)
          : {
              answeredCount: 0,
              correctCount: 0,
              totalQuestions: 0,
              progressPercent: 0,
              scorePercent: null,
              passScore: null,
              passed: null,
              isScored: false,
              sectionMetrics: [],
            };
        const status = this.resolveStatus(questionnaire, latestAttempt);

        return {
          assignmentId: assignment.id,
          userId,
          questionnaireId: entry.questionnaireId,
          nombre: entry.questionnaireName,
          area: entry.questionnaireArea,
          questionnaire,
          latestAttempt,
          metrics,
          status,
          statusLabel: this.resolveStatusLabel(status),
          lastActivityAt: latestAttempt?.submittedAt || latestAttempt?.startedAt,
        };
      });
      const overallStatus = this.resolveOverallStatus(questionnaires);

      return {
        assignment,
        client,
        userId,
        userName:
          `${clientUser?.nombres ?? ''} ${clientUser?.apellidos ?? ''}`.trim() ||
          baseEntry.userName ||
          `Usuario #${userId}`,
        userArea: clientUser?.area || baseEntry.userArea,
        userEmail: clientUser?.email || undefined,
        userSecondary: clientUser?.telefono || `ID interno ${userId}`,
        questionnaires,
        overallStatus,
        overallStatusLabel: this.resolveStatusLabel(overallStatus),
        createdAt: assignment.createdAt,
        lastActivityAt: questionnaires
          .map((questionnaire) => questionnaire.lastActivityAt)
          .filter((value): value is string => !!value)
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0],
      };
    });
  }

  private resolveStatus(
    questionnaire?: Questionnaire,
    attempt?: Attempt,
  ): CompanyEvaluationStatus {
    if (questionnaire && this.demoService.isExpired(questionnaire)) {
      return 'EXPIRED';
    }

    if (!attempt) {
      return 'NOT_STARTED';
    }

    if (attempt.status === 'IN_PROGRESS') {
      return 'IN_PROGRESS';
    }

    return attempt.reviewStatus === 'PENDING_REVIEW' ? 'PENDING_REVIEW' : 'GRADED';
  }

  private resolveOverallStatus(
    questionnaires: CompanyQuestionnaireViewModel[],
  ): CompanyEvaluationStatus {
    const statuses = questionnaires.map((questionnaire) => questionnaire.status);

    if (statuses.length === 0) {
      return 'NOT_STARTED';
    }

    if (statuses.every((status) => status === 'GRADED')) {
      return 'GRADED';
    }

    if (statuses.every((status) => status === 'NOT_STARTED')) {
      return 'NOT_STARTED';
    }

    if (statuses.every((status) => status === 'EXPIRED')) {
      return 'EXPIRED';
    }

    if (statuses.includes('PENDING_REVIEW')) {
      return 'PENDING_REVIEW';
    }

    if (statuses.includes('IN_PROGRESS')) {
      return 'IN_PROGRESS';
    }

    return 'MIXED';
  }

  private resolveStatusLabel(status: CompanyEvaluationStatus): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'PENDING_REVIEW':
        return 'Falta de calificar';
      case 'GRADED':
        return 'Calificada';
      case 'EXPIRED':
        return 'Expirada';
      case 'MIXED':
        return 'Mixta';
      case 'NOT_STARTED':
      default:
        return 'No iniciada';
    }
  }

  private matchesDate(item: CompanyEvaluationCardViewModel, rawDate: string): boolean {
    const targetDate = rawDate.trim();
    if (!targetDate) {
      return true;
    }

    const candidateValues = [
      item.createdAt,
      item.lastActivityAt,
      ...item.questionnaires.map((questionnaire) => questionnaire.lastActivityAt),
    ].filter((value): value is string => !!value);

    return candidateValues.some((value) => value.slice(0, 10) === targetDate);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BadgeCheck,
  ClipboardList,
  History,
  Hourglass,
  Link,
  LucideAngularModule,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Eye,
} from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import { Attempt, Certification, Questionnaire } from '../../models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../services/assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import {
  DemoAttemptMetrics,
  UserEvaluationsDemoService,
} from '../../services/user-evaluations-demo.service';
import { UserEvaluationsDemoSeedService } from '../../services/user-evaluations-demo-seed.service';
import { ModalService } from '../../../../shared/services/modal.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ClientsStoreService } from '../../../../pages/alta-clientes/clients-store.service';
import { SessionRoleService } from '../../../../core/services/session-role.service';

type EvaluationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'GRADED'
  | 'EXPIRED'
  | 'MIXED';

interface QuestionnaireCardViewModel {
  assignmentId: string;
  userId: string;
  questionnaireId: string;
  questionnaire: Questionnaire;
  latestAttempt?: Attempt;
  metrics: DemoAttemptMetrics;
  status: EvaluationStatus;
  statusLabel: string;
  actionLabel: string;
  disabledReason?: string;
}

interface EvaluationCardViewModel {
  assignment: EvaluationAssignment;
  assignedUser: EvaluationAssignmentUser;
  assignedQuestionnaires: QuestionnaireCardViewModel[];
  certification?: Certification;
  overallStatus: EvaluationStatus;
  overallStatusLabel: string;
  lastActivityAt?: string;
}

interface CurrentUserIdentity {
  displayName: string;
  email: string;
}

@Component({
  selector: 'app-usuario-mis-evaluaciones',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './usuario-mis-evaluaciones.component.html',
})
export class UsuarioMisEvaluacionesComponent implements OnDestroy {
  readonly BadgeCheck = BadgeCheck;
  readonly Search = Search;
  readonly RotateCcw = RotateCcw;
  readonly Link = Link;
  readonly History = History;
  readonly Hourglass = Hourglass;
  readonly ClipboardList = ClipboardList;
  readonly Play = Play;
  readonly Eye = Eye;
  readonly ShieldCheck = ShieldCheck;

  items: EvaluationCardViewModel[] = [];
  filteredItems: EvaluationCardViewModel[] = [];
  currentUserLabel = '';
  searchTerm = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly demoService: UserEvaluationsDemoService,
    private readonly demoSeedService: UserEvaluationsDemoSeedService,
    private readonly clientsStore: ClientsStoreService,
    private readonly sessionRoleService: SessionRoleService,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly toastService: ToastService,
  ) {
    this.currentUserLabel = this.getCurrentIdentity().displayName;
    this.loadAssignments();
    this.sessionRoleService.role$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentUserLabel = this.getCurrentIdentity().displayName;
      this.loadAssignments();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async resetDemo(): Promise<void> {
    const confirmed = await this.modalService.openConfirm({
      title: 'Reiniciar demo',
      message:
        'Se borraran y se volveran a sembrar las evaluaciones demo del usuario actual.',
      type: 'warning',
      confirmText: 'Reiniciar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    this.demoSeedService.resetUserEvaluationsDemo();
    this.loadAssignments();
    this.toastService.show({
      type: 'success',
      message: 'Demo reiniciada.',
      durationMs: 2600,
    });
  }

  onSearchChange(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter((item) => {
      const haystack = [
        item.assignment.certificationName,
        item.assignment.clientName,
        item.assignedUser.userArea,
        item.overallStatusLabel,
        ...item.assignedQuestionnaires.map((questionnaire) => questionnaire.questionnaire.nombre),
        ...item.assignedQuestionnaires.map((questionnaire) => questionnaire.questionnaire.area || ''),
        ...item.assignedQuestionnaires.map((questionnaire) => questionnaire.statusLabel),
      ]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }

  runQuestionnaireAction(
    item: EvaluationCardViewModel,
    questionnaireItem: QuestionnaireCardViewModel,
  ): void {
    if (
      questionnaireItem.status === 'EXPIRED' ||
      questionnaireItem.status === 'PENDING_REVIEW'
    ) {
      return;
    }

    if (questionnaireItem.status === 'GRADED' && questionnaireItem.latestAttempt) {
      this.router.navigate([
        '/evaluaciones/usuario/resultado',
        questionnaireItem.latestAttempt.id,
      ]);
      return;
    }

    this.repository.getOrCreateInProgressAttempt(
      item.assignment.id,
      item.assignedUser.userId,
      questionnaireItem.questionnaireId,
    );
    this.router.navigate(['/evaluaciones/usuario/resolver', item.assignment.id], {
      queryParams: {
        questionnaireId: questionnaireItem.questionnaireId,
      },
    });
  }

  getStatusClass(status: EvaluationStatus): string {
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
        return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
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

  get totalAssignedQuestionnaires(): number {
    return this.filteredItems.reduce(
      (total, item) => total + item.assignedQuestionnaires.length,
      0,
    );
  }

  getProgressBarClass(item: QuestionnaireCardViewModel): string {
    if (item.status === 'GRADED') {
      return item.metrics.isScored && item.metrics.passed === false ? 'bg-rose-500' : 'bg-emerald-500';
    }

    if (item.status === 'PENDING_REVIEW') {
      return 'bg-amber-500';
    }

    if (item.status === 'IN_PROGRESS') {
      return 'bg-sky-500';
    }

    if (item.status === 'EXPIRED') {
      return 'bg-rose-500';
    }

    return 'bg-gray-400 dark:bg-gray-600';
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  formatExpiry(value?: string): string {
    if (!value) {
      return 'Sin expiracion';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  private loadAssignments(): void {
    const identity = this.getCurrentIdentity();
    const questionnaires = new Map(
      this.repository.getQuestionnaires().map((questionnaire) => [questionnaire.id, questionnaire]),
    );
    const certifications = new Map(
      this.repository.getCertifications().map((certification) => [certification.id, certification]),
    );

    const nextItems = this.assignmentsStorage
      .list()
      .reduce<EvaluationCardViewModel[]>((acc, assignment) => {
        const assignedUsers = this.resolveCurrentAssignedUsers(assignment, identity);
        if (assignedUsers.length === 0) {
          return acc;
        }

        const assignedQuestionnaires = assignedUsers
          .map<QuestionnaireCardViewModel | null>((entry) => {
            const questionnaire = questionnaires.get(entry.questionnaireId);
            if (!questionnaire) {
              return null;
            }

            const latestAttempt = this.repository.getLatestAttemptForAssignment(
              assignment.id,
              entry.userId,
              entry.questionnaireId,
            );
            const metrics = this.demoService.getAttemptMetrics(questionnaire, latestAttempt);
            const status = this.resolveStatus(questionnaire, latestAttempt);

            return {
              assignmentId: assignment.id,
              userId: entry.userId,
              questionnaireId: entry.questionnaireId,
              questionnaire,
              latestAttempt,
              metrics,
              status,
              statusLabel: this.resolveStatusLabel(status),
              actionLabel: this.resolveActionLabel(status),
              disabledReason: this.resolveDisabledReason(status),
            };
          })
          .filter(
            (entry): entry is QuestionnaireCardViewModel => !!entry,
          );

        if (assignedQuestionnaires.length === 0) {
          return acc;
        }

        acc.push({
          assignment,
          assignedUser: assignedUsers[0],
          assignedQuestionnaires,
          certification: certifications.get(assignment.certificationId),
          overallStatus: this.resolveOverallStatus(assignedQuestionnaires),
          overallStatusLabel: this.resolveStatusLabel(
            this.resolveOverallStatus(assignedQuestionnaires),
          ),
          lastActivityAt: assignedQuestionnaires
            .map(
              (questionnaire) =>
                questionnaire.latestAttempt?.submittedAt ||
                questionnaire.latestAttempt?.startedAt,
            )
            .filter((value): value is string => !!value)
            .sort((a, b) => Date.parse(b) - Date.parse(a))[0],
        });

        return acc;
      }, [])
      .sort((a, b) => Date.parse(b.lastActivityAt ?? b.assignment.createdAt) - Date.parse(a.lastActivityAt ?? a.assignment.createdAt));

    this.items = nextItems;
    this.onSearchChange();
  }

  private resolveCurrentAssignedUsers(
    assignment: EvaluationAssignment,
    identity: CurrentUserIdentity,
  ): EvaluationAssignmentUser[] {
    const users = this.clientsStore.listUsersByClient(Number(assignment.clientId));
    const usersById = new Map(users.map((user) => [String(user.id), user]));
    const normalizedEmail = identity.email.trim().toLowerCase();
    const normalizedName = identity.displayName.trim().toLowerCase();

    return assignment.users.filter((assignedUser) => {
      const clientUser = usersById.get(assignedUser.userId);
      const clientUserName = clientUser
        ? `${clientUser.nombres} ${clientUser.apellidos}`.trim().toLowerCase()
        : '';

      return (
        clientUser?.email.trim().toLowerCase() === normalizedEmail ||
        assignedUser.userName.trim().toLowerCase() === normalizedName ||
        clientUserName === normalizedName
      );
    });
  }

  private getCurrentIdentity(): CurrentUserIdentity {
    const role = this.sessionRoleService.getRole() ?? 'admin';
    if (role === 'user') {
      return {
        displayName: 'Adrian',
        email: 'adrian@moontest.mx',
      };
    }

    return {
      displayName: 'Roberto',
      email: 'roberto@moontest.mx',
    };
  }

  private resolveStatus(
    questionnaire: Questionnaire,
    latestAttempt?: Attempt,
  ): EvaluationStatus {
    if (this.demoService.isExpired(questionnaire)) {
      return 'EXPIRED';
    }

    if (!latestAttempt) {
      return 'NOT_STARTED';
    }

    if (latestAttempt.status === 'IN_PROGRESS') {
      return 'IN_PROGRESS';
    }

    return latestAttempt.reviewStatus === 'PENDING_REVIEW'
      ? 'PENDING_REVIEW'
      : 'GRADED';
  }

  private resolveOverallStatus(
    questionnaires: QuestionnaireCardViewModel[],
  ): EvaluationStatus {
    const statuses = questionnaires.map((questionnaire) => questionnaire.status);

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

  private resolveStatusLabel(status: EvaluationStatus): string {
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

  private resolveActionLabel(status: EvaluationStatus): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'Continuar';
      case 'PENDING_REVIEW':
        return 'Pendiente';
      case 'GRADED':
        return 'Ver resultado';
      case 'EXPIRED':
        return 'Expirada';
      case 'NOT_STARTED':
      default:
        return 'Contestar';
    }
  }

  private resolveDisabledReason(status: EvaluationStatus): string | undefined {
    if (status === 'PENDING_REVIEW') {
      return 'La evaluacion fue enviada y aun falta revisarla.';
    }

    if (status === 'EXPIRED') {
      return 'La vigencia de esta evaluacion ya termino.';
    }

    return undefined;
  }
}

import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  CircleGauge,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  History,
  Layers3,
  ListChecks,
  LucideAngularModule,
  MessageSquareText,
  Save,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-angular';
import { ToastService } from '../../../shared/services/toast.service';
import { Cliente } from '../alta-clientes.models';
import { ClientsStoreService } from '../clients-store.service';
import {
  Answer,
  Attempt,
  getQuestionTypeLabel,
  Question,
  Questionnaire,
  Section,
} from '../../../features/evaluaciones/models';
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
import { WeightsStorageService } from '../../../features/evaluaciones/services/weights-storage.service';

type CompanyEvaluationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'GRADED'
  | 'EXPIRED'
  | 'MIXED';

type DetailViewMode = 'detail' | 'grading';
type ReviewGrade = 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA';
type ReviewItemState = 'PENDING' | 'IN_REVIEW' | 'REVIEWED' | 'NOT_APPLICABLE';

interface PersistedQuestionReview {
  grade: ReviewGrade | null;
  comment: string;
}

interface PersistedQuestionnaireReview {
  savedAt?: string;
  finalizedAt?: string;
  questions: Record<string, PersistedQuestionReview>;
}

interface WeightProfile {
  weight: number;
  isRequired: boolean;
  contributes: boolean;
}

interface AdminQuestionViewModel {
  key: string;
  question: Question;
  answer?: Answer;
  answerLines: string[];
  answered: boolean;
  weight: number;
  contributes: boolean;
  isRequired: boolean;
  grade: ReviewGrade | null;
  comment: string;
  state: ReviewItemState;
}

interface AdminSectionViewModel {
  key: string;
  section: Section;
  weight: number;
  contributes: boolean;
  isRequired: boolean;
  questions: AdminQuestionViewModel[];
  reviewedCount: number;
  totalReviewableQuestions: number;
  pendingCount: number;
  progressPercent: number;
  scorePercent: number | null;
  state: ReviewItemState;
}

interface QuestionnaireReviewSummary {
  reviewedQuestions: number;
  totalReviewableQuestions: number;
  pendingQuestions: number;
  progressPercent: number;
  weightedScore: number | null;
  requiredSectionsComplete: number;
  requiredSectionsTotal: number;
  optionalSections: number;
  isFinalizable: boolean;
  savedAt?: string;
  finalizedAt?: string;
  hasDraftChanges: boolean;
}

interface DetailQuestionnaireViewModel {
  entry: EvaluationAssignmentUser;
  questionnaire?: Questionnaire;
  latestAttempt?: Attempt;
  metrics: DemoAttemptMetrics;
  status: CompanyEvaluationStatus;
  statusLabel: string;
  questionnaireWeight: number;
  contributes: boolean;
  isRequired: boolean;
  sections: AdminSectionViewModel[];
  reviewSummary: QuestionnaireReviewSummary;
}

const REVIEW_OPTIONS: Array<{
  value: ReviewGrade;
  label: string;
  hint: string;
}> = [
  { value: 'CUMPLE', label: 'Cumple', hint: 'Cumple con el criterio esperado.' },
  { value: 'NO_CUMPLE', label: 'No cumple', hint: 'No satisface el criterio solicitado.' },
  { value: 'NO_APLICA', label: 'No aplica', hint: 'No impacta el resultado final.' },
];

const REVIEW_SCORES: Record<ReviewGrade, number | null> = {
  CUMPLE: 1,
  NO_CUMPLE: 0,
  NO_APLICA: null,
};

@Component({
  selector: 'app-client-evaluation-detail',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './client-evaluation-detail.component.html',
})
export class ClientEvaluationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly clientsStore = inject(ClientsStoreService);
  private readonly assignmentsStorage = inject(AssignmentsStorageService);
  private readonly repository = inject(LocalStorageEvaluacionesRepository);
  private readonly demoService = inject(UserEvaluationsDemoService);
  private readonly weightsStorage = inject(WeightsStorageService);
  private readonly toastService = inject(ToastService);

  private readonly reviewStorageKey = 'alta-clientes.admin-review.v1';

  readonly ArrowLeft = ArrowLeft;
  readonly BadgeCheck = BadgeCheck;
  readonly Building2 = Building2;
  readonly CheckCircle2 = CheckCircle2;
  readonly CircleAlert = CircleAlert;
  readonly CircleGauge = CircleGauge;
  readonly ClipboardCheck = ClipboardCheck;
  readonly Clock3 = Clock3;
  readonly Eye = Eye;
  readonly FileText = FileText;
  readonly History = History;
  readonly Layers3 = Layers3;
  readonly ListChecks = ListChecks;
  readonly MessageSquareText = MessageSquareText;
  readonly Save = Save;
  readonly ShieldCheck = ShieldCheck;
  readonly Target = Target;
  readonly Users = Users;
  readonly reviewOptions = REVIEW_OPTIONS;

  client?: Cliente;
  assignment?: EvaluationAssignment;
  questionnaires: DetailQuestionnaireViewModel[] = [];
  viewMode: DetailViewMode = 'detail';
  selectedQuestionnaireId = '';
  selectedSectionKey = '';
  userName = '';
  userArea = '';
  userEmail?: string;
  userSecondary?: string;
  loadError = '';
  actionMessage = '';
  actionMessageType: 'success' | 'info' | 'warning' | '' = '';

  constructor() {
    this.loadData();
  }

  get selectedQuestionnaire(): DetailQuestionnaireViewModel | undefined {
    return (
      this.questionnaires.find(
        (questionnaire) => questionnaire.entry.questionnaireId === this.selectedQuestionnaireId,
      ) ?? this.questionnaires[0]
    );
  }

  get selectedSection(): AdminSectionViewModel | undefined {
    const questionnaire = this.selectedQuestionnaire;
    if (!questionnaire) {
      return undefined;
    }

    return (
      questionnaire.sections.find((section) => section.key === this.selectedSectionKey) ??
      questionnaire.sections[0]
    );
  }

  get overallStatus(): CompanyEvaluationStatus {
    const statuses = this.questionnaires.map((questionnaire) => questionnaire.status);

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

  get overallStatusLabel(): string {
    return this.resolveStatusLabel(this.overallStatus);
  }

  get isGradingMode(): boolean {
    return this.viewMode === 'grading';
  }

  get canGradeSelectedQuestionnaire(): boolean {
    return this.canEditQuestionnaire(this.selectedQuestionnaire);
  }

  get overallReviewedQuestions(): number {
    return this.questionnaires.reduce(
      (total, questionnaire) => total + questionnaire.reviewSummary.reviewedQuestions,
      0,
    );
  }

  get overallTotalQuestions(): number {
    return this.questionnaires.reduce(
      (total, questionnaire) => total + questionnaire.reviewSummary.totalReviewableQuestions,
      0,
    );
  }

  get overallPendingQuestions(): number {
    return Math.max(0, this.overallTotalQuestions - this.overallReviewedQuestions);
  }

  get overallReviewProgress(): number {
    return this.overallTotalQuestions > 0
      ? this.toPercent((this.overallReviewedQuestions / this.overallTotalQuestions) * 100)
      : 0;
  }

  get overallRequiredSectionsComplete(): number {
    return this.questionnaires.reduce(
      (total, questionnaire) => total + questionnaire.reviewSummary.requiredSectionsComplete,
      0,
    );
  }

  get overallRequiredSectionsTotal(): number {
    return this.questionnaires.reduce(
      (total, questionnaire) => total + questionnaire.reviewSummary.requiredSectionsTotal,
      0,
    );
  }

  get overallOptionalSections(): number {
    return this.questionnaires.reduce(
      (total, questionnaire) => total + questionnaire.reviewSummary.optionalSections,
      0,
    );
  }

  get overallScorePercent(): number | null {
    const applicable = this.questionnaires.filter(
      (questionnaire) =>
        questionnaire.contributes &&
        questionnaire.questionnaireWeight > 0 &&
        questionnaire.reviewSummary.weightedScore !== null,
    );
    const totalWeight = applicable.reduce(
      (sum, questionnaire) => sum + questionnaire.questionnaireWeight,
      0,
    );

    if (totalWeight <= 0) {
      return null;
    }

    const score = applicable.reduce((sum, questionnaire) => {
      return (
        sum +
        questionnaire.questionnaireWeight *
          ((questionnaire.reviewSummary.weightedScore ?? 0) / 100)
      );
    }, 0);

    return this.toPercent((score / totalWeight) * 100);
  }

  get gradedQuestionnairesCount(): number {
    return this.questionnaires.filter((questionnaire) => questionnaire.status === 'GRADED').length;
  }

  get pendingQuestionnairesCount(): number {
    return this.questionnaires.filter((questionnaire) => questionnaire.status === 'PENDING_REVIEW')
      .length;
  }

  get hasPreviousGradingStep(): boolean {
    return this.getCurrentGradingStepIndex() > 0;
  }

  get hasNextGradingStep(): boolean {
    const currentIndex = this.getCurrentGradingStepIndex();
    return currentIndex >= 0 && currentIndex < this.getGradingSteps().length - 1;
  }

  get selectedActionLabel(): string {
    const selected = this.selectedQuestionnaire;
    if (!selected) {
      return 'Abrir cuestionario';
    }

    if (selected.status === 'GRADED') {
      return 'Ver resultados';
    }

    if (selected.latestAttempt?.status === 'SUBMITTED') {
      return 'Ver envio original';
    }

    return 'Abrir cuestionario';
  }

  get selectedActionDisabled(): boolean {
    return (
      !this.selectedQuestionnaire ||
      !this.assignment ||
      !this.client ||
      this.selectedQuestionnaire.status === 'EXPIRED' ||
      this.selectedQuestionnaire.status === 'NOT_STARTED'
    );
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    if (!this.client) {
      this.router.navigate(['/alta-clientes']);
      return;
    }

    this.router.navigate(['/alta-clientes', this.client.id, 'evaluaciones']);
  }

  selectQuestionnaire(questionnaireId: string): void {
    this.selectedQuestionnaireId = questionnaireId;
    const selected = this.selectedQuestionnaire;
    this.selectedSectionKey = selected?.sections[0]?.key ?? '';
    this.clearActionMessage();
  }

  selectSection(sectionKey: string): void {
    this.selectedSectionKey = sectionKey;
  }

  canEditQuestionnaire(questionnaire?: DetailQuestionnaireViewModel): boolean {
    return (
      !!questionnaire &&
      this.isGradingMode &&
      questionnaire.status === 'PENDING_REVIEW' &&
      !questionnaire.reviewSummary.finalizedAt
    );
  }

  openSelectedQuestionnaire(): void {
    const selected = this.selectedQuestionnaire;
    if (!selected || this.selectedActionDisabled || !this.assignment || !this.client) {
      return;
    }

    if (selected.status === 'GRADED' && selected.latestAttempt) {
      this.router.navigate(['/evaluaciones/usuario/resultado', selected.latestAttempt.id]);
      return;
    }

    this.router.navigate(['/evaluaciones/usuario/resolver', this.assignment.id], {
      queryParams: {
        userId: selected.entry.userId,
        questionnaireId: selected.entry.questionnaireId,
        sourceClientId: this.client.id,
      },
    });
  }

  updateQuestionGrade(
    questionnaire: DetailQuestionnaireViewModel,
    question: AdminQuestionViewModel,
    grade: ReviewGrade,
  ): void {
    if (!this.canEditQuestionnaire(questionnaire)) {
      return;
    }

    question.grade = grade;

    if (grade === 'NO_APLICA' && !question.comment.trim()) {
      question.comment = 'Marcada como no aplica para esta revision.';
    }

    this.refreshQuestionnaire(questionnaire);
    this.markQuestionnaireAsDirty(questionnaire);
  }

  updateQuestionComment(
    questionnaire: DetailQuestionnaireViewModel,
    question: AdminQuestionViewModel,
    value: string,
  ): void {
    if (!this.canEditQuestionnaire(questionnaire)) {
      return;
    }

    question.comment = value;
    this.refreshQuestionnaire(questionnaire);
    this.markQuestionnaireAsDirty(questionnaire);
  }

  saveSelectedReview(): void {
    const questionnaire = this.selectedQuestionnaire;
    if (!questionnaire || !this.canEditQuestionnaire(questionnaire)) {
      return;
    }

    const savedAt = new Date().toISOString();
    questionnaire.reviewSummary.savedAt = savedAt;
    questionnaire.reviewSummary.hasDraftChanges = false;
    this.persistQuestionnaireReview(questionnaire);
    this.showActionMessage('success', 'Avance de calificacion guardado en local.');
    this.toastService.show({
      type: 'success',
      message: 'Avance de calificacion guardado.',
      durationMs: 2400,
    });
  }

  finalizeSelectedReview(): void {
    const questionnaire = this.selectedQuestionnaire;
    if (!questionnaire || !this.canEditQuestionnaire(questionnaire) || !questionnaire.reviewSummary.isFinalizable) {
      this.showActionMessage(
        'warning',
        'Completa la revision de todas las preguntas del cuestionario antes de finalizar.',
      );
      return;
    }

    const finalizedAt = new Date().toISOString();
    questionnaire.reviewSummary.savedAt = finalizedAt;
    questionnaire.reviewSummary.finalizedAt = finalizedAt;
    questionnaire.reviewSummary.hasDraftChanges = false;
    questionnaire.status = 'GRADED';
    questionnaire.statusLabel = this.resolveStatusLabel('GRADED');

    if (questionnaire.latestAttempt) {
      questionnaire.latestAttempt = this.repository.saveAttempt({
        ...questionnaire.latestAttempt,
        status: 'SUBMITTED',
        reviewStatus: 'GRADED',
        submittedAt: questionnaire.latestAttempt.submittedAt ?? finalizedAt,
      });
    }

    this.refreshQuestionnaire(questionnaire);
    this.persistQuestionnaireReview(questionnaire);

    if (this.isGradingMode) {
      const nextPendingQuestionnaire = this.questionnaires.find(
        (item) => item.status === 'PENDING_REVIEW',
      );

      if (nextPendingQuestionnaire) {
        this.syncSelection(nextPendingQuestionnaire.entry.questionnaireId);
      } else {
        this.viewMode = 'detail';
        this.syncSelection(questionnaire.entry.questionnaireId, this.selectedSectionKey);
      }
    }

    this.showActionMessage('success', 'Revision finalizada. El cuestionario se marco como calificado.');
    this.toastService.show({
      type: 'success',
      message: 'Revision finalizada y guardada en local.',
      durationMs: 2800,
    });
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

  getReviewStateClass(state: ReviewItemState): string {
    switch (state) {
      case 'REVIEWED':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'IN_REVIEW':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'NOT_APPLICABLE':
        return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
      case 'PENDING':
      default:
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
    }
  }

  getReviewStateLabel(state: ReviewItemState): string {
    switch (state) {
      case 'REVIEWED':
        return 'Calificada';
      case 'IN_REVIEW':
        return 'En revision';
      case 'NOT_APPLICABLE':
        return 'No aplica';
      case 'PENDING':
      default:
        return 'Pendiente';
    }
  }

  getReviewOptionClass(question: AdminQuestionViewModel, option: ReviewGrade): string {
    const isActive = question.grade === option;

    if (option === 'CUMPLE') {
      return isActive
        ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15';
    }

    if (option === 'NO_CUMPLE') {
      return isActive
        ? 'border-rose-500 bg-rose-500 text-white shadow-sm dark:border-rose-400 dark:bg-rose-400 dark:text-slate-950'
        : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15';
    }

    return isActive
      ? 'border-slate-500 bg-slate-500 text-white shadow-sm dark:border-slate-300 dark:bg-slate-200 dark:text-slate-950'
      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
  }

  getQuestionAnswerClass(question: AdminQuestionViewModel): string {
    if (!question.answered) {
      return 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
    }

    return 'border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200';
  }

  getQuestionWeightLabel(question: AdminQuestionViewModel): string {
    return question.contributes && question.weight > 0
      ? `Peso ${this.formatPercent(question.weight)}`
      : 'Sin peso';
  }

  getSectionWeightLabel(section: AdminSectionViewModel): string {
    return section.contributes && section.weight > 0
      ? `${this.formatPercent(section.weight)} del total`
      : 'Sin impacto en score';
  }

  getQuestionTypeLabel(question: Question): string {
    return getQuestionTypeLabel(question);
  }

  getAnsweredQuestionsCount(section?: AdminSectionViewModel): number {
    if (!section) {
      return 0;
    }

    return section.questions.filter((question) => question.answered).length;
  }

  getAnsweredQuestionsProgress(section?: AdminSectionViewModel): number {
    if (!section || section.questions.length === 0) {
      return 0;
    }

    return this.toPercent((this.getAnsweredQuestionsCount(section) / section.questions.length) * 100);
  }

  goToPreviousGradingStep(): void {
    this.moveBetweenGradingSteps(-1);
  }

  goToNextGradingStep(): void {
    this.moveBetweenGradingSteps(1);
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

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Sin score';
    }

    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
  }

  trackByQuestionnaire(_: number, questionnaire: DetailQuestionnaireViewModel): string {
    return questionnaire.entry.questionnaireId;
  }

  trackBySection(_: number, section: AdminSectionViewModel): string {
    return section.key;
  }

  trackByQuestion(_: number, question: AdminQuestionViewModel): string {
    return question.key;
  }

  private loadData(): void {
    const clientId = Number(this.route.snapshot.paramMap.get('id'));
    const assignmentId = this.route.snapshot.paramMap.get('assignmentId');
    const userId = this.route.snapshot.paramMap.get('userId');
    const requestedMode = this.route.snapshot.queryParamMap.get('mode');

    if (!Number.isFinite(clientId) || !assignmentId || !userId) {
      this.loadError = 'No se encontro la evaluacion solicitada.';
      return;
    }

    const client = this.clientsStore.getById(clientId);
    const assignment = this.assignmentsStorage.getById(assignmentId);

    if (!client || !assignment) {
      this.loadError = 'No se encontro la asignacion local seleccionada.';
      return;
    }

    const assignedEntries = assignment.users.filter((entry) => entry.userId === userId);
    if (assignedEntries.length === 0) {
      this.loadError = 'No se encontraron cuestionarios para el usuario seleccionado.';
      return;
    }

    const clientUser = this.clientsStore
      .listUsersByClient(clientId)
      .find((user) => String(user.id) === userId);

    this.client = client;
    this.assignment = assignment;
    this.userName =
      `${clientUser?.nombres ?? ''} ${clientUser?.apellidos ?? ''}`.trim() ||
      assignedEntries[0].userName ||
      `Usuario #${userId}`;
    this.userArea = clientUser?.area || assignedEntries[0].userArea;
    this.userEmail = clientUser?.email || undefined;
    this.userSecondary = clientUser?.telefono || `ID interno ${userId}`;

    this.questionnaires = assignedEntries.map((entry, index) =>
      this.buildQuestionnaireViewModel(entry, assignment, userId, index, assignedEntries.length),
    );

    this.viewMode =
      requestedMode === 'grading' &&
      this.questionnaires.some((questionnaire) => questionnaire.status === 'PENDING_REVIEW')
        ? 'grading'
        : 'detail';

    this.syncSelection();
  }

  private buildQuestionnaireViewModel(
    entry: EvaluationAssignmentUser,
    assignment: EvaluationAssignment,
    userId: string,
    questionnaireIndex: number,
    questionnaireCount: number,
  ): DetailQuestionnaireViewModel {
    const questionnaire = this.repository
      .getQuestionnaires()
      .find((item) => item.id === entry.questionnaireId);
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
    const baseStatus = this.resolveStatus(questionnaire, latestAttempt);
    const questionnaireProfile = this.resolveQuestionnaireProfile(
      assignment.certificationId,
      questionnaire,
      metrics,
      questionnaireIndex,
      questionnaireCount,
    );
    const persistedReview = this.getPersistedQuestionnaireReview(
      assignment.id,
      userId,
      entry.questionnaireId,
    );
    const sections = this.buildSections(
      assignment,
      entry,
      questionnaire,
      latestAttempt,
      baseStatus,
      questionnaireProfile,
    );

    const viewModel: DetailQuestionnaireViewModel = {
      entry,
      questionnaire,
      latestAttempt,
      metrics,
      status: baseStatus,
      statusLabel: this.resolveStatusLabel(baseStatus),
      questionnaireWeight: questionnaireProfile.weight,
      contributes: questionnaireProfile.contributes,
      isRequired: questionnaireProfile.isRequired,
      sections,
      reviewSummary: {
        reviewedQuestions: 0,
        totalReviewableQuestions: 0,
        pendingQuestions: 0,
        progressPercent: 0,
        weightedScore: null,
        requiredSectionsComplete: 0,
        requiredSectionsTotal: 0,
        optionalSections: 0,
        isFinalizable: false,
        savedAt: persistedReview?.savedAt,
        finalizedAt:
          persistedReview?.finalizedAt ??
          (baseStatus === 'GRADED' ? latestAttempt?.submittedAt : undefined),
        hasDraftChanges: false,
      },
    };

    this.refreshQuestionnaire(viewModel);
    return viewModel;
  }

  private buildSections(
    assignment: EvaluationAssignment,
    entry: EvaluationAssignmentUser,
    questionnaire: Questionnaire | undefined,
    latestAttempt: Attempt | undefined,
    baseStatus: CompanyEvaluationStatus,
    questionnaireProfile: WeightProfile,
  ): AdminSectionViewModel[] {
    if (!questionnaire) {
      return [];
    }

    const questionsCatalog = this.repository.getQuestions();
    const allSections = this.demoService.getSectionsForQuestionnaire(questionnaire.id);
    const allQuestions = allSections.flatMap((section) =>
      section.questionIds
        .map((questionId) => questionsCatalog.find((question) => question.id === questionId))
        .filter((question): question is Question => !!question),
    );
    const attemptState = latestAttempt
      ? this.demoService.getAttemptState(latestAttempt.id, allQuestions)
      : {};
    const answersByQuestionId = new Map(
      (latestAttempt?.answers ?? []).map((answer) => [answer.questionId, answer]),
    );
    const persistedReview = this.getPersistedQuestionnaireReview(
      assignment.id,
      entry.userId,
      entry.questionnaireId,
    );

    let globalQuestionIndex = 0;

    return allSections.map((section, sectionIndex) => {
      const sectionProfile = this.resolveSectionProfile(
        questionnaire.id,
        section,
        sectionIndex,
        allSections.length,
        questionnaireProfile,
      );
      const sectionQuestions = section.questionIds
        .map((questionId) => questionsCatalog.find((question) => question.id === questionId))
        .filter((question): question is Question => !!question);

      const questions = sectionQuestions.map((question) => {
        const questionProfile = this.resolveQuestionProfile(
          section,
          question,
          sectionQuestions,
          sectionProfile,
        );
        const answered = attemptState[question.id]?.answered ?? false;
        const correct = attemptState[question.id]?.correct ?? false;
        const persistedQuestion = persistedReview?.questions[question.id];
        const seedReview = this.createSeedReview(
          baseStatus,
          question,
          answered,
          correct,
          globalQuestionIndex,
        );

        globalQuestionIndex += 1;

        const grade = this.normalizeStoredGrade(persistedQuestion?.grade) ?? seedReview.grade;
        const comment = persistedQuestion?.comment ?? seedReview.comment;

        return {
          key: `${questionnaire.id}::${section.id}::${question.id}`,
          question,
          answer: answersByQuestionId.get(question.id),
          answerLines: this.formatAnswerLines(question, answersByQuestionId.get(question.id)),
          answered,
          weight: questionProfile.weight,
          contributes: questionProfile.contributes,
          isRequired: questionProfile.isRequired,
          grade,
          comment,
          state: this.resolveQuestionState(grade, comment),
        };
      });

      return {
        key: `${questionnaire.id}::${section.id}`,
        section,
        weight: sectionProfile.weight,
        contributes: sectionProfile.contributes,
        isRequired: sectionProfile.isRequired,
        questions,
        reviewedCount: 0,
        totalReviewableQuestions: 0,
        pendingCount: 0,
        progressPercent: 0,
        scorePercent: null,
        state: 'PENDING',
      };
    });
  }

  private resolveQuestionnaireProfile(
    certificationId: string,
    questionnaire: Questionnaire | undefined,
    metrics: DemoAttemptMetrics,
    questionnaireIndex: number,
    questionnaireCount: number,
  ): WeightProfile {
    if (!questionnaire) {
      return { weight: 0, isRequired: false, contributes: false };
    }

    const certificationWeights = this.weightsStorage.getCertificationWeight(certificationId);
    const weightedQuestionnaire = certificationWeights?.questionnaires.find(
      (item) => item.questionnaireId === questionnaire.id,
    );

    if (weightedQuestionnaire) {
      const contributes =
        !!certificationWeights?.isScored && !!weightedQuestionnaire.isScored;

      return {
        weight: contributes ? this.toPercent(weightedQuestionnaire.weight) : 0,
        isRequired: !!weightedQuestionnaire.isScored,
        contributes,
      };
    }

    if (!metrics.isScored) {
      return { weight: 0, isRequired: false, contributes: false };
    }

    return {
      weight: this.toPercent(100 / Math.max(1, questionnaireCount)),
      isRequired: questionnaireIndex < Math.max(1, questionnaireCount),
      contributes: true,
    };
  }

  private resolveSectionProfile(
    questionnaireId: string,
    section: Section,
    sectionIndex: number,
    sectionCount: number,
    questionnaireProfile: WeightProfile,
  ): WeightProfile {
    const questionnaireWeights = this.weightsStorage.getQuestionnaireWeight(questionnaireId);
    const weightedSection = questionnaireWeights?.sections.find(
      (item) => item.sectionId === section.id,
    );

    if (weightedSection) {
      return {
        weight:
          questionnaireProfile.contributes && weightedSection.isScored
            ? this.toPercent(weightedSection.weight)
            : 0,
        isRequired: !!weightedSection.isScored,
        contributes: questionnaireProfile.contributes && !!weightedSection.isScored,
      };
    }

    if (!questionnaireProfile.contributes) {
      return {
        weight: 0,
        isRequired: sectionIndex === 0,
        contributes: false,
      };
    }

    const defaultWeightsByCount: Record<number, number[]> = {
      1: [100],
      2: [65, 35],
      3: [45, 35, 20],
      4: [35, 25, 25, 15],
    };
    const defaults =
      defaultWeightsByCount[sectionCount] ??
      Array.from({ length: sectionCount }, () => 100 / Math.max(1, sectionCount));

    return {
      weight: this.toPercent(defaults[sectionIndex] ?? defaults[defaults.length - 1] ?? 0),
      isRequired: sectionIndex < Math.max(1, sectionCount - 1),
      contributes: true,
    };
  }

  private resolveQuestionProfile(
    section: Section,
    question: Question,
    sectionQuestions: Question[],
    sectionProfile: WeightProfile,
  ): WeightProfile {
    const sectionWeights = this.weightsStorage.getSectionWeight(section.id);
    const weightedQuestion = sectionWeights?.questions.find(
      (item) => item.questionId === question.id,
    );

    if (weightedQuestion) {
      return {
        weight:
          sectionProfile.contributes && weightedQuestion.isScored
            ? this.toPercent(weightedQuestion.weight)
            : 0,
        isRequired: question.obligatoria && sectionProfile.isRequired,
        contributes: sectionProfile.contributes && !!weightedQuestion.isScored,
      };
    }

    if (!sectionProfile.contributes) {
      return {
        weight: 0,
        isRequired: question.obligatoria && sectionProfile.isRequired,
        contributes: false,
      };
    }

    const scoredQuestions = sectionQuestions.filter(
      (item) => item.obligatoria || item.tipo !== 'FILE',
    );
    const contributes = scoredQuestions.some((item) => item.id === question.id);

    return {
      weight: contributes
        ? this.toPercent(sectionProfile.weight / Math.max(1, scoredQuestions.length))
        : 0,
      isRequired: question.obligatoria && sectionProfile.isRequired,
      contributes,
    };
  }

  private refreshQuestionnaire(questionnaire: DetailQuestionnaireViewModel): void {
    questionnaire.sections = questionnaire.sections.map((section) =>
      this.refreshSectionMetrics(section),
    );

    const reviewedQuestions = questionnaire.sections.reduce(
      (sum, section) => sum + section.reviewedCount,
      0,
    );
    const totalQuestions = questionnaire.sections.reduce(
      (sum, section) => sum + section.totalReviewableQuestions,
      0,
    );
    const pendingQuestions = Math.max(0, totalQuestions - reviewedQuestions);
    const requiredSections = questionnaire.sections.filter((section) => section.isRequired);
    const requiredSectionsComplete = requiredSections.filter(
      (section) => section.pendingCount === 0,
    ).length;

    questionnaire.reviewSummary = {
      ...questionnaire.reviewSummary,
      reviewedQuestions,
      totalReviewableQuestions: totalQuestions,
      pendingQuestions,
      progressPercent:
        totalQuestions > 0 ? this.toPercent((reviewedQuestions / totalQuestions) * 100) : 0,
      weightedScore: this.calculateQuestionnaireScore(questionnaire),
      requiredSectionsComplete,
      requiredSectionsTotal: requiredSections.length,
      optionalSections: questionnaire.sections.filter((section) => !section.isRequired).length,
      isFinalizable:
        questionnaire.status !== 'EXPIRED' &&
        questionnaire.status !== 'NOT_STARTED' &&
        questionnaire.status !== 'IN_PROGRESS' &&
        pendingQuestions === 0 &&
        totalQuestions > 0 &&
        !questionnaire.reviewSummary.finalizedAt,
    };

    questionnaire.status =
      questionnaire.reviewSummary.finalizedAt || questionnaire.latestAttempt?.reviewStatus === 'GRADED'
        ? 'GRADED'
        : this.resolveStatus(questionnaire.questionnaire, questionnaire.latestAttempt);
    questionnaire.statusLabel = this.resolveStatusLabel(questionnaire.status);
  }

  private refreshSectionMetrics(section: AdminSectionViewModel): AdminSectionViewModel {
    section.questions = section.questions.map((question) => ({
      ...question,
      state: this.resolveQuestionState(question.grade, question.comment),
    }));

    const reviewedCount = section.questions.filter((question) => question.grade !== null).length;
    const totalReviewableQuestions = section.questions.length;
    const pendingCount = Math.max(0, totalReviewableQuestions - reviewedCount);

    section.reviewedCount = reviewedCount;
    section.totalReviewableQuestions = totalReviewableQuestions;
    section.pendingCount = pendingCount;
    section.progressPercent =
      totalReviewableQuestions > 0
        ? this.toPercent((reviewedCount / totalReviewableQuestions) * 100)
        : 0;
    section.scorePercent = this.calculateSectionScore(section);
    section.state = this.resolveSectionState(section);

    return section;
  }

  private calculateQuestionnaireScore(
    questionnaire: DetailQuestionnaireViewModel,
  ): number | null {
    const applicableSections = questionnaire.sections.filter(
      (section) => section.contributes && section.weight > 0 && section.scorePercent !== null,
    );
    const totalWeight = applicableSections.reduce((sum, section) => sum + section.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    const score = applicableSections.reduce((sum, section) => {
      return sum + section.weight * ((section.scorePercent ?? 0) / 100);
    }, 0);

    return this.toPercent((score / totalWeight) * 100);
  }

  private calculateSectionScore(section: AdminSectionViewModel): number | null {
    const applicableQuestions = section.questions.filter(
      (question) => question.contributes && question.weight > 0 && question.grade !== 'NO_APLICA',
    );
    const totalWeight = applicableQuestions.reduce((sum, question) => sum + question.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    const score = applicableQuestions.reduce((sum, question) => {
      const gradeValue = this.getGradeNumericValue(question.grade);
      return sum + question.weight * (gradeValue ?? 0);
    }, 0);

    return this.toPercent((score / totalWeight) * 100);
  }

  private getGradeNumericValue(grade: ReviewGrade | null): number | null {
    if (!grade) {
      return 0;
    }

    return REVIEW_SCORES[grade];
  }

  private resolveQuestionState(
    grade: ReviewGrade | null,
    comment: string,
  ): ReviewItemState {
    if (grade === 'NO_APLICA') {
      return 'NOT_APPLICABLE';
    }

    if (grade !== null) {
      return 'REVIEWED';
    }

    if (comment.trim()) {
      return 'IN_REVIEW';
    }

    return 'PENDING';
  }

  private resolveSectionState(section: AdminSectionViewModel): ReviewItemState {
    if (section.totalReviewableQuestions === 0) {
      return 'NOT_APPLICABLE';
    }

    if (section.reviewedCount === 0) {
      return 'PENDING';
    }

    if (section.pendingCount === 0) {
      return 'REVIEWED';
    }

    return 'IN_REVIEW';
  }

  private markQuestionnaireAsDirty(questionnaire: DetailQuestionnaireViewModel): void {
    questionnaire.reviewSummary.hasDraftChanges = true;
    this.showActionMessage('info', 'Hay cambios locales pendientes de guardar.');
  }

  private syncSelection(
    preferredQuestionnaireId?: string,
    preferredSectionKey?: string,
  ): void {
    const preferredQuestionnaire = this.questionnaires.find(
      (questionnaire) => questionnaire.entry.questionnaireId === preferredQuestionnaireId,
    );
    const fallbackQuestionnaire =
      (this.isGradingMode
        ? this.questionnaires.find((questionnaire) => questionnaire.status === 'PENDING_REVIEW')
        : undefined) ?? this.questionnaires[0];
    const nextQuestionnaire = preferredQuestionnaire ?? fallbackQuestionnaire;

    this.selectedQuestionnaireId = nextQuestionnaire?.entry.questionnaireId ?? '';
    this.selectedSectionKey =
      nextQuestionnaire?.sections.find((section) => section.key === preferredSectionKey)?.key ??
      nextQuestionnaire?.sections[0]?.key ??
      '';
  }

  private moveBetweenGradingSteps(offset: -1 | 1): void {
    if (!this.canGradeSelectedQuestionnaire) {
      return;
    }

    const steps = this.getGradingSteps();
    const currentIndex = this.getCurrentGradingStepIndex();
    const nextStep = steps[currentIndex + offset];

    if (!nextStep) {
      return;
    }

    this.syncSelection(nextStep.questionnaireId, nextStep.sectionKey);
  }

  private getCurrentGradingStepIndex(): number {
    return this.getGradingSteps().findIndex(
      (step) =>
        step.questionnaireId === this.selectedQuestionnaireId &&
        step.sectionKey === this.selectedSectionKey,
    );
  }

  private getGradingSteps(): Array<{ questionnaireId: string; sectionKey: string }> {
    return this.questionnaires
      .filter((questionnaire) => questionnaire.status === 'PENDING_REVIEW')
      .flatMap((questionnaire) =>
        questionnaire.sections.map((section) => ({
          questionnaireId: questionnaire.entry.questionnaireId,
          sectionKey: section.key,
        })),
      );
  }

  private createSeedReview(
    status: CompanyEvaluationStatus,
    question: Question,
    answered: boolean,
    correct: boolean,
    questionIndex: number,
  ): PersistedQuestionReview {
    if (status === 'GRADED') {
      if (!answered && !question.obligatoria) {
        return {
          grade: 'NO_APLICA',
          comment: 'No era evidencia obligatoria para este mock.',
        };
      }

      return {
        grade: answered ? (correct ? 'CUMPLE' : 'NO_CUMPLE') : 'NO_CUMPLE',
        comment: correct
          ? 'Revision recuperada desde el ejemplo local.'
          : 'Respuesta cerrada con observacion mock local.',
      };
    }

    if (status === 'PENDING_REVIEW') {
      if (question.tipo === 'FILE' && !question.obligatoria) {
        return {
          grade: 'NO_APLICA',
          comment: 'Evidencia opcional; no impacta en este ejercicio.',
        };
      }

      if (questionIndex === 0 && answered) {
        return {
          grade: 'CUMPLE',
          comment: 'Respuesta consistente con el criterio esperado.',
        };
      }

      if (questionIndex === 1 && answered) {
        return {
          grade: 'NO_CUMPLE',
          comment: 'Se requiere ajuste o evidencia adicional para cumplir.',
        };
      }
    }

    return {
      grade: null,
      comment: '',
    };
  }

  private formatAnswerLines(question: Question, answer?: Answer): string[] {
    if (!answer) {
      return ['Sin respuesta registrada por el usuario.'];
    }

    const value = answer.value;

    if (
      question.tipo === 'MULTIPLE' ||
      question.tipo === 'MULTIPLE_SELECT' ||
      question.tipo === 'RANKING'
    ) {
      const options = 'opciones' in question.config ? question.config.opciones : [];
      const ids = Array.isArray(value) ? value : [];
      const labels = ids
        .map((id) => options.find((option) => option.id === id)?.texto ?? id)
        .filter((item) => item.trim().length > 0);

      return labels.length > 0 ? labels : ['Sin seleccion registrada.'];
    }

    if (question.tipo === 'TEXT') {
      return typeof value === 'string' && value.trim() ? [value.trim()] : ['Sin texto capturado.'];
    }

    if (question.tipo === 'FILE') {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !('fileName' in value)) {
        return ['Sin evidencia adjunta.'];
      }

      return [
        `Archivo: ${value.fileName}`,
        `Tipo: ${value.fileType}`,
        `Tamano: ${this.formatFileSize(value.fileSize)}`,
      ];
    }

    if (question.tipo === 'MIXTA') {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !('selectedOptionIds' in value)
      ) {
        return ['Sin seleccion registrada.'];
      }

      const options = 'opciones' in question.config ? question.config.opciones : [];
      const labels = value.selectedOptionIds
        .map((id) => options.find((option) => option.id === id)?.texto ?? id)
        .filter((item) => item.trim().length > 0);

      if (value.otherText?.trim()) {
        labels.push(`Otro: ${value.otherText.trim()}`);
      }

      return labels.length > 0 ? labels : ['Sin seleccion registrada.'];
    }

    if (question.tipo === 'DICOTOMICA') {
      if (typeof value !== 'boolean') {
        return ['Sin respuesta registrada.'];
      }

      const trueLabel = 'trueLabel' in question.config ? question.config.trueLabel || 'Si' : 'Si';
      const falseLabel =
        'falseLabel' in question.config ? question.config.falseLabel || 'No' : 'No';
      return [value ? trueLabel : falseLabel];
    }

    if (question.tipo === 'NUMERIC_SCALE') {
      return typeof value === 'number' ? [`Valor capturado: ${value}`] : ['Sin valor numerico.'];
    }

    if (question.tipo === 'LIKERT' || question.tipo === 'NOMINAL_SCALE') {
      return typeof value === 'string' && value.trim() ? [value.trim()] : ['Sin respuesta registrada.'];
    }

    if (question.tipo === 'FILTER') {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !('selectedValue' in value)
      ) {
        return ['Sin respuesta registrada.'];
      }

      const options = 'opciones' in question.config ? question.config.opciones : [];
      const selected =
        options.find((option) => option.id === value.selectedValue)?.texto ?? value.selectedValue;
      const extra: string[] = [`Seleccion: ${selected}`];

      if (value.matchedRule?.goToQuestionId) {
        extra.push(`Regla: dirige a ${value.matchedRule.goToQuestionId}`);
      }

      if (value.matchedRule?.endQuiz) {
        extra.push('Regla: finaliza cuestionario');
      }

      return extra;
    }

    return ['Sin respuesta registrada.'];
  }

  private getPersistedQuestionnaireReview(
    assignmentId: string,
    userId: string,
    questionnaireId: string,
  ): PersistedQuestionnaireReview | undefined {
    const store = this.readReviewStore();
    return store[this.buildReviewKey(assignmentId, userId, questionnaireId)];
  }

  private persistQuestionnaireReview(questionnaire: DetailQuestionnaireViewModel): void {
    if (!this.assignment) {
      return;
    }

    const store = this.readReviewStore();
    store[
      this.buildReviewKey(
        this.assignment.id,
        questionnaire.entry.userId,
        questionnaire.entry.questionnaireId,
      )
    ] = {
      savedAt: questionnaire.reviewSummary.savedAt,
      finalizedAt: questionnaire.reviewSummary.finalizedAt,
      questions: questionnaire.sections.flatMap((section) => section.questions).reduce(
        (acc, question) => {
          acc[question.question.id] = {
            grade: question.grade,
            comment: question.comment,
          };
          return acc;
        },
        {} as Record<string, PersistedQuestionReview>,
      ),
    };

    localStorage.setItem(this.reviewStorageKey, JSON.stringify(store));
  }

  private readReviewStore(): Record<string, PersistedQuestionnaireReview> {
    const raw = localStorage.getItem(this.reviewStorageKey);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return parsed as Record<string, PersistedQuestionnaireReview>;
    } catch {
      return {};
    }
  }

  private buildReviewKey(
    assignmentId: string,
    userId: string,
    questionnaireId: string,
  ): string {
    return `${assignmentId}::${userId}::${questionnaireId}`;
  }

  private showActionMessage(
    type: 'success' | 'info' | 'warning',
    message: string,
  ): void {
    this.actionMessageType = type;
    this.actionMessage = message;
  }

  private clearActionMessage(): void {
    this.actionMessage = '';
    this.actionMessageType = '';
  }

  private normalizeStoredGrade(grade: unknown): ReviewGrade | null {
    return grade === 'CUMPLE' || grade === 'NO_CUMPLE' || grade === 'NO_APLICA'
      ? grade
      : null;
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

  private formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 KB';
    }

    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private toPercent(value: number): number {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(Math.max(0, Math.min(100, safe)) * 100) / 100;
  }
}

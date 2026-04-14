import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  LucideAngularModule,
  Menu,
  Send,
} from 'lucide-angular';
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
} from '../../models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../services/assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import { UserEvaluationsDemoService } from '../../services/user-evaluations-demo.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { QuestionDicotomicaComponent } from '../../components/questions/question-dicotomica/question-dicotomica.component';
import { QuestionFileComponent } from '../../components/questions/question-file/question-file.component';
import { QuestionFilterComponent } from '../../components/questions/question-filter/question-filter.component';
import { QuestionLikertComponent } from '../../components/questions/question-likert/question-likert.component';
import { QuestionMixtaComponent } from '../../components/questions/question-mixta/question-mixta.component';
import { QuestionMultipleComponent } from '../../components/questions/question-multiple/question-multiple.component';
import { QuestionMultipleSelectComponent } from '../../components/questions/question-multiple-select/question-multiple-select.component';
import { QuestionNominalScaleComponent } from '../../components/questions/question-nominal-scale/question-nominal-scale.component';
import { QuestionNumericScaleComponent } from '../../components/questions/question-numeric-scale/question-numeric-scale.component';
import { QuestionRankingComponent } from '../../components/questions/question-ranking/question-ranking.component';
import { QuestionTextComponent } from '../../components/questions/question-text/question-text.component';
import { ClientsStoreService } from '../../../../pages/alta-clientes/clients-store.service';
import { SessionRoleService } from '../../../../core/services/session-role.service';

interface RuntimeSection {
  section: Section;
  questions: Question[];
}

interface ProgressSnapshot {
  answers: Record<string, unknown>;
  currentSectionIndex: number;
  savedAt: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  answeredCount: number;
  finishedAt?: string;
}

type ResolverQuestionnaireStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'GRADED'
  | 'EXPIRED';

interface ResolverQuestionnaireItem {
  entry: EvaluationAssignmentUser;
  questionnaire: Questionnaire;
  latestAttempt?: Attempt;
  runtimeSections: RuntimeSection[];
  status: ResolverQuestionnaireStatus;
  statusLabel: string;
}

@Component({
  selector: 'app-usuario-resolver',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    QuestionDicotomicaComponent,
    QuestionMultipleComponent,
    QuestionMultipleSelectComponent,
    QuestionTextComponent,
    QuestionFileComponent,
    QuestionMixtaComponent,
    QuestionRankingComponent,
    QuestionLikertComponent,
    QuestionNumericScaleComponent,
    QuestionNominalScaleComponent,
    QuestionFilterComponent,
  ],
  templateUrl: './usuario-resolver.component.html',
})
export class UsuarioResolverComponent implements OnDestroy {
  readonly BadgeCheck = BadgeCheck;
  readonly ClipboardCheck = ClipboardCheck;
  readonly Clock3 = Clock3;
  readonly Menu = Menu;
  readonly CheckCircle2 = CheckCircle2;
  readonly Circle = Circle;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Send = Send;

  assignment?: EvaluationAssignment;
  assignedUser?: EvaluationAssignmentUser;
  questionnaire?: Questionnaire;
  certification?: Certification;
  attempt?: Attempt;
  assignedQuestionnaires: ResolverQuestionnaireItem[] = [];
  currentQuestionnaireId = '';
  runtimeSections: RuntimeSection[] = [];
  currentSectionIndex = 0;
  answerForm: FormGroup<Record<string, FormControl<unknown>>> = new FormGroup({});
  remainingSeconds: number | null = null;
  loadError = '';
  isSubmitting = false;
  showMobileSidebar = false;
  lastSavedAt?: Date;
  showErrors = false;

  private readonly destroy$ = new Subject<void>();
  private readonly restoredAnsweredQuestionIds = new Set<string>();
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private sourceClientId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly demoService: UserEvaluationsDemoService,
    private readonly clientsStore: ClientsStoreService,
    private readonly sessionRoleService: SessionRoleService,
    private readonly toastService: ToastService,
  ) {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCountdown();
  }

  get currentSection(): RuntimeSection | undefined {
    return this.runtimeSections[this.currentSectionIndex];
  }

  get currentQuestionnaireItem(): ResolverQuestionnaireItem | undefined {
    return this.assignedQuestionnaires.find(
      (item) => item.entry.questionnaireId === this.currentQuestionnaireId,
    );
  }

  get totalQuestions(): number {
    return this.getAllQuestions().length;
  }

  get answeredCount(): number {
    return this.getAllQuestions().filter((question) => this.isQuestionAnswered(question)).length;
  }

  get progressPercent(): number {
    if (this.totalQuestions === 0) {
      return 0;
    }

    return this.toPercent((this.answeredCount / this.totalQuestions) * 100);
  }

  get questionnaireIsScored(): boolean {
    return this.passScore !== null;
  }

  get passScore(): number | null {
    if (typeof this.questionnaire?.settings.passScore === 'number') {
      return this.questionnaire.settings.passScore;
    }

    return this.certification?.rules.minScore ?? null;
  }

  get currentSectionAnsweredCount(): number {
    return this.getSectionAnsweredCount(this.currentSectionIndex);
  }

  get currentSectionTotalQuestions(): number {
    return this.runtimeSections[this.currentSectionIndex]?.questions.length ?? 0;
  }

  get canGoPrev(): boolean {
    return this.currentSectionIndex > 0;
  }

  get canGoNext(): boolean {
    return this.currentSectionIndex < this.runtimeSections.length - 1;
  }

  get canSubmit(): boolean {
    return !!this.attempt && this.answeredCount > 0 && !this.isTimeOver;
  }

  get isTimeOver(): boolean {
    return this.remainingSeconds !== null && this.remainingSeconds <= 0;
  }

  get formattedRemainingTime(): string {
    if (this.remainingSeconds === null) {
      return 'Sin limite';
    }

    const total = Math.max(0, this.remainingSeconds);
    const minutes = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  get saveIndicator(): string {
    if (!this.lastSavedAt) {
      return 'Guardado local automatico';
    }

    return `Guardado ${new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(this.lastSavedAt)}`;
  }

  toggleMobileSidebar(): void {
    this.showMobileSidebar = !this.showMobileSidebar;
  }

  setSection(index: number): void {
    if (index < 0 || index >= this.runtimeSections.length) {
      return;
    }

    this.currentSectionIndex = index;
    this.showMobileSidebar = false;
    this.persistProgressSnapshot('IN_PROGRESS');
    this.scrollToTop();
  }

  goPrev(): void {
    if (!this.canGoPrev) {
      return;
    }

    this.currentSectionIndex -= 1;
    this.persistProgressSnapshot('IN_PROGRESS');
    this.scrollToTop();
  }

  goNext(): void {
    if (!this.canGoNext) {
      return;
    }

    this.currentSectionIndex += 1;
    this.persistProgressSnapshot('IN_PROGRESS');
    this.scrollToTop();
  }

  isSectionCompleted(index: number): boolean {
    const total = this.runtimeSections[index]?.questions.length ?? 0;
    return total > 0 && this.getSectionAnsweredCount(index) === total;
  }

  getSectionAnsweredCount(index: number): number {
    const section = this.runtimeSections[index];
    if (!section) {
      return 0;
    }

    return section.questions.filter((question) => this.isQuestionAnswered(question)).length;
  }

  getSectionProgressPercent(index: number): number {
    const total = this.runtimeSections[index]?.questions.length ?? 0;
    if (total === 0) {
      return 0;
    }

    return this.toPercent((this.getSectionAnsweredCount(index) / total) * 100);
  }

  getQuestionnaireStatusClass(item: ResolverQuestionnaireItem): string {
    switch (item.status) {
      case 'IN_PROGRESS':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'PENDING_REVIEW':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'GRADED':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'EXPIRED':
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
      case 'NOT_STARTED':
      default:
        return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
    }
  }

  getQuestionnaireProgressPercent(item: ResolverQuestionnaireItem): number {
    if (item.entry.questionnaireId === this.currentQuestionnaireId) {
      return this.progressPercent;
    }

    const totalQuestions = item.runtimeSections.reduce(
      (sum, section) => sum + section.questions.length,
      0,
    );
    if (totalQuestions === 0) {
      return 0;
    }

    const answeredCount =
      item.latestAttempt?.answers.filter((answer) =>
        this.hasStoredAnswerValue(
          answer.value,
          item.runtimeSections.flatMap((section) => section.questions).find((question) => question.id === answer.questionId),
        ),
      ).length ?? 0;

    return this.toPercent((answeredCount / totalQuestions) * 100);
  }

  getQuestionnaireAnsweredCount(item: ResolverQuestionnaireItem): number {
    if (item.entry.questionnaireId === this.currentQuestionnaireId) {
      return this.answeredCount;
    }

    return item.latestAttempt?.answers.filter((answer) =>
      this.hasStoredAnswerValue(
        answer.value,
        item.runtimeSections.flatMap((section) => section.questions).find((question) => question.id === answer.questionId),
      ),
    ).length ?? 0;
  }

  getQuestionnaireTotalQuestions(item: ResolverQuestionnaireItem): number {
    if (item.entry.questionnaireId === this.currentQuestionnaireId) {
      return this.totalQuestions;
    }

    return item.runtimeSections.reduce((sum, section) => sum + section.questions.length, 0);
  }

  getQuestionnaireSectionAnsweredCount(
    item: ResolverQuestionnaireItem,
    index: number,
  ): number {
    if (item.entry.questionnaireId === this.currentQuestionnaireId) {
      return this.getSectionAnsweredCount(index);
    }

    const section = item.runtimeSections[index];
    if (!section || !item.latestAttempt) {
      return 0;
    }

    const answersByQuestionId = new Map(
      item.latestAttempt.answers.map((answer) => [answer.questionId, answer]),
    );
    return section.questions.filter((question) =>
      this.hasStoredAnswerValue(answersByQuestionId.get(question.id)?.value, question),
    ).length;
  }

  getQuestionnaireSectionProgressPercent(
    item: ResolverQuestionnaireItem,
    index: number,
  ): number {
    const total = item.runtimeSections[index]?.questions.length ?? 0;
    if (total === 0) {
      return 0;
    }

    return this.toPercent(
      (this.getQuestionnaireSectionAnsweredCount(item, index) / total) * 100,
    );
  }

  getControlName(questionId: string): string {
    return `q_${questionId}`;
  }

  getQuestionType(question: Question): Question['tipo'] {
    return question.tipo;
  }

  getControl(questionId: string): FormControl<unknown> {
    return this.answerForm.controls[this.getControlName(questionId)] as FormControl<unknown>;
  }

  getMultipleControl(questionId: string): FormControl<string[] | null> {
    return this.getControl(questionId) as FormControl<string[] | null>;
  }

  getTextControl(questionId: string): FormControl<string | null> {
    return this.getControl(questionId) as FormControl<string | null>;
  }

  getFileControl(questionId: string): FormControl<FileAnswerValue | null> {
    return this.getControl(questionId) as FormControl<FileAnswerValue | null>;
  }

  getMixtaControl(questionId: string): FormControl<MixtaAnswerValue | null> {
    return this.getControl(questionId) as FormControl<MixtaAnswerValue | null>;
  }

  getDicotomicaControl(questionId: string): FormControl<boolean | null> {
    return this.getControl(questionId) as FormControl<boolean | null>;
  }

  getMultipleSelectControl(questionId: string): FormControl<string[] | null> {
    return this.getControl(questionId) as FormControl<string[] | null>;
  }

  getRankingControl(questionId: string): FormControl<string[] | null> {
    return this.getControl(questionId) as FormControl<string[] | null>;
  }

  getLikertControl(questionId: string): FormControl<string | null> {
    return this.getControl(questionId) as FormControl<string | null>;
  }

  getNumericScaleControl(questionId: string): FormControl<number | null> {
    return this.getControl(questionId) as FormControl<number | null>;
  }

  getNominalScaleControl(questionId: string): FormControl<string | null> {
    return this.getControl(questionId) as FormControl<string | null>;
  }

  getFilterControl(questionId: string): FormControl<string | null> {
    return this.getControl(questionId) as FormControl<string | null>;
  }

  submit(): void {
    if (!this.attempt || this.isSubmitting) {
      return;
    }

    this.showErrors = true;

    if (this.answeredCount === 0) {
      this.toastService.show({
        type: 'warning',
        message: 'Debes responder al menos 1 pregunta para enviar.',
        durationMs: 3000,
      });
      return;
    }

    if (this.isTimeOver) {
      this.toastService.show({
        type: 'warning',
        message: 'El tiempo de la evaluacion ya termino.',
        durationMs: 3000,
      });
      return;
    }

    this.isSubmitting = true;
    const submitted = this.repository.submitAttempt(
      this.attempt.id,
      this.collectAnswers(),
      'PENDING_REVIEW',
    );
    this.isSubmitting = false;

    if (!submitted) {
      return;
    }

    this.attempt = submitted;
    this.persistProgressSnapshot('SUBMITTED', submitted.submittedAt);
    this.clearCountdown();
    this.router.navigate(['/evaluaciones/usuario/envio', submitted.id]);
  }

  goBack(): void {
    if (this.sourceClientId && this.assignment && this.assignedUser) {
      this.router.navigate([
        '/alta-clientes',
        this.sourceClientId,
        'evaluaciones',
        this.assignment.id,
        'usuarios',
        this.assignedUser.userId,
      ]);
      return;
    }

    this.router.navigate(['/evaluaciones/usuario/mis-evaluaciones']);
  }

  formatDate(value?: string, includeTime = false): string {
    if (!value) {
      return 'Sin expiracion';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' as const } : {}),
    }).format(new Date(value));
  }

  private initialize(): void {
    const assignmentId = this.route.snapshot.paramMap.get('assignmentId');
    const requestedUserId = this.route.snapshot.queryParamMap.get('userId');
    const requestedQuestionnaireId =
      this.route.snapshot.queryParamMap.get('questionnaireId');
    this.sourceClientId = this.route.snapshot.queryParamMap.get('sourceClientId');

    if (!assignmentId) {
      this.loadError = 'No se encontro la asignacion solicitada.';
      return;
    }

    const assignment = this.assignmentsStorage.getById(assignmentId);
    if (!assignment) {
      this.loadError = 'La asignacion no existe.';
      return;
    }

    const assignedEntries = requestedUserId
      ? assignment.users.filter((item) => item.userId === requestedUserId)
      : this.resolveCurrentAssignedEntries(assignment);

    if (assignedEntries.length === 0) {
      this.loadError = 'No existe un cuestionario asignado para el usuario actual.';
      return;
    }

    const questionnairesById = new Map(
      this.repository.getQuestionnaires().map((item) => [item.id, item]),
    );
    const questionnaireItems = assignedEntries
      .map<ResolverQuestionnaireItem | null>((entry) => {
        const questionnaire = questionnairesById.get(entry.questionnaireId);
        if (!questionnaire) {
          return null;
        }

        const latestAttempt = this.repository.getLatestAttemptForAssignment(
          assignment.id,
          entry.userId,
          entry.questionnaireId,
        );
        const status = this.resolveQuestionnaireStatus(questionnaire, latestAttempt);

        return {
          entry,
          questionnaire,
          latestAttempt,
          runtimeSections: this.buildRuntimeSections(questionnaire.sectionIds),
          status,
          statusLabel: this.resolveQuestionnaireStatusLabel(status),
        };
      })
      .filter((item): item is ResolverQuestionnaireItem => !!item);

    if (questionnaireItems.length === 0) {
      this.loadError = 'No se encontro un cuestionario valido en la asignacion.';
      return;
    }

    const currentItem =
      questionnaireItems.find(
        (item) => item.entry.questionnaireId === requestedQuestionnaireId,
      ) ?? questionnaireItems[0];

    if (this.demoService.isExpired(currentItem.questionnaire)) {
      this.loadError = 'Esta evaluacion ya expiro y no puede contestarse.';
      return;
    }

    const inProgressAttempt = this.repository.getInProgressAttempt(
      assignment.id,
      currentItem.entry.userId,
      currentItem.entry.questionnaireId,
    );
    const latestAttempt = this.repository.getLatestAttemptForAssignment(
      assignment.id,
      currentItem.entry.userId,
      currentItem.entry.questionnaireId,
    );

    if (!inProgressAttempt && latestAttempt?.status === 'SUBMITTED') {
      this.loadError =
        latestAttempt.reviewStatus === 'PENDING_REVIEW'
          ? 'Este cuestionario ya fue enviado y esta pendiente de calificacion.'
          : 'Este cuestionario ya fue enviado. Consulta el resultado del intento.';
      return;
    }

    this.assignment = assignment;
    this.assignedUser = currentItem.entry;
    this.questionnaire = currentItem.questionnaire;
    this.currentQuestionnaireId = currentItem.entry.questionnaireId;
    this.certification = this.repository
      .getCertifications()
      .find((item) => item.id === assignment.certificationId);
    this.runtimeSections = currentItem.runtimeSections;
    this.assignedQuestionnaires = questionnaireItems;
    this.attempt =
      inProgressAttempt ??
      this.repository.getOrCreateInProgressAttempt(
        assignment.id,
        currentItem.entry.userId,
        currentItem.entry.questionnaireId,
      );

    this.buildAnswerForm();
    this.restoreCurrentSection();
    this.setupAutosave();
    this.lastSavedAt = this.readProgressSnapshot()?.savedAt
      ? new Date(this.readProgressSnapshot()!.savedAt)
      : new Date();
    this.startCountdownIfNeeded();
  }

  private resolveCurrentAssignedEntries(
    assignment: EvaluationAssignment,
  ): EvaluationAssignmentUser[] {
    const role = this.sessionRoleService.getRole() ?? 'admin';
    const identity =
      role === 'user'
        ? { name: 'Adrian', email: 'adrian@moontest.mx' }
        : { name: 'Roberto', email: 'roberto@moontest.mx' };
    const clientUsers = new Map(
      this.clientsStore
        .listUsersByClient(Number(assignment.clientId))
        .map((user) => [String(user.id), user]),
    );
    const normalizedName = identity.name.toLowerCase();
    const normalizedEmail = identity.email.toLowerCase();

    return assignment.users.filter((item) => {
      const clientUser = clientUsers.get(item.userId);
      const clientUserName = clientUser
        ? `${clientUser.nombres} ${clientUser.apellidos}`.trim().toLowerCase()
        : '';

      return (
        item.userName.trim().toLowerCase() === normalizedName ||
        clientUserName === normalizedName ||
        clientUser?.email.trim().toLowerCase() === normalizedEmail
      );
    });
  }

  private buildRuntimeSections(sectionIds: string[]): RuntimeSection[] {
    const sectionsById = new Map(this.repository.getSections().map((section) => [section.id, section]));
    const questionsById = new Map(
      this.repository.getQuestions().map((question) => [question.id, question]),
    );

    return sectionIds
      .map((sectionId) => sectionsById.get(sectionId))
      .filter((section): section is Section => !!section)
      .map((section) => ({
        section,
        questions: section.questionIds
          .map((questionId) => questionsById.get(questionId))
          .filter((question): question is Question => !!question),
      }));
  }

  private resolveQuestionnaireStatus(
    questionnaire: Questionnaire,
    latestAttempt?: Attempt,
  ): ResolverQuestionnaireStatus {
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

  private resolveQuestionnaireStatusLabel(
    status: ResolverQuestionnaireStatus,
  ): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'PENDING_REVIEW':
        return 'Falta de calificar';
      case 'GRADED':
        return 'Calificada';
      case 'EXPIRED':
        return 'Expirada';
      case 'NOT_STARTED':
      default:
        return 'No iniciada';
    }
  }

  private buildAnswerForm(): void {
    this.answerForm = new FormGroup<Record<string, FormControl<unknown>>>({});
    this.restoredAnsweredQuestionIds.clear();

    const progressSnapshot = this.readProgressSnapshot();
    const answersByQuestionId = new Map(
      (this.attempt?.answers ?? []).map((answer) => [answer.questionId, answer]),
    );

    for (const question of this.getAllQuestions()) {
      const snapshotValue = progressSnapshot?.answers[question.id];
      const existingAnswer = answersByQuestionId.get(question.id);
      const initialValue = snapshotValue ?? this.extractControlValue(existingAnswer, question);

      if (this.hasRestoredValue(initialValue, question)) {
        this.restoredAnsweredQuestionIds.add(question.id);
      }

      const validators = this.getValidators(question);
      const control = this.createControl(question, initialValue, validators);
      this.answerForm.addControl(this.getControlName(question.id), control as FormControl<unknown>);
    }
  }

  private createControl(
    question: Question,
    initialValue: unknown,
    validators: ValidatorFn[],
  ): FormControl<unknown> {
    switch (question.tipo) {
      case 'MULTIPLE':
      case 'MULTIPLE_SELECT':
      case 'RANKING':
        return new FormControl<string[] | null>(
          Array.isArray(initialValue)
            ? initialValue.filter((item): item is string => typeof item === 'string')
            : null,
          validators,
        ) as FormControl<unknown>;
      case 'TEXT':
      case 'LIKERT':
      case 'NOMINAL_SCALE':
      case 'FILTER':
        return new FormControl<string | null>(
          typeof initialValue === 'string' ? initialValue : null,
          validators,
        ) as FormControl<unknown>;
      case 'DICOTOMICA':
        return new FormControl<boolean | null>(
          typeof initialValue === 'boolean' ? initialValue : null,
          validators,
        ) as FormControl<unknown>;
      case 'NUMERIC_SCALE':
        return new FormControl<number | null>(
          typeof initialValue === 'number' ? initialValue : null,
          validators,
        ) as FormControl<unknown>;
      case 'MIXTA':
        return new FormControl<MixtaAnswerValue | null>(
          this.normalizeMixtaValue(initialValue, question),
          validators,
        ) as FormControl<unknown>;
      case 'FILE':
      default:
        return new FormControl<FileAnswerValue | null>(
          this.extractFileValue(initialValue),
          validators,
        ) as FormControl<unknown>;
    }
  }

  private getValidators(question: Question): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    switch (question.tipo) {
      case 'MULTIPLE':
      case 'MULTIPLE_SELECT':
        if (question.obligatoria) {
          validators.push(this.requiredArrayValidator());
        }
        break;
      case 'RANKING':
        if (question.obligatoria) {
          validators.push(this.requiredRankingValidator(question.id));
        }
        break;
      case 'TEXT': {
        const config = question.config as { minLength?: number; maxLength?: number };
        if (question.obligatoria) {
          validators.push(Validators.required);
        }
        if (config.minLength) {
          validators.push(Validators.minLength(config.minLength));
        }
        if (config.maxLength) {
          validators.push(Validators.maxLength(config.maxLength));
        }
        break;
      }
      case 'MIXTA':
        if (question.obligatoria) {
          validators.push(this.requiredMixtaValidator(question));
        }
        break;
      case 'DICOTOMICA':
      case 'NUMERIC_SCALE':
      case 'LIKERT':
      case 'NOMINAL_SCALE':
      case 'FILTER':
      case 'FILE':
        if (question.obligatoria) {
          validators.push(Validators.required);
        }
        break;
      default:
        break;
    }

    return validators;
  }

  private setupAutosave(): void {
    this.answerForm.valueChanges
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => {
        this.persistDraft();
      });
  }

  private persistDraft(): void {
    if (!this.attempt || this.attempt.status !== 'IN_PROGRESS') {
      return;
    }

    const updated = this.repository.saveAttemptAnswers(this.attempt.id, this.collectAnswers());
    if (!updated) {
      return;
    }

    this.attempt = updated;
    this.persistProgressSnapshot('IN_PROGRESS');
  }

  private collectAnswers(): Answer[] {
    return this.getAllQuestions().map((question) => {
      const control = this.getControl(question.id);
      const answered = this.hasControlValue(control, question);
      const rawValue = control.value;

      switch (question.tipo) {
        case 'MULTIPLE':
        case 'MULTIPLE_SELECT':
        case 'RANKING':
          return {
            questionId: question.id,
            type: question.tipo,
            value:
              answered && Array.isArray(rawValue)
                ? rawValue.filter((item): item is string => typeof item === 'string')
                : [],
          };
        case 'TEXT':
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered && typeof rawValue === 'string' ? rawValue : '',
          };
        case 'MIXTA':
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered ? this.normalizeMixtaValue(rawValue, question) : null,
          };
        case 'DICOTOMICA':
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered && typeof rawValue === 'boolean' ? rawValue : null,
          };
        case 'NUMERIC_SCALE':
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered && typeof rawValue === 'number' ? rawValue : null,
          };
        case 'LIKERT':
        case 'NOMINAL_SCALE':
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered && typeof rawValue === 'string' ? rawValue : '',
          };
        case 'FILTER': {
          const selectedValue = answered && typeof rawValue === 'string' ? rawValue : '';
          const config = question.config as FilterQuestionConfig;
          const matchedRule = config.rules.find((rule) => rule.answerValue === selectedValue);
          const value: FilterAnswerValue | null = selectedValue
            ? {
                selectedValue,
                matchedRule: matchedRule
                  ? {
                      goToQuestionId: matchedRule.goToQuestionId,
                      endQuiz: matchedRule.endQuiz,
                    }
                  : undefined,
              }
            : null;

          return {
            questionId: question.id,
            type: question.tipo,
            value,
          };
        }
        case 'FILE':
        default:
          return {
            questionId: question.id,
            type: question.tipo,
            value: answered ? this.extractFileValue(rawValue) : null,
          };
      }
    });
  }

  private persistProgressSnapshot(
    status: ProgressSnapshot['status'],
    finishedAt?: string,
  ): void {
    if (!this.attempt) {
      return;
    }

    const snapshot: ProgressSnapshot = {
      answers: this.collectProgressAnswers(),
      currentSectionIndex: this.currentSectionIndex,
      savedAt: new Date().toISOString(),
      status,
      answeredCount: this.answeredCount,
      finishedAt,
    };

    this.restoredAnsweredQuestionIds.clear();
    Object.keys(snapshot.answers).forEach((questionId) => this.restoredAnsweredQuestionIds.add(questionId));

    localStorage.setItem(this.getProgressStorageKey(this.attempt.id), JSON.stringify(snapshot));
    this.lastSavedAt = new Date(snapshot.savedAt);
  }

  private collectProgressAnswers(): Record<string, unknown> {
    return this.getAllQuestions().reduce<Record<string, unknown>>((acc, question) => {
      const control = this.getControl(question.id);
      if (!this.hasControlValue(control, question)) {
        return acc;
      }

      acc[question.id] = control.value;
      return acc;
    }, {});
  }

  private restoreCurrentSection(): void {
    const snapshotIndex = this.readProgressSnapshot()?.currentSectionIndex;
    if (
      typeof snapshotIndex === 'number' &&
      snapshotIndex >= 0 &&
      snapshotIndex < this.runtimeSections.length
    ) {
      this.currentSectionIndex = snapshotIndex;
    }
  }

  private readProgressSnapshot(): ProgressSnapshot | null {
    if (!this.attempt) {
      return null;
    }

    const raw = localStorage.getItem(this.getProgressStorageKey(this.attempt.id));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as ProgressSnapshot;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private getProgressStorageKey(attemptId: string): string {
    return `evaluaciones.user.progress.${attemptId}`;
  }

  private getAllQuestions(): Question[] {
    return this.runtimeSections.flatMap((section) => section.questions);
  }

  private isQuestionAnswered(question: Question): boolean {
    return this.hasControlValue(this.getControl(question.id), question);
  }

  private hasControlValue(control: AbstractControl | null, question: Question): boolean {
    const value = control?.value;

    if (question.tipo === 'MULTIPLE' || question.tipo === 'MULTIPLE_SELECT') {
      return Array.isArray(value) && value.length > 0;
    }

    if (question.tipo === 'RANKING') {
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (!!control?.dirty || !!control?.touched || this.restoredAnsweredQuestionIds.has(question.id))
      );
    }

    if (question.tipo === 'TEXT' || question.tipo === 'LIKERT' || question.tipo === 'NOMINAL_SCALE') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (question.tipo === 'MIXTA') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }

      const raw = value as Partial<MixtaAnswerValue>;
      const selectedOptionIds = Array.isArray(raw.selectedOptionIds) ? raw.selectedOptionIds : [];
      if (selectedOptionIds.length === 0) {
        return false;
      }

      const otherOptionValue = this.getMixtaOtherOptionValue(question);
      if (!selectedOptionIds.includes(otherOptionValue)) {
        return true;
      }

      return typeof raw.otherText === 'string' && raw.otherText.trim().length > 0;
    }

    if (question.tipo === 'DICOTOMICA') {
      return typeof value === 'boolean';
    }

    if (question.tipo === 'NUMERIC_SCALE') {
      return typeof value === 'number';
    }

    if (question.tipo === 'FILTER') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return (
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'fileName' in value &&
      typeof value.fileName === 'string'
    );
  }

  private hasStoredAnswerValue(
    value: unknown,
    question?: Question,
  ): boolean {
    if (!question) {
      return false;
    }

    const fakeControl = { value, dirty: false, touched: false } as AbstractControl;
    if (question.tipo === 'RANKING') {
      return Array.isArray(value) && value.length > 0;
    }

    return this.hasControlValue(fakeControl, question);
  }

  private extractControlValue(answer: Answer | undefined, question: Question): unknown {
    if (!answer) {
      return null;
    }

    if (question.tipo === 'FILTER') {
      if (typeof answer.value === 'string') {
        return answer.value;
      }

      if (
        answer.value &&
        typeof answer.value === 'object' &&
        !Array.isArray(answer.value) &&
        'selectedValue' in answer.value &&
        typeof answer.value.selectedValue === 'string'
      ) {
        return answer.value.selectedValue;
      }

      return null;
    }

    return answer.value;
  }

  private extractFileValue(value: unknown): FileAnswerValue | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = value as Partial<FileAnswerValue>;
    if (!raw.fileName || typeof raw.fileSize !== 'number' || !raw.fileType) {
      return null;
    }

    return {
      fileName: raw.fileName,
      fileSize: raw.fileSize,
      fileType: raw.fileType,
    };
  }

  private normalizeMixtaValue(value: unknown, question: Question): MixtaAnswerValue | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = value as Partial<MixtaAnswerValue>;
    const selectedOptionIds = Array.isArray(raw.selectedOptionIds)
      ? raw.selectedOptionIds.filter((item): item is string => typeof item === 'string')
      : [];

    const normalized: MixtaAnswerValue = { selectedOptionIds };
    if (typeof raw.otherText === 'string' && raw.otherText.trim().length > 0) {
      normalized.otherText = raw.otherText;
    }

    if (
      selectedOptionIds.includes(this.getMixtaOtherOptionValue(question)) &&
      !normalized.otherText
    ) {
      normalized.otherText = '';
    }

    return normalized;
  }

  private hasRestoredValue(value: unknown, question: Question): boolean {
    const fakeControl = { value, dirty: false, touched: false } as AbstractControl;
    if (question.tipo === 'RANKING') {
      return Array.isArray(value) && value.length > 0;
    }

    return this.hasControlValue(fakeControl, question);
  }

  private requiredArrayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
    };
  }

  private requiredRankingValidator(questionId: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        (control.dirty || control.touched || this.restoredAnsweredQuestionIds.has(questionId))
      ) {
        return null;
      }

      return { required: true };
    };
  }

  private requiredMixtaValidator(question: Question): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as MixtaAnswerValue | null;
      if (!value || !Array.isArray(value.selectedOptionIds) || value.selectedOptionIds.length === 0) {
        return { required: true };
      }

      const otherOptionValue = this.getMixtaOtherOptionValue(question);
      if (
        value.selectedOptionIds.includes(otherOptionValue) &&
        (!value.otherText || value.otherText.trim().length === 0)
      ) {
        return { required: true };
      }

      return null;
    };
  }

  private getMixtaOtherOptionValue(question: Question): string {
    const config = question.config as { otherOptionValue?: string };
    return config.otherOptionValue ?? '__other__';
  }

  private startCountdownIfNeeded(): void {
    const timeLimit = this.questionnaire?.settings.timeLimitMinutes;
    if (!timeLimit || !this.attempt) {
      this.remainingSeconds = null;
      return;
    }

    const startedAtMs = Date.parse(this.attempt.startedAt);
    const endMs = startedAtMs + timeLimit * 60 * 1000;

    const tick = () => {
      const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      this.remainingSeconds = diff;

      if (diff === 0) {
        this.clearCountdown();
      }
    };

    tick();
    this.countdownInterval = setInterval(tick, 1000);
  }

  private clearCountdown(): void {
    if (!this.countdownInterval) {
      return;
    }

    clearInterval(this.countdownInterval);
    this.countdownInterval = null;
  }

  private scrollToTop(): void {
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  private toPercent(value: number): number {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(Math.max(0, Math.min(100, safe)) * 100) / 100;
  }
}

import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  FileUp,
  History,
  LucideAngularModule,
  MessageSquareText,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-angular';
import {
  RemediationCase,
  RemediationCenterService,
  RemediationHistoryTone,
  RemediationPriority,
  RemediationStatus,
} from '../../../core/services/remediation-center.service';
import { AppRole } from '../../../core/services/session-role.service';

@Component({
  selector: 'app-plan-remediacion-detail-drawer',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './plan-remediacion-detail-drawer.component.html',
})
export class PlanRemediacionDetailDrawerComponent
  implements OnChanges, OnDestroy
{
  private readonly fb = inject(FormBuilder);
  private readonly remediationCenter = inject(RemediationCenterService);

  @Input() isOpen = false;
  @Input() remediationCase: RemediationCase | null = null;
  @Input() role: AppRole = 'admin';

  @Output() closed = new EventEmitter<void>();

  readonly X = X;
  readonly ShieldAlert = ShieldAlert;
  readonly CalendarClock = CalendarClock;
  readonly UserRound = UserRound;
  readonly ClipboardCheck = ClipboardCheck;
  readonly MessageSquareText = MessageSquareText;
  readonly History = History;
  readonly FileUp = FileUp;
  readonly CheckCheck = CheckCheck;

  readonly priorities: RemediationPriority[] = ['Baja', 'Media', 'Alta', 'Critica'];
  readonly adminStatuses: RemediationStatus[] = [
    'Pendiente',
    'En proceso',
    'En revision',
    'Vencido',
    'Completado',
    'Validado',
  ];
  readonly userStatuses: Array<
    Extract<RemediationStatus, 'Pendiente' | 'En proceso' | 'En revision' | 'Completado'>
  > = ['Pendiente', 'En proceso', 'En revision', 'Completado'];

  isPanelVisible = false;
  isOverlayVisible = false;

  readonly adminForm = this.fb.group({
    priority: ['Media' as RemediationPriority, Validators.required],
    responsibleName: ['', [Validators.required, Validators.minLength(3)]],
    responsibleRole: ['', [Validators.required, Validators.minLength(3)]],
    dueDate: ['', Validators.required],
    status: ['Pendiente' as RemediationStatus, Validators.required],
    evidenceRequiredText: ['', Validators.required],
    correctiveActionsText: ['', Validators.required],
    internalCommentsNote: [''],
  });

  readonly userProgressForm = this.fb.group({
    progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    status: ['Pendiente' as RemediationStatus, Validators.required],
  });

  readonly commentForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(4)]],
    internal: [false],
  });

  readonly evidenceForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['remediationCase'] && this.remediationCase) {
      this.syncForms();
    }

    if (changes['isOpen']) {
      if (this.isOpen) {
        this.playOpenAnimation();
        this.syncForms();
      } else {
        this.clearTimers();
        this.isOverlayVisible = false;
        this.isPanelVisible = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  get visibleComments() {
    if (!this.remediationCase) {
      return [];
    }

    return this.isAdmin
      ? this.remediationCase.comments
      : this.remediationCase.comments.filter((comment) => !comment.internal);
  }

  closeDrawer(): void {
    if (this.closeAnimationTimer) {
      return;
    }

    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.closeAnimationTimer = setTimeout(() => {
      this.closeAnimationTimer = null;
      this.closed.emit();
    }, 300);
  }

  submitAdminPlan(): void {
    if (!this.remediationCase || this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const value = this.adminForm.getRawValue();
    this.remediationCenter.updateAdminPlan(this.remediationCase.id, {
      priority: value.priority as RemediationPriority,
      responsibleName: String(value.responsibleName ?? '').trim(),
      responsibleRole: String(value.responsibleRole ?? '').trim(),
      dueDate: String(value.dueDate ?? ''),
      status: value.status as RemediationStatus,
      evidenceRequired: this.parseMultiline(value.evidenceRequiredText),
      correctiveActions: this.parseMultiline(value.correctiveActionsText),
      internalCommentsNote: String(value.internalCommentsNote ?? '').trim(),
    });
  }

  submitUserProgress(): void {
    if (!this.remediationCase || this.userProgressForm.invalid) {
      this.userProgressForm.markAllAsTouched();
      return;
    }

    const value = this.userProgressForm.getRawValue();
    this.remediationCenter.updateUserProgress(this.remediationCase.id, {
      progress: Number(value.progress ?? 0),
      status: value.status as
        | 'Pendiente'
        | 'En proceso'
        | 'En revision'
        | 'Completado',
    });
  }

  submitComment(): void {
    if (!this.remediationCase || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const value = this.commentForm.getRawValue();
    this.remediationCenter.addComment(this.remediationCase.id, {
      author: this.isAdmin ? 'Roberto Salazar' : this.remediationCase.assignedUserName,
      authorRole: this.isAdmin ? 'admin' : 'user',
      message: String(value.message ?? ''),
      internal: this.isAdmin && !!value.internal,
    });
    this.commentForm.reset({ message: '', internal: false });
  }

  submitEvidence(): void {
    if (!this.remediationCase || this.evidenceForm.invalid) {
      this.evidenceForm.markAllAsTouched();
      return;
    }

    const value = this.evidenceForm.getRawValue();
    this.remediationCenter.addEvidence(this.remediationCase.id, {
      name: String(value.name ?? ''),
      description: String(value.description ?? ''),
      uploadedBy: this.isAdmin ? 'Roberto Salazar' : this.remediationCase.assignedUserName,
    });
    this.evidenceForm.reset({ name: '', description: '' });
  }

  validateClosure(): void {
    if (!this.remediationCase) {
      return;
    }

    this.remediationCenter.validateCase(this.remediationCase.id);
  }

  getPriorityClasses(priority: RemediationPriority): string {
    switch (priority) {
      case 'Baja':
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
      case 'Media':
        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
      case 'Alta':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Critica':
      default:
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
    }
  }

  getStatusClasses(status: RemediationStatus): string {
    switch (status) {
      case 'Pendiente':
        return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
      case 'En proceso':
        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
      case 'En revision':
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Completado':
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
      case 'Validado':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'Vencido':
      default:
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
    }
  }

  getHistoryToneClasses(tone: RemediationHistoryTone): string {
    switch (tone) {
      case 'success':
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
      case 'warning':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'error':
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
      case 'brand':
      default:
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
    }
  }

  private syncForms(): void {
    if (!this.remediationCase) {
      return;
    }

    this.adminForm.reset({
      priority: this.remediationCase.priority,
      responsibleName: this.remediationCase.responsibleName,
      responsibleRole: this.remediationCase.responsibleRole,
      dueDate: this.remediationCase.dueDate.slice(0, 16),
      status: this.remediationCase.status,
      evidenceRequiredText: this.remediationCase.evidenceRequired.join('\n'),
      correctiveActionsText: this.remediationCase.correctiveActions.join('\n'),
      internalCommentsNote: this.remediationCase.internalCommentsNote,
    });

    this.userProgressForm.reset({
      progress: this.remediationCase.progress,
      status:
        this.remediationCase.status === 'Validado' ||
        this.remediationCase.status === 'Vencido'
          ? 'En revision'
          : this.remediationCase.status,
    });

    this.commentForm.reset({
      message: '',
      internal: false,
    });

    this.evidenceForm.reset({
      name: '',
      description: '',
    });
  }

  private parseMultiline(value: string | null): string[] {
    return String(value ?? '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private playOpenAnimation(): void {
    this.clearTimers();
    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.openAnimationTimer = setTimeout(() => {
      this.isOverlayVisible = true;
      this.isPanelVisible = true;
      this.openAnimationTimer = null;
    }, 10);
  }

  private clearTimers(): void {
    if (this.openAnimationTimer) {
      clearTimeout(this.openAnimationTimer);
      this.openAnimationTimer = null;
    }

    if (this.closeAnimationTimer) {
      clearTimeout(this.closeAnimationTimer);
      this.closeAnimationTimer = null;
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Filter,
  Hourglass,
  LucideAngularModule,
  Search,
  ShieldAlert,
  UserRound,
} from 'lucide-angular';
import { Subscription } from 'rxjs';
import {
  RemediationCase,
  RemediationCenterService,
  RemediationPriority,
  RemediationStatus,
} from '../../core/services/remediation-center.service';
import {
  AppRole,
  SessionRoleService,
} from '../../core/services/session-role.service';
import { PlanRemediacionDetailDrawerComponent } from './plan-remediacion-detail-drawer/plan-remediacion-detail-drawer.component';

@Component({
  selector: 'app-plan-remediacion',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PlanRemediacionDetailDrawerComponent,
  ],
  templateUrl: './plan-remediacion.component.html',
})
export class PlanRemediacionComponent implements OnDestroy {
  private readonly remediationCenter = inject(RemediationCenterService);
  private readonly sessionRoleService = inject(SessionRoleService);
  private readonly subscription = new Subscription();

  readonly ShieldAlert = ShieldAlert;
  readonly Search = Search;
  readonly Filter = Filter;
  readonly CalendarClock = CalendarClock;
  readonly ClipboardList = ClipboardList;
  readonly UserRound = UserRound;
  readonly AlertTriangle = AlertTriangle;
  readonly CheckCheck = CheckCheck;
  readonly Hourglass = Hourglass;

  readonly statusFilters: Array<'ALL' | RemediationStatus> = [
    'ALL',
    'Pendiente',
    'En proceso',
    'En revision',
    'Vencido',
    'Completado',
    'Validado',
  ];
  readonly priorityFilters: Array<'ALL' | RemediationPriority> = [
    'ALL',
    'Critica',
    'Alta',
    'Media',
    'Baja',
  ];

  currentRole: AppRole = this.sessionRoleService.getRole() ?? 'admin';
  cases: RemediationCase[] = [];
  filteredCases: RemediationCase[] = [];

  searchTerm = '';
  selectedStatus: 'ALL' | RemediationStatus = 'ALL';
  selectedPriority: 'ALL' | RemediationPriority = 'ALL';

  isDetailOpen = false;
  selectedCaseId: string | null = null;

  constructor() {
    this.subscription.add(
      this.remediationCenter.cases$.subscribe((items) => {
        this.cases = items;
        this.applyFilters();
      }),
    );

    this.subscription.add(
      this.sessionRoleService.role$.subscribe((role) => {
        this.currentRole = role ?? 'admin';
        this.applyFilters();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  get visibleCases(): RemediationCase[] {
    if (this.isAdmin) {
      return this.cases;
    }

    return this.cases.filter(
      (item) => item.assignedUserEmail === 'adrian@moontest.mx',
    );
  }

  get selectedCase(): RemediationCase | null {
    if (!this.selectedCaseId) {
      return null;
    }

    return (
      this.filteredCases.find((item) => item.id === this.selectedCaseId) ??
      this.visibleCases.find((item) => item.id === this.selectedCaseId) ??
      null
    );
  }

  get activeCount(): number {
    return this.visibleCases.filter((item) => item.status !== 'Validado').length;
  }

  get failedCasesCount(): number {
    return this.visibleCases.filter((item) => item.sourceStatus === 'Reprobado').length;
  }

  get overdueCount(): number {
    return this.visibleCases.filter((item) => item.status === 'Vencido').length;
  }

  get pendingValidationCount(): number {
    return this.visibleCases.filter((item) => item.requiresValidation).length;
  }

  get inProcessCount(): number {
    return this.visibleCases.filter((item) => item.status === 'En proceso').length;
  }

  get criticalAlertsCount(): number {
    return this.visibleCases.filter((item) => item.isCriticalAlert).length;
  }

  get userPendingCount(): number {
    return this.visibleCases.filter((item) => item.status === 'Pendiente').length;
  }

  get userCompletedCount(): number {
    return this.visibleCases.filter((item) => item.status === 'Completado').length;
  }

  get userValidationCount(): number {
    return this.visibleCases.filter((item) => item.requiresValidation).length;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCases = this.visibleCases.filter((item) => {
      const matchesStatus =
        this.selectedStatus === 'ALL' || item.status === this.selectedStatus;
      const matchesPriority =
        this.selectedPriority === 'ALL' || item.priority === this.selectedPriority;
      const haystack = [
        item.id,
        item.title,
        item.clientName,
        item.evaluationName,
        item.assignedUserName,
        item.responsibleName,
        item.category,
        item.failureReason,
        item.status,
        item.priority,
      ]
        .join(' ')
        .toLowerCase();
      const matchesText = !term || haystack.includes(term);

      return matchesStatus && matchesPriority && matchesText;
    });
  }

  openDetail(item: RemediationCase): void {
    this.selectedCaseId = item.id;
    this.isDetailOpen = true;
  }

  closeDetail(): void {
    this.isDetailOpen = false;
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

  getSourceClasses(sourceStatus: RemediationCase['sourceStatus']): string {
    return sourceStatus === 'Reprobado'
      ? 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300'
      : 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
  }

  getEvidenceSummary(item: RemediationCase): string {
    return `${item.evidence.length}/${item.evidenceRequired.length} cargadas`;
  }

  getActionLabel(): string {
    return this.isAdmin ? 'Gestionar plan' : 'Actualizar avance';
  }
}

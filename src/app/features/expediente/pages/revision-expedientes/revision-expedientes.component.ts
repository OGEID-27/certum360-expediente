import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Clock,
  FolderOpen,
  LucideAngularModule,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-angular';
import {
  ExpedienteReviewComplianceLevel,
  ExpedienteReviewQueueItem,
  ExpedienteReviewWorkflowStatus,
} from '../../interfaces/expediente-proveedores.interface';
import { ExpedienteProveedoresService } from '../../services/expediente-proveedores.service';

@Component({
  selector: 'app-revision-expedientes',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './revision-expedientes.component.html',
})
export class RevisionExpedientesComponent {
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly router = inject(Router);

  readonly Search = Search;
  readonly ClipboardCheck = ClipboardCheck;
  readonly Clock = Clock;
  readonly CircleAlert = CircleAlert;
  readonly BadgeCheck = BadgeCheck;
  readonly ShieldCheck = ShieldCheck;
  readonly CalendarDays = CalendarDays;
  readonly FolderOpen = FolderOpen;
  readonly Building2 = Building2;
  readonly Users = Users;

  readonly reviewItems = this.providersService.listReviewQueue();

  filteredItems: ExpedienteReviewQueueItem[] = [];
  searchTerm = '';
  selectedProvider = 'ALL';
  selectedState: 'ALL' | ExpedienteReviewWorkflowStatus = 'ALL';
  selectedCompliance: 'ALL' | ExpedienteReviewComplianceLevel = 'ALL';
  selectedDateRange: 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30' = 'ALL';

  constructor() {
    this.applyFilters();
  }

  get providerOptions(): string[] {
    return Array.from(new Set(this.reviewItems.map((item) => item.providerName))).sort((a, b) =>
      a.localeCompare(b),
    );
  }

  get summaryCards() {
    const now = new Date();

    return [
      {
        label: 'Por revisar',
        value: this.reviewItems.filter((item) => item.state === 'Pendiente').length,
        detail: 'Ingresos listos para primer corte',
        icon: this.Clock,
        tone:
          'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
      },
      {
        label: 'Con observaciones',
        value: this.reviewItems.filter((item) => item.state === 'Observado').length,
        detail: 'Expedientes con devolucion activa',
        icon: this.CircleAlert,
        tone:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      },
      {
        label: 'Aprobados',
        value: this.reviewItems.filter((item) => item.state === 'Aprobado').length,
        detail: 'Liberados para operacion',
        icon: this.BadgeCheck,
        tone:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      },
      {
        label: 'En seguimiento',
        value: this.reviewItems.filter((item) => item.state === 'En revision').length,
        detail: 'Casos abiertos en validacion',
        icon: this.ShieldCheck,
        tone:
          'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300',
      },
      {
        label: 'Por vencer',
        value: this.reviewItems.filter((item) => this.isNearExpiration(item.validUntil, now)).length,
        detail: 'Vigencias a 15 dias o menos',
        icon: this.CalendarDays,
        tone:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      },
    ];
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const now = new Date();

    this.filteredItems = this.reviewItems.filter((item) => {
      const matchesProvider =
        this.selectedProvider === 'ALL' || item.providerName === this.selectedProvider;
      const matchesState = this.selectedState === 'ALL' || item.state === this.selectedState;
      const matchesCompliance =
        this.selectedCompliance === 'ALL' || item.compliance === this.selectedCompliance;
      const matchesDate = this.matchesDateRange(item, now);
      const haystack = [
        item.personName,
        item.personRole,
        item.providerName,
        item.state,
        item.compliance,
      ]
        .join(' ')
        .toLowerCase();

      return (
        matchesProvider &&
        matchesState &&
        matchesCompliance &&
        matchesDate &&
        (!term || haystack.includes(term))
      );
    });
  }

  openDetail(item: ExpedienteReviewQueueItem): void {
    this.router.navigate(['/expediente/proveedores', item.providerId, 'personas', item.personId], {
      queryParams: { source: 'revision' },
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  getStateClass(state: ExpedienteReviewWorkflowStatus): string {
    switch (state) {
      case 'Aprobado':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'En revision':
        return 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Observado':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Rechazado':
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
      case 'Pendiente':
      default:
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
    }
  }

  getComplianceClass(level: ExpedienteReviewComplianceLevel): string {
    switch (level) {
      case 'Alto':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'Medio':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Bajo':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  trackByItem(_: number, item: ExpedienteReviewQueueItem): string {
    return item.id;
  }

  private matchesDateRange(
    item: ExpedienteReviewQueueItem,
    now: Date,
  ): boolean {
    if (this.selectedDateRange === 'ALL') {
      return true;
    }

    const submittedAt = new Date(item.submittedAt);

    if (this.selectedDateRange === 'TODAY') {
      return submittedAt.toDateString() === now.toDateString();
    }

    const diffInDays = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (this.selectedDateRange === 'LAST_7') {
      return diffInDays <= 7;
    }

    return diffInDays <= 30;
  }

  private isNearExpiration(value: string, now: Date): boolean {
    const expirationDate = new Date(value);
    const diffInDays = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 15;
  }
}

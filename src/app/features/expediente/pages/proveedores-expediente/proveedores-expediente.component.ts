import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Hourglass,
  LayoutTemplate,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-angular';
import {
  ExpedienteComplianceStatus,
  ExpedienteProviderListItem,
  ExpedienteProviderStatus,
  ExpedienteReviewStatus,
} from '../../interfaces/expediente-proveedores.interface';
import { ExpedienteProveedoresService } from '../../services/expediente-proveedores.service';

@Component({
  selector: 'app-proveedores-expediente',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './proveedores-expediente.component.html',
})
export class ProveedoresExpedienteComponent {
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly router = inject(Router);
  private readonly numberFormatter = new Intl.NumberFormat('es-MX');

  readonly Building2 = Building2;
  readonly Search = Search;
  readonly BadgeCheck = BadgeCheck;
  readonly Users = Users;
  readonly ClipboardCheck = ClipboardCheck;
  readonly Hourglass = Hourglass;
  readonly Pencil = Pencil;
  readonly Plus = Plus;
  readonly LayoutTemplate = LayoutTemplate;
  readonly pageSizeOptions = [5, 10, 15];

  readonly providers = this.providersService.listProviders();

  filteredProviders: ExpedienteProviderListItem[] = [];
  searchTerm = '';
  selectedStatus: 'ALL' | ExpedienteProviderStatus = 'ALL';
  selectedServiceType = 'ALL';
  selectedCompliance: 'ALL' | ExpedienteComplianceStatus = 'ALL';
  selectedReviewStatus: 'ALL' | ExpedienteReviewStatus = 'ALL';
  pageSize = 5;
  currentPage = 1;

  constructor() {
    this.applyFilters();
  }

  get serviceTypeOptions(): string[] {
    return Array.from(new Set(this.providers.map((provider) => provider.serviceType))).sort(
      (a, b) => a.localeCompare(b),
    );
  }

  get totalItems(): number {
    return this.filteredProviders.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageStartItem(): number {
    if (this.totalItems === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get paginatedProviders(): ExpedienteProviderListItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProviders.slice(start, start + this.pageSize);
  }

  get metrics() {
    return [
      {
        label: 'Total proveedores',
        value: this.providers.length,
        detail: 'Padron operativo activo',
        icon: this.Building2,
        tone:
          'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300',
      },
      {
        label: 'Activos',
        value: this.providers.filter((provider) => provider.status === 'Activo').length,
        detail: 'Con seguimiento ordinario',
        icon: this.BadgeCheck,
        tone:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      },
      {
        label: 'Al corriente',
        value: this.providers.filter((provider) => provider.complianceStatus === 'Al corriente')
          .length,
        detail: 'Cumplimiento documental estable',
        icon: this.ClipboardCheck,
        tone:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
      },
      {
        label: 'Pendientes de revision',
        value: this.providers.filter((provider) => provider.pendingItems > 0).length,
        detail: 'Con observaciones o validacion abierta',
        icon: this.Users,
        tone:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      },
      {
        label: 'Documentos por vencer',
        value: this.providers.filter((provider) => provider.expiringDocuments > 0).length,
        detail: 'Requieren seguimiento inmediato',
        icon: this.Hourglass,
        tone:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      },
    ];
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredProviders = this.providers.filter((provider) => {
      const matchesStatus =
        this.selectedStatus === 'ALL' || provider.status === this.selectedStatus;
      const matchesService =
        this.selectedServiceType === 'ALL' || provider.serviceType === this.selectedServiceType;
      const matchesCompliance =
        this.selectedCompliance === 'ALL' ||
        provider.complianceStatus === this.selectedCompliance;
      const matchesReview =
        this.selectedReviewStatus === 'ALL' ||
        provider.reviewStatus === this.selectedReviewStatus;
      const haystack = [
        provider.name,
        provider.businessName,
        provider.serviceType,
        provider.contactName,
        provider.contactEmail,
        provider.contactPhone,
        provider.status,
        provider.complianceStatus,
        provider.reviewStatus,
      ]
        .join(' ')
        .toLowerCase();
      const matchesText = !term || haystack.includes(term);

      return (
        matchesStatus &&
        matchesService &&
        matchesCompliance &&
        matchesReview &&
        matchesText
      );
    });

    this.currentPage = 1;
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  openDetail(provider: ExpedienteProviderListItem): void {
    this.router.navigate(['/expediente/proveedores', provider.id], {
      queryParams: { tab: 'personas' },
    });
  }

  openEdit(provider: ExpedienteProviderListItem): void {
    this.router.navigate(['/expediente/proveedores', provider.id, 'editar']);
  }

  openCreate(): void {
    this.router.navigate(['/expediente/proveedores/nuevo']);
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  formatNumber(value: number): string {
    return this.numberFormatter.format(value);
  }

  getStatusClass(status: ExpedienteProviderStatus): string {
    switch (status) {
      case 'Activo':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'En revision':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Observado':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getComplianceClass(status: ExpedienteComplianceStatus): string {
    switch (status) {
      case 'Al corriente':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'En seguimiento':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Atencion prioritaria':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getReviewClass(status: ExpedienteReviewStatus): string {
    switch (status) {
      case 'Revision semanal':
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Revision mensual':
        return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
      case 'Revision trimestral':
        return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
      case 'Documentos por vencer':
      default:
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
    }
  }

  trackByProvider(_: number, provider: ExpedienteProviderListItem): string {
    return provider.id;
  }

  getProviderLetters(name: string): string {
    const cleanName = name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    return (cleanName.slice(0, 2) || 'PR').padEnd(2, 'X');
  }
}

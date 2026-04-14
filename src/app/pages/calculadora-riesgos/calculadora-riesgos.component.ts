import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  BadgeAlert,
  ChartCandlestick,
  Clock3,
  History,
  LucideAngularModule,
  MessageSquareText,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-angular';
import { SessionRoleService } from '../../core/services/session-role.service';
import {
  RiskCategory,
  RiskHistoryItem,
  RiskKpi,
  RiskLevel,
  RiskTrigger,
  RiskSourceType,
  getRiskAnalysisDashboardMock,
} from './calculadora-riesgos.mock';

@Component({
  selector: 'app-calculadora-riesgos',
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './calculadora-riesgos.component.html',
})
export class CalculadoraRiesgosComponent {
  private readonly sessionRoleService = inject(SessionRoleService);

  readonly ChartCandlestick = ChartCandlestick;
  readonly ShieldCheck = ShieldCheck;
  readonly MessageSquareText = MessageSquareText;
  readonly TriangleAlert = TriangleAlert;
  readonly History = History;
  readonly Clock3 = Clock3;
  readonly BadgeAlert = BadgeAlert;

  readonly dashboard = getRiskAnalysisDashboardMock();
  readonly periods = ['30 dias', '90 dias', '6 meses'];
  readonly categoryFilters = [
    'Todas',
    ...this.dashboard.categories.map((category) => category.name),
  ];

  currentRole = this.sessionRoleService.getRole() ?? 'admin';
  selectedPeriod = this.periods[0];
  selectedCategory = this.categoryFilters[0];

  get isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  get filteredCategories(): RiskCategory[] {
    if (this.selectedCategory === 'Todas') {
      return this.dashboard.categories;
    }

    return this.dashboard.categories.filter(
      (category) => category.name === this.selectedCategory,
    );
  }

  get filteredTriggers(): RiskTrigger[] {
    if (this.selectedCategory === 'Todas') {
      return this.dashboard.triggers;
    }

    return this.dashboard.triggers.filter(
      (trigger) => trigger.category === this.selectedCategory,
    );
  }

  get filteredHistory(): RiskHistoryItem[] {
    if (this.selectedCategory === 'Todas') {
      return this.dashboard.history;
    }

    return this.dashboard.history.filter(
      (item) => item.category === this.selectedCategory,
    );
  }

  get recentHistory(): RiskHistoryItem[] {
    return this.filteredHistory.slice(0, 4);
  }

  selectPeriod(period: string): void {
    this.selectedPeriod = period;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  getKpiToneClasses(tone: RiskKpi['tone']): string {
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

  getLevelClasses(level: RiskLevel): string {
    switch (level) {
      case 'Bajo':
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
      case 'Medio':
        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
      case 'Alto':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Critico':
      default:
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
    }
  }

  getTrendClasses(trend: RiskCategory['trend']): string {
    switch (trend) {
      case 'Disminuye':
        return 'text-success-600 dark:text-success-300';
      case 'Estable':
        return 'text-blue-600 dark:text-blue-300';
      case 'Sube':
      default:
        return 'text-warning-600 dark:text-warning-300';
    }
  }

  getTriggerStatusClasses(status: RiskTrigger['status']): string {
    switch (status) {
      case 'Controlado':
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
      case 'Seguimiento':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Atencion inmediata':
      default:
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
    }
  }

  getSourceClasses(source: RiskSourceType): string {
    return source === 'Cuestionario corto'
      ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
      : 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300';
  }

  getPeriodDescription(): string {
    switch (this.selectedPeriod) {
      case '90 dias':
        return 'Vista consolidada del trimestre con foco en variacion de score y rezagos operativos.';
      case '6 meses':
        return 'Lectura extendida para revisar comportamiento sostenido y repeticiones de hallazgos.';
      case '30 dias':
      default:
        return 'Corte actual para seguimiento semanal de cuestionarios base y notificaciones breves.';
    }
  }
}

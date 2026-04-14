import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LucideAngularModule,
  MessageSquareText,
  RefreshCw,
} from 'lucide-angular';
import {
  AppNotification,
  NotificationCenterService,
  NotificationModule,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../../core/services/notification-center.service';
import { SessionRoleService } from '../../core/services/session-role.service';

@Component({
  selector: 'app-notificaciones',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent {
  private readonly notificationCenter = inject(NotificationCenterService);
  private readonly sessionRoleService = inject(SessionRoleService);
  private readonly router = inject(Router);

  readonly Bell = Bell;
  readonly MessageSquareText = MessageSquareText;
  readonly CalendarClock = CalendarClock;
  readonly FileText = FileText;
  readonly RefreshCw = RefreshCw;
  readonly ClipboardCheck = ClipboardCheck;

  readonly filterOptions = [
    'Todas',
    'Remediacion',
    'Riesgos',
    'Importantes',
    'Pendientes',
  ];

  currentRole = this.sessionRoleService.getRole() ?? 'admin';
  selectedFilter = this.filterOptions[0];

  get notifications(): AppNotification[] {
    return this.notificationCenter.getNotifications(this.currentRole);
  }

  get summary() {
    return this.notificationCenter.getSummary(this.currentRole);
  }

  get filteredNotifications(): AppNotification[] {
    switch (this.selectedFilter) {
      case 'Remediacion':
        return this.notifications.filter((item) => item.module === 'Remediacion');
      case 'Riesgos':
        return this.notifications.filter((item) => item.module === 'Riesgos');
      case 'Importantes':
        return this.notifications.filter(
          (item) => item.status === 'Importante' || item.priority === 'Alta',
        );
      case 'Pendientes':
        return this.notifications.filter(
          (item) => item.status === 'Nueva' || item.status === 'Pendiente',
        );
      case 'Todas':
      default:
        return this.notifications;
    }
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  openNotification(route: string): void {
    this.router.navigate([route]);
  }

  getNotificationIcon(type: NotificationType) {
    switch (type) {
      case 'Cuestionario corto disponible':
      case 'Recordatorio de participacion':
        return this.MessageSquareText;
      case 'Cuestionario proximo a vencer':
      case 'Fecha limite proxima':
      case 'Remediacion vencida':
        return this.CalendarClock;
      case 'Nueva solicitud informativa':
      case 'Evidencia subida':
        return this.FileText;
      case 'Evaluacion reprobada requiere remediacion':
      case 'Nueva remediacion creada':
      case 'Accion asignada':
      case 'Accion completada':
      case 'Remediacion validada':
      case 'Comentario nuevo en seguimiento':
      case 'Caso listo para validar':
        return this.ClipboardCheck;
      case 'Actualizacion de evaluacion':
      default:
        return this.RefreshCw;
    }
  }

  getTypeClasses(type: NotificationType): string {
    switch (type) {
      case 'Evaluacion reprobada requiere remediacion':
      case 'Nueva remediacion creada':
      case 'Accion asignada':
      case 'Caso listo para validar':
      case 'Accion completada':
      case 'Remediacion validada':
      case 'Comentario nuevo en seguimiento':
      case 'Evidencia subida':
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Fecha limite proxima':
      case 'Remediacion vencida':
      case 'Cuestionario proximo a vencer':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Cuestionario corto disponible':
      case 'Recordatorio de participacion':
        return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
      case 'Nueva solicitud informativa':
        return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300';
      case 'Actualizacion de evaluacion':
      default:
        return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
    }
  }

  getModuleClasses(module: NotificationModule): string {
    switch (module) {
      case 'Remediacion':
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Riesgos':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Evaluaciones':
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300';
    }
  }

  getStatusClasses(status: NotificationStatus): string {
    switch (status) {
      case 'Nueva':
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
      case 'Pendiente':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Importante':
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
      case 'Leida':
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300';
    }
  }

  getPriorityClasses(priority: NotificationPriority): string {
    switch (priority) {
      case 'Alta':
        return 'text-error-600 dark:text-error-300';
      case 'Media':
        return 'text-warning-600 dark:text-warning-300';
      case 'Baja':
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LucideAngularModule,
  MessageSquareText,
  RefreshCw,
  TriangleAlert,
} from 'lucide-angular';
import {
  AppNotification,
  NotificationCenterService,
  NotificationModule,
  NotificationType,
} from '../../../../core/services/notification-center.service';
import { AppRole } from '../../../../core/services/session-role.service';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, DropdownComponent, LucideAngularModule],
})
export class NotificationDropdownComponent {
  private readonly router = inject(Router);
  private readonly notificationCenter = inject(NotificationCenterService);

  readonly Bell = Bell;
  readonly CalendarClock = CalendarClock;
  readonly TriangleAlert = TriangleAlert;
  readonly MessageSquareText = MessageSquareText;
  readonly FileText = FileText;
  readonly RefreshCw = RefreshCw;
  readonly ClipboardCheck = ClipboardCheck;

  @Input() role: AppRole = 'admin';

  isOpen = false;
  notifying = true;

  get notifications(): AppNotification[] {
    return this.notificationCenter.getRecentNotifications(this.role, 5);
  }

  get summary() {
    return this.notificationCenter.getSummary(this.role);
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.notifying = false;
    }
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  navigateTo(route: string): void {
    this.closeDropdown();
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
      case 'Caso listo para validar':
      case 'Comentario nuevo en seguimiento':
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
}

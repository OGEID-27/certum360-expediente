import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  Ban,
  CircleCheckBig,
  Info,
  LucideAngularModule,
  LucideIconData,
  TriangleAlert,
} from 'lucide-angular';
import { Observable } from 'rxjs';
import { ToastItem, ToastService, ToastType } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-host.component.html',
})
export class ToastHostComponent {
  private readonly toastService = inject(ToastService);

  readonly CircleCheckBig = CircleCheckBig;
  readonly Ban = Ban;
  readonly TriangleAlert = TriangleAlert;
  readonly Info = Info;

  readonly toasts$: Observable<ToastItem[]> = this.toastService.toasts$;

  dismiss(id: string): void {
    this.toastService.remove(id);
  }

  getToastClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'border-success-300 bg-success-50 text-success-900 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-200';
      case 'error':
        return 'border-error-300 bg-error-50 text-error-900 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200';
      case 'warning':
        return 'border-warning-300 bg-warning-50 text-warning-900 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-200';
      case 'info':
      default:
        return 'border-blue-light-300 bg-blue-light-50 text-blue-light-900 dark:border-blue-light-500/40 dark:bg-blue-light-500/10 dark:text-blue-light-200';
    }
  }

  getToastIcon(type: ToastType): LucideIconData {
    switch (type) {
      case 'success':
        return this.CircleCheckBig;
      case 'error':
        return this.Ban;
      case 'warning':
        return this.TriangleAlert;
      case 'info':
      default:
        return this.Info;
    }
  }

  getToastIconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }
}

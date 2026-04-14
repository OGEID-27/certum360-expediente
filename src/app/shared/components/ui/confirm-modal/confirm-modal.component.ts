import { CommonModule } from "@angular/common";
import { Component, HostListener, inject } from "@angular/core";
import {
  Ban,
  CircleAlert,
  CircleCheckBig,
  LucideAngularModule,
  LucideIconData,
  TriangleAlert,
} from "lucide-angular";
import { Observable } from "rxjs";
import {
  ConfirmModalState,
  ConfirmModalType,
  ModalService,
} from "../../../services/modal.service";

@Component({
  selector: "app-confirm-modal",
  imports: [CommonModule, LucideAngularModule],
  templateUrl: "./confirm-modal.component.html",
})
export class ConfirmModalComponent {
  private readonly modalService = inject(ModalService);

  readonly Ban = Ban;
  readonly CircleCheckBig = CircleCheckBig;
  readonly TriangleAlert = TriangleAlert;
  readonly CircleAlert = CircleAlert;

  readonly state$: Observable<ConfirmModalState> =
    this.modalService.confirmState$;

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    this.modalService.closeConfirm();
  }

  onConfirm(): void {
    this.modalService.confirm();
  }

  onCancel(): void {
    this.modalService.cancelConfirm();
  }

  getTypeIcon(type: ConfirmModalType): LucideIconData {
    switch (type) {
      case "error":
        return this.Ban;
      case "success":
        return this.CircleCheckBig;
      case "delete":
        return this.CircleAlert;
      case "warning":
      default:
        return this.TriangleAlert;
    }
  }

  getTypeIconClass(type: ConfirmModalType): string {
    switch (type) {
      case "success":
        return "text-emerald-600 dark:text-emerald-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "delete":
        return "text-red-600 dark:text-red-400";
      case "warning":
      default:
        return "text-amber-600 dark:text-amber-400";
    }
  }

  getModalBorderClass(type: ConfirmModalType): string {
    switch (type) {
      case "success":
        return "border border-emerald-500/70 dark:border-emerald-400/70 shadow-[0_0_14px_1px_rgba(16,185,129,0.20)]";
      case "error":
        return "border border-red-500/70 dark:border-red-400/70 shadow-[0_0_14px_1px_rgba(239,68,68,0.20)]";
      case "delete":
        return "border border-red-600/75 dark:border-red-500/75 shadow-[0_0_16px_1px_rgba(220,38,38,0.22)]";
      case "warning":
      default:
        return "border border-amber-500/70 dark:border-amber-400/70 shadow-[0_0_14px_1px_rgba(245,158,11,0.18)]";
    }
  }

  getTypeIconContainerClass(type: ConfirmModalType): string {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-500/10";
      case "error":
        return "bg-red-50 dark:bg-red-500/10";
      case "delete":
        return "bg-red-50 dark:bg-red-500/10";
      case "warning":
      default:
        return "bg-amber-50 dark:bg-amber-500/10";
    }
  }

  getConfirmButtonClass(type: ConfirmModalType): string {
    switch (type) {
      case "success":
        return "bg-success-600 hover:bg-success-700 focus:ring-success-500/30";
      case "error":
        return "bg-error-600 hover:bg-error-700 focus:ring-error-500/30";
      case "delete":
        return "bg-error-600 hover:bg-error-700 focus:ring-error-500/30";
      case "warning":
      default:
        return "bg-warning-600 hover:bg-warning-700 focus:ring-warning-500/30";
    }
  }
}

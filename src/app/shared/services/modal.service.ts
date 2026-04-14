import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ConfirmModalType = 'warning' | 'error' | 'success' | 'delete';

export type ConfirmModalOptions = {
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmText?: string;
  cancelText?: string;
};

export type ConfirmModalResolvedOptions = {
  title: string;
  message: string;
  type: ConfirmModalType;
  confirmText: string;
  cancelText: string;
};

export type ConfirmModalState = {
  isOpen: boolean;
  options: ConfirmModalResolvedOptions | null;
};

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private confirmStateSubject = new BehaviorSubject<ConfirmModalState>({
    isOpen: false,
    options: null,
  });
  private confirmResolver: ((confirmed: boolean) => void) | null = null;

  /** Observable for modal open state */
  isOpen$: Observable<boolean> = this.isOpenSubject.asObservable();
  confirmState$: Observable<ConfirmModalState> = this.confirmStateSubject.asObservable();

  /** Get current value synchronously */
  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }

  /** Open the modal */
  openModal(): void {
    this.isOpenSubject.next(true);
  }

  /** Close the modal */
  closeModal(): void {
    this.isOpenSubject.next(false);
  }

  /** Toggle the modal */
  toggleModal(): void {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  openConfirm(options: ConfirmModalOptions): Promise<boolean> {
    if (this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = null;
    }

    const resolvedOptions: ConfirmModalResolvedOptions = {
      title: options.title,
      message: options.message,
      type: options.type ?? 'warning',
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
    };

    this.confirmStateSubject.next({
      isOpen: true,
      options: resolvedOptions,
    });

    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  confirm(): void {
    this.resolveConfirm(true);
  }

  cancelConfirm(): void {
    this.resolveConfirm(false);
  }

  closeConfirm(): void {
    this.cancelConfirm();
  }

  private resolveConfirm(confirmed: boolean): void {
    if (this.confirmResolver) {
      this.confirmResolver(confirmed);
      this.confirmResolver = null;
    }

    this.confirmStateSubject.next({
      isOpen: false,
      options: null,
    });
  }
}

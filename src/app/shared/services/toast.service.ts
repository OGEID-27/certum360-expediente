import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastOptions = {
  message: string;
  type: ToastType;
  durationMs?: number;
};

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
};

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  private readonly timeoutHandles = new Map<string, number>();

  readonly toasts$: Observable<ToastItem[]> = this.toastsSubject.asObservable();

  show(options: ToastOptions): string {
    const toast: ToastItem = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
      message: options.message,
      type: options.type,
      durationMs: options.durationMs ?? 3000,
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    if (toast.durationMs > 0) {
      const timeoutId = globalThis.setTimeout(() => {
        this.remove(toast.id);
      }, toast.durationMs);

      this.timeoutHandles.set(toast.id, timeoutId);
    }

    return toast.id;
  }

  remove(id: string): void {
    const timeoutId = this.timeoutHandles.get(id);
    if (typeof timeoutId === 'number') {
      globalThis.clearTimeout(timeoutId);
      this.timeoutHandles.delete(id);
    }

    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }
}

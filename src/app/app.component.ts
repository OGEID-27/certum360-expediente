import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalStorageEvaluacionesRepository } from './features/evaluaciones/services/local-storage-evaluaciones.repository';
import { ConfirmModalComponent } from './shared/components/ui/confirm-modal/confirm-modal.component';
import { ToastHostComponent } from './shared/components/ui/toast-host/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    ConfirmModalComponent,
    ToastHostComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly _evaluacionesRepository = inject(LocalStorageEvaluacionesRepository);
  title = 'Angular Ecommerce Dashboard | TailAdmin';
}

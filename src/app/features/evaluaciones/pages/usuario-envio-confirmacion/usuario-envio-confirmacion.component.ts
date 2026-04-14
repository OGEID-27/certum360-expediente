import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BadgeCheck,
  Clock3,
  Info,
  LucideAngularModule,
} from 'lucide-angular';
import { Attempt, Questionnaire } from '../../models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../services/assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';

@Component({
  selector: 'app-usuario-envio-confirmacion',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './usuario-envio-confirmacion.component.html',
})
export class UsuarioEnvioConfirmacionComponent {
  readonly BadgeCheck = BadgeCheck;
  readonly Info = Info;
  readonly Clock3 = Clock3;

  attempt?: Attempt;
  assignment?: EvaluationAssignment;
  assignedUser?: EvaluationAssignmentUser;
  questionnaire?: Questionnaire;
  loadError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly repository: LocalStorageEvaluacionesRepository,
  ) {
    this.loadData();
  }

  goToEvaluations(): void {
    this.router.navigate(['/evaluaciones/usuario/mis-evaluaciones']);
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private loadData(): void {
    const attemptId = this.route.snapshot.paramMap.get('attemptId');
    if (!attemptId) {
      this.loadError = 'No se encontro el envio solicitado.';
      return;
    }

    const attempt = this.repository.getAttemptById(attemptId);
    if (!attempt) {
      this.loadError = 'El intento enviado no existe.';
      return;
    }

    const assignment = this.assignmentsStorage.getById(attempt.assignmentId);
    if (!assignment) {
      this.loadError = 'La asignacion asociada no existe.';
      return;
    }

    const assignedUser = assignment.users.find(
      (user) =>
        user.userId === attempt.userId &&
        (!attempt.questionnaireId || user.questionnaireId === attempt.questionnaireId),
    );
    if (!assignedUser) {
      this.loadError = 'No se encontro el cuestionario enviado.';
      return;
    }

    const questionnaire = this.repository
      .getQuestionnaires()
      .find((item) => item.id === assignedUser.questionnaireId);

    this.attempt = attempt;
    this.assignment = assignment;
    this.assignedUser = assignedUser;
    this.questionnaire = questionnaire;
  }
}

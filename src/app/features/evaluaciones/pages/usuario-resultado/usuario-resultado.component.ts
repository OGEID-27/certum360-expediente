import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  Clock3,
  Eye,
  Info,
  LucideAngularModule,
} from 'lucide-angular';
import { Attempt, Certification, Questionnaire } from '../../models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../services/assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import {
  DemoAttemptMetrics,
  UserEvaluationsDemoService,
} from '../../services/user-evaluations-demo.service';

@Component({
  selector: 'app-usuario-resultado',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './usuario-resultado.component.html',
})
export class UsuarioResultadoComponent {
  readonly BadgeCheck = BadgeCheck;
  readonly BadgeX = BadgeX;
  readonly Info = Info;
  readonly Clock3 = Clock3;
  readonly ArrowLeft = ArrowLeft;
  readonly Eye = Eye;

  attempt?: Attempt;
  assignment?: EvaluationAssignment;
  assignedUser?: EvaluationAssignmentUser;
  questionnaire?: Questionnaire;
  certification?: Certification;
  metrics?: DemoAttemptMetrics;
  loadError = '';
  showDetails = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly demoService: UserEvaluationsDemoService,
  ) {
    this.loadData();
  }

  get isScored(): boolean {
    return !!this.metrics?.isScored;
  }

  get isPassed(): boolean {
    return this.metrics?.passed !== false;
  }

  get pageTitle(): string {
    if (!this.isScored) {
      return 'Cuestionario completado';
    }

    return this.isPassed ? 'Cuestionario aprobado' : 'Cuestionario finalizado';
  }

  get subtitle(): string {
    return this.assignment?.certificationName || this.questionnaire?.nombre || 'Resultado';
  }

  get statusLabel(): string {
    if (!this.isScored) {
      return 'Completado';
    }

    return this.isPassed ? 'Aprobado' : 'Reprobado';
  }

  get scoreLabel(): string {
    if (!this.isScored || this.metrics?.scorePercent === null) {
      return 'Sin score';
    }

    return `${this.metrics?.scorePercent}%`;
  }

  getStatusClass(): string {
    if (!this.isScored) {
      return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
    }

    return this.isPassed
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
  }

  getAreaChipClass(area: string): string {
    const normalized = area.trim().toLowerCase();
    if (normalized === 'sistemas' || normalized === 'operaciones') {
      return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
    }

    if (normalized === 'contaduria' || normalized === 'legal') {
      return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
    }

    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  goBack(): void {
    this.router.navigate(['/evaluaciones/usuario/mis-evaluaciones']);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private loadData(): void {
    const attemptId = this.route.snapshot.paramMap.get('attemptId');
    if (!attemptId) {
      this.loadError = 'No se encontro el intento solicitado.';
      return;
    }

    const attempt = this.repository.getAttemptById(attemptId);
    if (!attempt) {
      this.loadError = 'El intento no existe.';
      return;
    }

    const assignment = this.assignmentsStorage.getById(attempt.assignmentId);
    if (!assignment) {
      this.loadError = 'La asignacion asociada no existe.';
      return;
    }

    const assignedUser = assignment.users.find((user) => user.userId === attempt.userId);
    if (!assignedUser) {
      this.loadError = 'No se encontro el usuario asignado para este intento.';
      return;
    }

    const questionnaire = this.repository
      .getQuestionnaires()
      .find((item) => item.id === assignedUser.questionnaireId);

    if (!questionnaire) {
      this.loadError = 'El cuestionario asociado no existe.';
      return;
    }

    if (attempt.reviewStatus === 'PENDING_REVIEW') {
      this.loadError =
        'Este intento aun esta pendiente de calificacion. El resultado no esta disponible.';
      return;
    }

    this.attempt = attempt;
    this.assignment = assignment;
    this.assignedUser = assignedUser;
    this.questionnaire = questionnaire;
    this.certification = this.repository
      .getCertifications()
      .find((item) => item.id === assignment.certificationId);
    this.metrics = this.demoService.getAttemptMetrics(questionnaire, attempt);
  }
}

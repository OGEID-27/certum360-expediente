import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Users, X } from 'lucide-angular';
import { EvaluationAssignment } from '../../services/assignments-storage.service';

export interface AssignmentDrawerQuestionnaire {
  id: string;
  name: string;
  area: string;
}

export interface AssignmentDrawerUser {
  id: string;
  fullName: string;
  userArea: string;
  email?: string;
  secondaryText?: string;
  missing?: boolean;
  statusLabel?: string;
  questionnaires: AssignmentDrawerQuestionnaire[];
}

@Component({
  selector: 'app-admin-asignaciones-users-drawer',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-asignaciones-users-drawer.component.html',
})
export class AdminAsignacionesUsersDrawerComponent
  implements OnChanges, OnDestroy
{
  @Input() isOpen = false;
  @Input() assignment: EvaluationAssignment | null = null;
  @Input() users: AssignmentDrawerUser[] = [];

  @Output() closed = new EventEmitter<void>();

  readonly Users = Users;
  readonly Search = Search;
  readonly X = X;

  searchTerm = '';
  isPanelVisible = false;
  isOverlayVisible = false;

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue) {
        this.searchTerm = '';
        this.playOpenAnimation();
      } else {
        this.clearTimers();
        this.isOverlayVisible = false;
        this.isPanelVisible = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  get filteredUsers(): AssignmentDrawerUser[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.users;
    }

    return this.users.filter((user) => {
      const haystack = [
        user.fullName,
        user.email,
        user.secondaryText,
        user.userArea,
        user.statusLabel,
        ...user.questionnaires.map((questionnaire) => questionnaire.name),
        ...user.questionnaires.map((questionnaire) => questionnaire.area),
      ]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  get assignedSummary(): string {
    return `Usuarios asignados con cuestionario: ${this.users.length}/${this.users.length}`;
  }

  closeDrawer(): void {
    if (this.closeAnimationTimer) {
      return;
    }

    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.closeAnimationTimer = setTimeout(() => {
      this.closeAnimationTimer = null;
      this.closed.emit();
    }, 300);
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

  isAreaMismatch(user: AssignmentDrawerUser): boolean {
    return user.questionnaires.some(
      (questionnaire) =>
        user.userArea.trim().toLowerCase() !== questionnaire.area.trim().toLowerCase(),
    );
  }

  private playOpenAnimation(): void {
    this.clearTimers();
    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.openAnimationTimer = setTimeout(() => {
      this.isOverlayVisible = true;
      this.isPanelVisible = true;
      this.openAnimationTimer = null;
    }, 10);
  }

  private clearTimers(): void {
    if (this.openAnimationTimer) {
      clearTimeout(this.openAnimationTimer);
      this.openAnimationTimer = null;
    }

    if (this.closeAnimationTimer) {
      clearTimeout(this.closeAnimationTimer);
      this.closeAnimationTimer = null;
    }
  }
}

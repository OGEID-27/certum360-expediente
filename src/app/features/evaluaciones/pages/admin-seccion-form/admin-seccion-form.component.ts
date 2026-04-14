import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  Check,
  List,
  LucideAngularModule,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { Question, Section } from '../../models';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import {
  SectionQuestionWeight,
  WeightsStorageService,
} from '../../services/weights-storage.service';
import { WeightsValidator } from '../../services/weights-validator';

type EditableQuestionRow = {
  questionId: string;
  title: string;
  included: boolean;
  isScored: boolean;
  weight: number;
};

@Component({
  selector: 'app-admin-seccion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragDropModule,
    ComponentCardComponent,
  ],
  templateUrl: './admin-seccion-form.component.html',
  styles: [`
    :host ::ng-deep .admin-drop-zone {
      transition: border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease;
    }

    :host ::ng-deep .admin-drop-zone.cdk-drop-list-receiving,
    :host ::ng-deep .admin-drop-zone.cdk-drop-list-dragging {
      border-color: rgba(59, 130, 246, 0.45);
      background-color: rgba(59, 130, 246, 0.07);
      box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
    }

    :host ::ng-deep .admin-dnd-item {
      transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease, background-color 220ms ease;
    }

    :host ::ng-deep .admin-dnd-item.cdk-drag-preview {
      border-color: rgba(59, 130, 246, 0.45);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
      backdrop-filter: blur(6px);
    }

    :host-context(.dark) ::ng-deep .admin-dnd-item.cdk-drag-preview {
      background: rgba(17, 24, 39, 0.92);
      border-color: rgba(96, 165, 250, 0.55);
      box-shadow: 0 16px 36px rgba(2, 6, 23, 0.62);
    }

    :host ::ng-deep .admin-dnd-item.cdk-drag-animating {
      transition: transform 240ms cubic-bezier(0.2, 0, 0, 1);
    }

    :host ::ng-deep .admin-dnd-placeholder {
      border: 1px dashed rgba(148, 163, 184, 0.9);
      background: rgba(148, 163, 184, 0.16);
      border-radius: 0.75rem;
    }

    :host ::ng-deep .admin-dnd-placeholder-rich {
      min-height: 104px;
    }

    :host ::ng-deep .admin-dnd-placeholder-compact {
      min-height: 56px;
    }

    :host-context(.dark) ::ng-deep .admin-dnd-placeholder {
      border-color: rgba(100, 116, 139, 0.9);
      background: rgba(30, 41, 59, 0.5);
    }
  `],
})
export class AdminSeccionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Save = Save;
  readonly Check = Check;
  readonly X = X;
  readonly Search = Search;
  readonly List = List;
  readonly Trash2 = Trash2;
  readonly Math = Math;

  readonly includedDropListId = 'section-included-drop-list';
  readonly bankDropListId = 'section-bank-drop-list';

  editingSectionId: string | null = null;
  questions: Question[] = [];
  includedRows: EditableQuestionRow[] = [];
  bankRows: EditableQuestionRow[] = [];
  bankSearchTerm = '';
  justAddedRowId: string | null = null;

  sectionForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: [''],
    isScored: [true],
  });

  constructor(
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly weightsStorage: WeightsStorageService,
  ) {
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.editingSectionId ? 'Editar seccion' : 'Nueva seccion';
  }

  get selectedRows(): EditableQuestionRow[] {
    return this.includedRows;
  }

  get isScored(): boolean {
    return !!this.sectionForm.get('isScored')?.value;
  }

  get totalAssigned(): number {
    return WeightsValidator.sumWeights(
      this.selectedRows.map((row) => ({
        isScored: row.isScored,
        weight: row.weight,
      })),
    );
  }

  get isTotalReady(): boolean {
    return WeightsValidator.hasExactTotal(this.totalAssigned);
  }

  get canPublish(): boolean {
    return WeightsValidator.canPublish(this.isScored, this.totalAssigned);
  }

  get filteredBankRows(): EditableQuestionRow[] {
    const term = this.bankSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.bankRows;
    }

    return this.bankRows.filter((row) => row.title.toLowerCase().includes(term));
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  onBankSearch(term: string): void {
    this.bankSearchTerm = term;
  }

  setIsScored(value: boolean): void {
    this.sectionForm.patchValue({ isScored: value });

    if (!value) {
      this.includedRows.forEach((row) => {
        row.isScored = false;
        row.weight = 0;
      });
      return;
    }

    this.includedRows.forEach((row) => {
      row.isScored = true;
    });
  }

  addQuestionFromBank(row: EditableQuestionRow): void {
    this.addQuestionById(row.questionId);
  }

  removeIncludedQuestion(row: EditableQuestionRow): void {
    const index = this.includedRows.findIndex((item) => item.questionId === row.questionId);
    if (index < 0) {
      return;
    }

    const removed = this.includedRows.splice(index, 1)[0];
    removed.included = false;
    removed.isScored = false;
    removed.weight = 0;
    this.bankRows.push(removed);
    this.sortBankRows();
  }

  dropIncludedQuestions(event: CdkDragDrop<EditableQuestionRow[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.includedRows, event.previousIndex, event.currentIndex);
      return;
    }

    const dragged = event.item.data as EditableQuestionRow | undefined;
    if (!dragged) {
      return;
    }

    this.addQuestionById(dragged.questionId);
  }

  toggleQuestionScored(row: EditableQuestionRow, checked: boolean): void {
    if (!this.isScored) {
      row.isScored = false;
      row.weight = 0;
      return;
    }

    row.isScored = checked;
    if (!checked) {
      row.weight = 0;
      return;
    }

    const maxAllowed = this.getMaxWeightForRow(row);
    row.weight = Math.min(WeightsValidator.normalizeWeight(row.weight), maxAllowed);
  }

  onWeightChange(row: EditableQuestionRow, value: string | number): void {
    if (!this.isScored || !row.isScored) {
      row.weight = 0;
      return;
    }

    const normalized = WeightsValidator.normalizeWeight(value);
    const maxAllowed = this.getMaxWeightForRow(row);
    row.weight = Math.min(normalized, maxAllowed);
  }

  getMaxWeightForRow(row: EditableQuestionRow): number {
    const othersTotal = this.selectedRows
      .filter((candidate) => candidate.questionId !== row.questionId)
      .reduce((acc, candidate) => {
        if (!candidate.isScored) {
          return acc;
        }

        return acc + WeightsValidator.normalizeWeight(candidate.weight);
      }, 0);

    return WeightsValidator.getMaxAllowedForRow(othersTotal);
  }

  saveDraft(): void {
    this.persist('DRAFT');
  }

  publish(): void {
    if (!this.canPublish) {
      this.toastService.show({
        type: 'warning',
        message: 'Para publicar la seccion evaluable, el total debe ser exactamente 100%.',
        durationMs: 3500,
      });
      return;
    }

    this.persist('READY');
  }

  private persist(status: 'DRAFT' | 'READY'): void {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    const section = this.repository.saveSection({
      id: this.editingSectionId ?? undefined,
      nombre: this.sectionForm.get('nombre')?.value?.trim() ?? '',
      descripcion: this.sectionForm.get('descripcion')?.value?.trim() || undefined,
      questionIds: this.selectedRows.map((row) => row.questionId),
    });

    const isScored = this.isScored;
    const questionWeights: SectionQuestionWeight[] = this.selectedRows.map((row) => ({
      questionId: row.questionId,
      isScored: isScored ? row.isScored : false,
      weight: isScored && row.isScored ? WeightsValidator.normalizeWeight(row.weight) : 0,
    }));

    this.weightsStorage.saveSectionWeight(section.id, {
      isScored,
      status,
      questions: questionWeights,
    });

    this.toastService.show({
      type: 'success',
      message: status === 'READY' ? 'Seccion publicada' : 'Seccion guardada como borrador',
      durationMs: 3000,
    });

    this.goToList();
  }

  private initializeFromRoute(): void {
    this.questions = this.repository.getQuestions();

    this.route.paramMap.subscribe((params) => {
      const sectionId = params.get('id');
      this.editingSectionId = sectionId;

      if (!sectionId) {
        this.sectionForm.reset({
          nombre: '',
          descripcion: '',
          isScored: true,
        });

        const rows = this.questions.map((question) => ({
          questionId: question.id,
          title: question.titulo,
          included: false,
          isScored: false,
          weight: 0,
        }));

        this.assignRows(rows);
        return;
      }

      const section = this.repository.getSections().find((item) => item.id === sectionId);
      if (!section) {
        this.goToList();
        return;
      }

      this.loadSection(section);
    });
  }

  private loadSection(section: Section): void {
    const weightEntry = this.weightsStorage.getSectionWeight(section.id);
    const selectedQuestionIds = new Set(section.questionIds);
    const weightsByQuestionId = new Map(
      (weightEntry?.questions ?? []).map((entry) => [entry.questionId, entry]),
    );

    this.sectionForm.patchValue({
      nombre: section.nombre,
      descripcion: section.descripcion ?? '',
      isScored: weightEntry?.isScored ?? true,
    });

    const rows = this.questions.map((question) => {
      const included = selectedQuestionIds.has(question.id);
      const questionWeight = weightsByQuestionId.get(question.id);
      const isScored =
        included &&
        !!(weightEntry?.isScored ?? true) &&
        !!questionWeight?.isScored;

      return {
        questionId: question.id,
        title: question.titulo,
        included,
        isScored,
        weight: isScored ? WeightsValidator.normalizeWeight(questionWeight?.weight ?? 0) : 0,
      };
    });

    this.assignRows(rows);
  }

  private assignRows(rows: EditableQuestionRow[]): void {
    this.includedRows = rows.filter((row) => row.included);
    this.bankRows = rows.filter((row) => !row.included);
    this.sortBankRows();
  }

  private addQuestionById(questionId: string): void {
    if (this.includedRows.some((row) => row.questionId === questionId)) {
      this.toastService.show({
        type: 'info',
        message: 'La pregunta ya esta incluida.',
        durationMs: 1800,
      });
      return;
    }

    const bankIndex = this.bankRows.findIndex((row) => row.questionId === questionId);
    if (bankIndex < 0) {
      return;
    }

    const row = this.bankRows.splice(bankIndex, 1)[0];
    row.included = true;
    row.isScored = this.isScored;
    row.weight = 0;

    this.includedRows.push(row);
    this.markAsJustAdded(row.questionId);
  }

  private markAsJustAdded(questionId: string): void {
    this.justAddedRowId = questionId;
    globalThis.setTimeout(() => {
      if (this.justAddedRowId === questionId) {
        this.justAddedRowId = null;
      }
    }, 650);
  }

  private sortBankRows(): void {
    this.bankRows.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/secciones']);
  }
}

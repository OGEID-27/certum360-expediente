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
import { Questionnaire, Section } from '../../models';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import {
  QuestionnaireSectionWeight,
  WeightsStorageService,
} from '../../services/weights-storage.service';
import { WeightsValidator } from '../../services/weights-validator';

type EditableSectionRow = {
  sectionId: string;
  title: string;
  included: boolean;
  isScored: boolean;
  weight: number;
};

@Component({
  selector: 'app-admin-cuestionario-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragDropModule,
    ComponentCardComponent,
  ],
  templateUrl: './admin-cuestionario-form.component.html',
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
export class AdminCuestionarioFormComponent {
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

  readonly includedDropListId = 'questionnaire-included-drop-list';
  readonly bankDropListId = 'questionnaire-bank-drop-list';

  editingQuestionnaireId: string | null = null;
  sections: Section[] = [];
  includedRows: EditableSectionRow[] = [];
  bankRows: EditableSectionRow[] = [];
  bankSearchTerm = '';
  justAddedRowId: string | null = null;

  questionnaireForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: [''],
    isScored: [true],
    enableTimeLimit: [false],
    timeLimitMinutes: [null as number | null],
    enableMaxAttempts: [false],
    maxAttempts: [null as number | null],
    activeFrom: [''],
    activeTo: [''],
  });

  constructor(
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly weightsStorage: WeightsStorageService,
  ) {
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.editingQuestionnaireId ? 'Editar cuestionario' : 'Nuevo cuestionario';
  }

  get selectedRows(): EditableSectionRow[] {
    return this.includedRows;
  }

  get isScored(): boolean {
    return !!this.questionnaireForm.get('isScored')?.value;
  }

  get isTimeLimitEnabled(): boolean {
    return !!this.questionnaireForm.get('enableTimeLimit')?.value;
  }

  get isMaxAttemptsEnabled(): boolean {
    return !!this.questionnaireForm.get('enableMaxAttempts')?.value;
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

  get filteredBankRows(): EditableSectionRow[] {
    const term = this.bankSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.bankRows;
    }

    return this.bankRows.filter((row) => row.title.toLowerCase().includes(term));
  }

  get isDateRangeInvalid(): boolean {
    const from = this.questionnaireForm.get('activeFrom')?.value;
    const to = this.questionnaireForm.get('activeTo')?.value;

    if (!from || !to) {
      return false;
    }

    return Date.parse(to) < Date.parse(from);
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

  onEnableTimeLimitChange(enabled: boolean): void {
    this.questionnaireForm.patchValue({ enableTimeLimit: enabled });

    if (!enabled) {
      this.questionnaireForm.patchValue({ timeLimitMinutes: null });
    }
  }

  onEnableMaxAttemptsChange(enabled: boolean): void {
    this.questionnaireForm.patchValue({ enableMaxAttempts: enabled });

    if (!enabled) {
      this.questionnaireForm.patchValue({ maxAttempts: null });
    }
  }

  setIsScored(value: boolean): void {
    this.questionnaireForm.patchValue({ isScored: value });

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

  addSectionFromBank(row: EditableSectionRow): void {
    this.addSectionById(row.sectionId);
  }

  removeIncludedSection(row: EditableSectionRow): void {
    const index = this.includedRows.findIndex((item) => item.sectionId === row.sectionId);
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

  dropIncludedSections(event: CdkDragDrop<EditableSectionRow[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.includedRows, event.previousIndex, event.currentIndex);
      return;
    }

    const dragged = event.item.data as EditableSectionRow | undefined;
    if (!dragged) {
      return;
    }

    this.addSectionById(dragged.sectionId);
  }

  toggleSectionScored(row: EditableSectionRow, checked: boolean): void {
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

  onWeightChange(row: EditableSectionRow, value: string | number): void {
    if (!this.isScored || !row.isScored) {
      row.weight = 0;
      return;
    }

    const normalized = WeightsValidator.normalizeWeight(value);
    const maxAllowed = this.getMaxWeightForRow(row);
    row.weight = Math.min(normalized, maxAllowed);
  }

  getMaxWeightForRow(row: EditableSectionRow): number {
    const othersTotal = this.selectedRows
      .filter((candidate) => candidate.sectionId !== row.sectionId)
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
        message: 'Para publicar el cuestionario evaluable, el total debe ser exactamente 100%.',
        durationMs: 3500,
      });
      return;
    }

    this.persist('READY');
  }

  private persist(status: 'DRAFT' | 'READY'): void {
    if (this.questionnaireForm.invalid) {
      this.questionnaireForm.markAllAsTouched();
      return;
    }

    if (this.isDateRangeInvalid) {
      this.toastService.show({
        type: 'warning',
        message: 'Activo hasta no puede ser menor a Activo desde.',
        durationMs: 3200,
      });
      return;
    }

    const timeLimitMinutes = this.questionnaireForm.get('timeLimitMinutes')?.value;
    const maxAttempts = this.questionnaireForm.get('maxAttempts')?.value;

    if (this.isTimeLimitEnabled && (!timeLimitMinutes || timeLimitMinutes <= 0)) {
      this.toastService.show({
        type: 'warning',
        message: 'El tiempo limite debe ser mayor a 0 minutos.',
        durationMs: 3200,
      });
      return;
    }

    if (this.isMaxAttemptsEnabled && (!maxAttempts || maxAttempts < 1)) {
      this.toastService.show({
        type: 'warning',
        message: 'El maximo de intentos debe ser al menos 1.',
        durationMs: 3200,
      });
      return;
    }

    const questionnaire = this.repository.saveQuestionnaire({
      id: this.editingQuestionnaireId ?? undefined,
      nombre: this.questionnaireForm.get('nombre')?.value?.trim() ?? '',
      descripcion: this.questionnaireForm.get('descripcion')?.value?.trim() || undefined,
      sectionIds: this.selectedRows.map((row) => row.sectionId),
      settings: {
        timeLimitMinutes: this.isTimeLimitEnabled ? timeLimitMinutes ?? undefined : undefined,
        maxAttempts: this.isMaxAttemptsEnabled ? maxAttempts ?? undefined : undefined,
        activeFrom: this.questionnaireForm.get('activeFrom')?.value || undefined,
        activeTo: this.questionnaireForm.get('activeTo')?.value || undefined,
      },
    });

    const isScored = this.isScored;
    const sectionWeights: QuestionnaireSectionWeight[] = this.selectedRows.map((row) => ({
      sectionId: row.sectionId,
      isScored: isScored ? row.isScored : false,
      weight: isScored && row.isScored ? WeightsValidator.normalizeWeight(row.weight) : 0,
    }));

    this.weightsStorage.saveQuestionnaireWeight(questionnaire.id, {
      isScored,
      status,
      sections: sectionWeights,
    });

    this.toastService.show({
      type: 'success',
      message: status === 'READY' ? 'Cuestionario publicado' : 'Cuestionario guardado como borrador',
      durationMs: 3000,
    });

    this.goToList();
  }

  private initializeFromRoute(): void {
    this.sections = this.repository.getSections();

    this.route.paramMap.subscribe((params) => {
      const questionnaireId = params.get('id');
      this.editingQuestionnaireId = questionnaireId;

      if (!questionnaireId) {
        this.questionnaireForm.reset({
          nombre: '',
          descripcion: '',
          isScored: true,
          enableTimeLimit: false,
          timeLimitMinutes: null,
          enableMaxAttempts: false,
          maxAttempts: null,
          activeFrom: '',
          activeTo: '',
        });

        const rows = this.sections.map((section) => ({
          sectionId: section.id,
          title: section.nombre,
          included: false,
          isScored: false,
          weight: 0,
        }));

        this.assignRows(rows);
        return;
      }

      const questionnaire = this.repository
        .getQuestionnaires()
        .find((item) => item.id === questionnaireId);

      if (!questionnaire) {
        this.goToList();
        return;
      }

      this.loadQuestionnaire(questionnaire);
    });
  }

  private loadQuestionnaire(questionnaire: Questionnaire): void {
    const weightEntry = this.weightsStorage.getQuestionnaireWeight(questionnaire.id);
    const selectedSectionIds = new Set(questionnaire.sectionIds);
    const weightsBySectionId = new Map(
      (weightEntry?.sections ?? []).map((entry) => [entry.sectionId, entry]),
    );

    const timeLimitMinutes = questionnaire.settings.timeLimitMinutes ?? null;
    const maxAttempts = questionnaire.settings.maxAttempts ?? null;

    this.questionnaireForm.patchValue({
      nombre: questionnaire.nombre,
      descripcion: questionnaire.descripcion ?? '',
      isScored: weightEntry?.isScored ?? true,
      enableTimeLimit: typeof timeLimitMinutes === 'number' && timeLimitMinutes > 0,
      timeLimitMinutes,
      enableMaxAttempts: typeof maxAttempts === 'number' && maxAttempts > 0,
      maxAttempts,
      activeFrom: questionnaire.settings.activeFrom ?? '',
      activeTo: questionnaire.settings.activeTo ?? '',
    });

    const rows = this.sections.map((section) => {
      const included = selectedSectionIds.has(section.id);
      const sectionWeight = weightsBySectionId.get(section.id);
      const isScored =
        included &&
        !!(weightEntry?.isScored ?? true) &&
        !!sectionWeight?.isScored;

      return {
        sectionId: section.id,
        title: section.nombre,
        included,
        isScored,
        weight: isScored ? WeightsValidator.normalizeWeight(sectionWeight?.weight ?? 0) : 0,
      };
    });

    this.assignRows(rows);
  }

  private assignRows(rows: EditableSectionRow[]): void {
    this.includedRows = rows.filter((row) => row.included);
    this.bankRows = rows.filter((row) => !row.included);
    this.sortBankRows();
  }

  private addSectionById(sectionId: string): void {
    if (this.includedRows.some((row) => row.sectionId === sectionId)) {
      this.toastService.show({
        type: 'info',
        message: 'La seccion ya esta incluida.',
        durationMs: 1800,
      });
      return;
    }

    const bankIndex = this.bankRows.findIndex((row) => row.sectionId === sectionId);
    if (bankIndex < 0) {
      return;
    }

    const row = this.bankRows.splice(bankIndex, 1)[0];
    row.included = true;
    row.isScored = this.isScored;
    row.weight = 0;

    this.includedRows.push(row);
    this.markAsJustAdded(row.sectionId);
  }

  private markAsJustAdded(sectionId: string): void {
    this.justAddedRowId = sectionId;
    globalThis.setTimeout(() => {
      if (this.justAddedRowId === sectionId) {
        this.justAddedRowId = null;
      }
    }, 650);
  }

  private sortBankRows(): void {
    this.bankRows.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/cuestionarios']);
  }
}

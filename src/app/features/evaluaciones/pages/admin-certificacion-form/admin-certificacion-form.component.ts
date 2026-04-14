import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  Check,
  Eye,
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
import { Certification, Questionnaire } from '../../models';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import {
  CertificationQuestionnaireWeight,
  WeightsStorageService,
} from '../../services/weights-storage.service';
import { WeightsValidator } from '../../services/weights-validator';

type EditableQuestionnaireRow = {
  questionnaireId: string;
  title: string;
  included: boolean;
  isScored: boolean;
  weight: number;
};

@Component({
  selector: 'app-admin-certificacion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragDropModule,
    ComponentCardComponent,
  ],
  templateUrl: './admin-certificacion-form.component.html',
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
export class AdminCertificacionFormComponent {
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
  readonly Eye = Eye;
  readonly Search = Search;
  readonly List = List;
  readonly Trash2 = Trash2;
  readonly Math = Math;

  readonly includedDropListId = 'certification-included-drop-list';
  readonly bankDropListId = 'certification-bank-drop-list';

  editingCertificationId: string | null = null;
  questionnaires: Questionnaire[] = [];
  includedRows: EditableQuestionnaireRow[] = [];
  bankRows: EditableQuestionnaireRow[] = [];
  bankSearchTerm = '';
  justAddedRowId: string | null = null;

  certificationForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: [''],
    passScore: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
    isScored: [true],
  });

  constructor(
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly weightsStorage: WeightsStorageService,
  ) {
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.editingCertificationId ? 'Editar certificacion' : 'Nueva certificacion';
  }

  get selectedRows(): EditableQuestionnaireRow[] {
    return this.includedRows;
  }

  get isScored(): boolean {
    return !!this.certificationForm.get('isScored')?.value;
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

  get passScoreValue(): number {
    return WeightsValidator.normalizeWeight(this.certificationForm.get('passScore')?.value ?? 80);
  }

  get filteredBankRows(): EditableQuestionnaireRow[] {
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

  goToPreview(): void {
    if (!this.editingCertificationId) {
      return;
    }

    this.router.navigate([
      '/evaluaciones/admin/certificaciones',
      this.editingCertificationId,
      'preview',
    ]);
  }

  onBankSearch(term: string): void {
    this.bankSearchTerm = term;
  }

  onPassScoreInput(value: string | number): void {
    const normalized = WeightsValidator.normalizeWeight(value);
    this.certificationForm.patchValue({ passScore: normalized });
  }

  setIsScored(value: boolean): void {
    this.certificationForm.patchValue({ isScored: value });

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

  addQuestionnaireFromBank(row: EditableQuestionnaireRow): void {
    this.addQuestionnaireById(row.questionnaireId);
  }

  removeIncludedQuestionnaire(row: EditableQuestionnaireRow): void {
    const index = this.includedRows.findIndex(
      (item) => item.questionnaireId === row.questionnaireId,
    );

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

  dropIncludedQuestionnaires(event: CdkDragDrop<EditableQuestionnaireRow[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.includedRows, event.previousIndex, event.currentIndex);
      return;
    }

    const dragged = event.item.data as EditableQuestionnaireRow | undefined;
    if (!dragged) {
      return;
    }

    this.addQuestionnaireById(dragged.questionnaireId);
  }

  toggleQuestionnaireScored(row: EditableQuestionnaireRow, checked: boolean): void {
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

  onWeightChange(row: EditableQuestionnaireRow, value: string | number): void {
    if (!this.isScored || !row.isScored) {
      row.weight = 0;
      return;
    }

    const normalized = WeightsValidator.normalizeWeight(value);
    const maxAllowed = this.getMaxWeightForRow(row);
    row.weight = Math.min(normalized, maxAllowed);
  }

  getMaxWeightForRow(row: EditableQuestionnaireRow): number {
    const othersTotal = this.selectedRows
      .filter((candidate) => candidate.questionnaireId !== row.questionnaireId)
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
        message: 'Para publicar la certificacion evaluable, el total debe ser exactamente 100%.',
        durationMs: 3500,
      });
      return;
    }

    this.persist('READY');
  }

  private persist(status: 'DRAFT' | 'READY'): void {
    if (this.certificationForm.invalid) {
      this.certificationForm.markAllAsTouched();
      return;
    }

    const passScore = this.passScoreValue;

    const certification = this.repository.saveCertification({
      id: this.editingCertificationId ?? undefined,
      nombre: this.certificationForm.get('nombre')?.value?.trim() ?? '',
      descripcion: this.certificationForm.get('descripcion')?.value?.trim() || undefined,
      questionnaireIds: this.selectedRows.map((row) => row.questionnaireId),
      rules: {
        requireAll: true,
        minScore: passScore,
      },
    });

    const isScored = this.isScored;
    const questionnaireWeights: CertificationQuestionnaireWeight[] = this.selectedRows.map((row) => ({
      questionnaireId: row.questionnaireId,
      isScored: isScored ? row.isScored : false,
      weight: isScored && row.isScored ? WeightsValidator.normalizeWeight(row.weight) : 0,
    }));

    this.weightsStorage.saveCertificationWeight(certification.id, {
      isScored,
      passScore,
      status,
      questionnaires: questionnaireWeights,
    });

    this.toastService.show({
      type: 'success',
      message: status === 'READY' ? 'Certificacion publicada' : 'Certificacion guardada como borrador',
      durationMs: 3000,
    });

    this.goToList();
  }

  private initializeFromRoute(): void {
    this.questionnaires = this.repository.getQuestionnaires();

    this.route.paramMap.subscribe((params) => {
      const certificationId = params.get('id');
      this.editingCertificationId = certificationId;

      if (!certificationId) {
        this.certificationForm.reset({
          nombre: '',
          descripcion: '',
          passScore: 80,
          isScored: true,
        });

        const rows = this.questionnaires.map((questionnaire) => ({
          questionnaireId: questionnaire.id,
          title: questionnaire.nombre,
          included: false,
          isScored: false,
          weight: 0,
        }));

        this.assignRows(rows);
        return;
      }

      const certification = this.repository
        .getCertifications()
        .find((item) => item.id === certificationId);

      if (!certification) {
        this.goToList();
        return;
      }

      this.loadCertification(certification);
    });
  }

  private loadCertification(certification: Certification): void {
    const weightEntry = this.weightsStorage.getCertificationWeight(certification.id);
    const selectedQuestionnaireIds = new Set(certification.questionnaireIds);
    const weightsByQuestionnaireId = new Map(
      (weightEntry?.questionnaires ?? []).map((entry) => [entry.questionnaireId, entry]),
    );

    this.certificationForm.patchValue({
      nombre: certification.nombre,
      descripcion: certification.descripcion ?? '',
      passScore: weightEntry?.passScore ?? certification.rules.minScore ?? 80,
      isScored: weightEntry?.isScored ?? true,
    });

    const rows = this.questionnaires.map((questionnaire) => {
      const included = selectedQuestionnaireIds.has(questionnaire.id);
      const questionnaireWeight = weightsByQuestionnaireId.get(questionnaire.id);
      const isScored =
        included &&
        !!(weightEntry?.isScored ?? true) &&
        !!questionnaireWeight?.isScored;

      return {
        questionnaireId: questionnaire.id,
        title: questionnaire.nombre,
        included,
        isScored,
        weight: isScored ? WeightsValidator.normalizeWeight(questionnaireWeight?.weight ?? 0) : 0,
      };
    });

    this.assignRows(rows);
  }

  private assignRows(rows: EditableQuestionnaireRow[]): void {
    this.includedRows = rows.filter((row) => row.included);
    this.bankRows = rows.filter((row) => !row.included);
    this.sortBankRows();
  }

  private addQuestionnaireById(questionnaireId: string): void {
    if (this.includedRows.some((row) => row.questionnaireId === questionnaireId)) {
      this.toastService.show({
        type: 'info',
        message: 'El cuestionario ya esta incluido.',
        durationMs: 1800,
      });
      return;
    }

    const bankIndex = this.bankRows.findIndex((row) => row.questionnaireId === questionnaireId);
    if (bankIndex < 0) {
      return;
    }

    const row = this.bankRows.splice(bankIndex, 1)[0];
    row.included = true;
    row.isScored = this.isScored;
    row.weight = 0;

    this.includedRows.push(row);
    this.markAsJustAdded(row.questionnaireId);
  }

  private markAsJustAdded(questionnaireId: string): void {
    this.justAddedRowId = questionnaireId;
    globalThis.setTimeout(() => {
      if (this.justAddedRowId === questionnaireId) {
        this.justAddedRowId = null;
      }
    }, 650);
  }

  private sortBankRows(): void {
    this.bankRows.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/certificaciones']);
  }
}

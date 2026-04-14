import { CommonModule } from "@angular/common";
import { Component, OnDestroy, inject } from "@angular/core";
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  Files,
  FolderOpen,
  LucideAngularModule,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-angular";
import { ModalService } from "../../../../shared/services/modal.service";
import { ToastService } from "../../../../shared/services/toast.service";
import {
  ExpedienteDocumentRecord,
  ExpedienteDocumentStatus,
  ExpedienteStorageService,
  SaveExpedienteDocumentPayload,
} from "../../services/expediente-storage.service";

type ExpedienteGeneralStatus =
  | "COMPLETO"
  | "INCOMPLETO"
  | "EN_REVISION"
  | "PENDIENTE";

type DrawerMode = "detail" | "upload" | null;

@Component({
  selector: "app-alta-expediente",
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: "./alta-expediente.component.html",
})
export class AltaExpedienteComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  readonly FolderOpen = FolderOpen;
  readonly Files = Files;
  readonly BadgeCheck = BadgeCheck;
  readonly CircleAlert = CircleAlert;
  readonly Clock3 = Clock3;
  readonly TriangleAlert = TriangleAlert;
  readonly Upload = Upload;
  readonly RefreshCw = RefreshCw;
  readonly Eye = Eye;
  readonly Trash2 = Trash2;
  readonly FileText = FileText;
  readonly X = X;

  documents: ExpedienteDocumentRecord[] = [];
  selectedDocument: ExpedienteDocumentRecord | null = null;

  drawerMode: DrawerMode = null;
  isOverlayVisible = false;
  isPanelVisible = false;

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly uploadForm = this.fb.nonNullable.group({
    documentType: [{ value: "", disabled: true }, Validators.required],
    fileName: ["", [Validators.required, Validators.maxLength(120)]],
    fileSizeLabel: ["1.0 MB", [Validators.required, Validators.maxLength(20)]],
    uploadedAt: [this.getTodayInputValue(), Validators.required],
    status: [
      "EN_REVISION" as SaveExpedienteDocumentPayload["status"],
      Validators.required,
    ],
    observations: ["", [Validators.maxLength(240)]],
  });

  readonly uploadStatusOptions: Array<{
    value: SaveExpedienteDocumentPayload["status"];
    label: string;
  }> = [
    { value: "EN_REVISION", label: "En revision" },
    { value: "CARGADO", label: "Cargado" },
    { value: "RECHAZADO", label: "Rechazado" },
  ];

  constructor(private readonly expedienteStorage: ExpedienteStorageService) {
    this.refreshDocuments();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  get requiredCount(): number {
    return this.documents.length;
  }

  get uploadedCount(): number {
    return this.documents.filter((document) => !!document.fileName).length;
  }

  get missingCount(): number {
    return this.documents.filter((document) => !document.fileName).length;
  }

  get flaggedCount(): number {
    return this.documents.filter((document) =>
      this.isFlaggedStatus(document.status),
    ).length;
  }

  get completionPercent(): number {
    if (this.requiredCount === 0) {
      return 0;
    }

    return Math.round((this.uploadedCount / this.requiredCount) * 100);
  }

  get lastUpdatedAt(): string | null {
    const timestamps = this.documents
      .map((document) => document.uploadedAt)
      .filter((value): value is string => !!value)
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value));

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
  }

  get generalStatus(): ExpedienteGeneralStatus {
    if (this.uploadedCount === 0) {
      return "PENDIENTE";
    }

    if (this.flaggedCount > 0 || this.missingCount > 0) {
      return "INCOMPLETO";
    }

    if (
      this.documents.some((document) => document.status === "EN_REVISION")
    ) {
      return "EN_REVISION";
    }

    return "COMPLETO";
  }

  get generalStatusLabel(): string {
    if (this.generalStatus === "COMPLETO") {
      return "Completo";
    }

    if (this.generalStatus === "EN_REVISION") {
      return "En revision";
    }

    if (this.generalStatus === "PENDIENTE") {
      return "Pendiente";
    }

    return "Incompleto";
  }

  get summaryMessage(): string {
    if (this.generalStatus === "COMPLETO") {
      return "El expediente documental esta listo para continuar con validaciones.";
    }

    if (this.generalStatus === "EN_REVISION") {
      return "Todos los documentos requeridos estan cargados y al menos uno sigue en revision.";
    }

    if (this.generalStatus === "PENDIENTE") {
      return "Aun no se registran evidencias documentales para este cliente.";
    }

    return "Completa los documentos faltantes y reemplaza los archivos observados para cerrar el expediente.";
  }

  openUploadDrawer(document: ExpedienteDocumentRecord): void {
    this.selectedDocument = document;
    this.uploadForm.reset({
      documentType: document.name,
      fileName: document.fileName ?? this.buildSuggestedFileName(document),
      fileSizeLabel: document.fileSizeLabel ?? this.buildSuggestedFileSize(document),
      uploadedAt: this.formatDateInput(document.uploadedAt),
      status:
        document.status === "VENCIDO" || document.status === "PENDIENTE"
          ? "EN_REVISION"
          : document.status,
      observations:
        document.status === "PENDIENTE"
          ? ""
          : document.observations,
    });

    this.openDrawer("upload");
  }

  openDetailDrawer(document: ExpedienteDocumentRecord): void {
    this.selectedDocument = document;
    this.openDrawer("detail");
  }

  switchToUploadFromDetail(): void {
    if (!this.selectedDocument) {
      return;
    }

    this.openUploadDrawer(this.selectedDocument);
  }

  closeDrawer(): void {
    if (!this.drawerMode || this.closeAnimationTimer) {
      return;
    }

    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.closeAnimationTimer = setTimeout(() => {
      this.drawerMode = null;
      this.selectedDocument = null;
      this.closeAnimationTimer = null;
    }, 300);
  }

  async removeFile(document: ExpedienteDocumentRecord): Promise<void> {
    const confirmed = await this.modalService.openConfirm({
      type: "delete",
      title: "Eliminar archivo dummy",
      message:
        "Esta accion retirara el archivo cargado y marcara el documento como pendiente en el expediente local.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    const updatedDocument = this.expedienteStorage.clearUpload(document.id);
    this.refreshDocuments(updatedDocument?.id ?? null);

    this.toastService.show({
      type: "success",
      message: "Archivo eliminado del expediente",
      durationMs: 2600,
    });
  }

  submitUpload(): void {
    if (!this.selectedDocument) {
      return;
    }

    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const formValue = this.uploadForm.getRawValue();
    const hadExistingFile = !!this.selectedDocument.fileName;
    const updatedDocument = this.expedienteStorage.saveUpload(
      this.selectedDocument.id,
      {
        fileName: formValue.fileName,
        fileSizeLabel: formValue.fileSizeLabel,
        uploadedAt: formValue.uploadedAt,
        status: formValue.status,
        observations: formValue.observations,
      },
    );

    if (!updatedDocument) {
      return;
    }

    this.refreshDocuments(updatedDocument.id);
    this.closeDrawer();

    this.toastService.show({
      type: "success",
      message: hadExistingFile
        ? "Documento reemplazado en el expediente"
        : "Documento cargado en el expediente",
      durationMs: 2600,
    });
  }

  getStatusLabel(status: ExpedienteDocumentStatus): string {
    if (status === "CARGADO") {
      return "Cargado";
    }

    if (status === "EN_REVISION") {
      return "En revision";
    }

    if (status === "RECHAZADO") {
      return "Rechazado";
    }

    if (status === "VENCIDO") {
      return "Vencido";
    }

    return "Pendiente";
  }

  getStatusClass(status: ExpedienteDocumentStatus): string {
    if (status === "CARGADO") {
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    }

    if (status === "EN_REVISION") {
      return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    }

    if (status === "RECHAZADO") {
      return "border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300";
    }

    if (status === "VENCIDO") {
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    }

    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
  }

  getGeneralStatusClass(status: ExpedienteGeneralStatus): string {
    if (status === "COMPLETO") {
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    }

    if (status === "EN_REVISION") {
      return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    }

    if (status === "PENDIENTE") {
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
    }

    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  getProgressBarClass(): string {
    if (this.generalStatus === "COMPLETO") {
      return "bg-success-500";
    }

    if (this.generalStatus === "EN_REVISION") {
      return "bg-sky-500";
    }

    if (this.generalStatus === "PENDIENTE") {
      return "bg-slate-400";
    }

    return "bg-amber-500";
  }

  getFileActionLabel(document: ExpedienteDocumentRecord): string {
    return document.fileName ? "Reemplazar" : "Cargar";
  }

  getDocumentMeta(document: ExpedienteDocumentRecord): string {
    if (!document.fileName || !document.uploadedAt || !document.fileSizeLabel) {
      return "Sin archivo cargado";
    }

    return `${document.fileName} | ${document.fileSizeLabel}`;
  }

  getVigencyLabel(document: ExpedienteDocumentRecord): string {
    if (document.status === "CARGADO") {
      return "Vigente";
    }

    if (document.status === "EN_REVISION") {
      return "En validacion";
    }

    if (document.status === "PENDIENTE") {
      return "Sin evidencia";
    }

    return "No vigente";
  }

  getVigencyClass(document: ExpedienteDocumentRecord): string {
    if (document.status === "CARGADO") {
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    }

    if (document.status === "EN_REVISION") {
      return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    }

    if (document.status === "PENDIENTE") {
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
    }

    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  getAlertTitle(): string {
    if (this.generalStatus === "COMPLETO") {
      return "Expediente listo para validacion";
    }

    if (this.generalStatus === "EN_REVISION") {
      return "Expediente en revision documental";
    }

    if (this.generalStatus === "PENDIENTE") {
      return "Expediente sin evidencias";
    }

    return "Expediente con faltantes y observaciones";
  }

  getAlertClass(): string {
    if (this.generalStatus === "COMPLETO") {
      return "border-success-200 bg-success-50/80 dark:border-success-500/20 dark:bg-success-500/10";
    }

    if (this.generalStatus === "EN_REVISION") {
      return "border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10";
    }

    if (this.generalStatus === "PENDIENTE") {
      return "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40";
    }

    return "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10";
  }

  hasLoadedFile(document: ExpedienteDocumentRecord): boolean {
    return !!document.fileName;
  }

  trackByDocumentId(_: number, document: ExpedienteDocumentRecord): string {
    return document.id;
  }

  private refreshDocuments(selectedDocumentId: string | null = null): void {
    this.documents = this.expedienteStorage.list();

    if (selectedDocumentId) {
      this.selectedDocument =
        this.documents.find((document) => document.id === selectedDocumentId) ??
        null;
    }
  }

  private openDrawer(mode: Exclude<DrawerMode, null>): void {
    this.clearTimers();
    this.drawerMode = mode;
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

  private buildSuggestedFileName(document: ExpedienteDocumentRecord): string {
    const slug = document.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return `${slug}_marzo_2026.pdf`;
  }

  private buildSuggestedFileSize(document: ExpedienteDocumentRecord): string {
    return `${(document.order * 0.6 + 0.8).toFixed(1)} MB`;
  }

  private getTodayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private formatDateInput(value: string | null): string {
    return value ? value.slice(0, 10) : this.getTodayInputValue();
  }

  private isFlaggedStatus(status: ExpedienteDocumentStatus): boolean {
    return status === "RECHAZADO" || status === "VENCIDO";
  }
}

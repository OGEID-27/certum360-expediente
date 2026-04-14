import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormRecord,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  Building2,
  Camera,
  CheckCheck,
  CircleAlert,
  Eye,
  FileText,
  LucideIconData,
  LucideAngularModule,
  Mail,
  MoonStar,
  Phone,
  RefreshCcw,
  ScanFace,
  Send,
  ShieldCheck,
  SunMedium,
  Upload,
  UserRound,
  X,
} from 'lucide-angular';
import { ThemeService } from '../../../../shared/services/theme.service';
import {
  ExpedientePublicFormAccessContext,
  ExpedientePublicFormDocumentDefinition,
  ExpedientePublicFormFieldDefinition,
  ExpedientePublicFormService,
} from '../../services/expediente-public-form.service';

type VerificationVariant = 'checkbox' | 'challenge';
type UploadedDocumentPreviewKind = 'image' | 'pdf' | 'file';

interface UploadedPublicDocument {
  documentId: string;
  fileName: string;
  sizeLabel: string;
  mimeType: string;
  previewKind: UploadedDocumentPreviewKind;
  objectUrl: string;
  fileExtension: string;
  sourceLabel: 'Archivo' | 'Camara';
  uploadedAt: string;
}

@Component({
  selector: 'app-expediente-publico-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './expediente-publico-formulario.component.html',
})
export class ExpedientePublicoFormularioComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly publicFormService = inject(ExpedientePublicFormService);
  private readonly documentRef = inject(DOCUMENT);

  readonly Building2 = Building2;
  readonly UserRound = UserRound;
  readonly ShieldCheck = ShieldCheck;
  readonly FileText = FileText;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly CircleAlert = CircleAlert;
  readonly CheckCheck = CheckCheck;
  readonly RefreshCcw = RefreshCcw;
  readonly ScanFace = ScanFace;
  readonly Upload = Upload;
  readonly Camera = Camera;
  readonly Send = Send;
  readonly SunMedium = SunMedium;
  readonly MoonStar = MoonStar;
  readonly Eye = Eye;
  readonly X = X;

  accessContext: ExpedientePublicFormAccessContext | null = null;
  currentTheme: 'light' | 'dark' = 'light';
  verificationVariant: VerificationVariant = 'checkbox';
  verificationPassed = false;
  verificationFeedback = '';
  robotConfirmed = false;
  challengeCode = '';
  challengeAnswer = '';
  isMobileViewport = false;
  cameraPermissionState: 'idle' | 'granted' | 'denied' | 'unsupported' = 'idle';
  cameraPermissionFeedback = '';
  submissionAttempted = false;
  isSubmitted = false;
  submittedAt = '';
  uploadedDocuments: Record<string, UploadedPublicDocument | null> = {};
  activeDocumentPreview: UploadedPublicDocument | null = null;

  readonly publicForm = new FormRecord<FormControl<string>>({});

  constructor() {
    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((theme) => {
        this.currentTheme = theme;
      });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.loadAccessContext(params.get('token'));
    });

    this.observeViewport();
    this.destroyRef.onDestroy(() => this.releaseAllDocumentPreviews());
  }

  get isTokenInvalid(): boolean {
    return !this.accessContext;
  }

  get fields(): ExpedientePublicFormFieldDefinition[] {
    return this.accessContext?.fields ?? [];
  }

  get documents(): ExpedientePublicFormDocumentDefinition[] {
    return this.accessContext?.documents ?? [];
  }

  get hasRequiredDocumentsPending(): boolean {
    return this.documents.some(
      (document) => document.required && !this.uploadedDocuments[document.id],
    );
  }

  get requiredDocumentsCount(): number {
    return this.documents.filter((document) => document.required).length;
  }

  get uploadedDocumentsCount(): number {
    return Object.values(this.uploadedDocuments).filter(Boolean).length;
  }

  get showSidebarCards(): boolean {
    return this.verificationPassed;
  }

  get showMobileCameraPrompt(): boolean {
    return (
      this.verificationPassed &&
      this.isMobileViewport &&
      this.documents.some((document) => document.cameraEnabled)
    );
  }

  get hasSubmissionErrors(): boolean {
    return this.submissionAttempted && (this.publicForm.invalid || this.hasRequiredDocumentsPending);
  }

  get submissionErrorMessage(): string {
    if (!this.hasSubmissionErrors) {
      return '';
    }

    if (this.publicForm.invalid && this.hasRequiredDocumentsPending) {
      return 'Aun faltan campos y documentos obligatorios por completar para enviar tu expediente.';
    }

    if (this.publicForm.invalid) {
      return 'Faltan campos obligatorios por completar antes de enviar tu expediente.';
    }

    return 'Aun faltan documentos requeridos por cargar antes de enviar tu expediente.';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  continueWithVerification(): void {
    if (this.verificationVariant === 'checkbox') {
      if (!this.robotConfirmed) {
        this.verificationFeedback = 'Confirma la verificacion para continuar.';
        return;
      }

      this.verificationPassed = true;
      this.verificationFeedback = '';
      return;
    }

    if (this.challengeAnswer.trim().toUpperCase() !== this.challengeCode) {
      this.verificationFeedback =
        'El codigo no coincide. Verifica los caracteres e intenta nuevamente.';
      return;
    }

    this.verificationPassed = true;
    this.verificationFeedback = '';
  }

  refreshChallenge(): void {
    this.challengeCode = this.generateChallengeCode();
    this.challengeAnswer = '';
    this.verificationFeedback = '';
  }

  async requestCameraAccess(): Promise<void> {
    if (!this.isMobileViewport) {
      return;
    }

    const mediaDevices = this.documentRef.defaultView?.navigator?.mediaDevices;

    if (!mediaDevices?.getUserMedia) {
      this.cameraPermissionState = 'unsupported';
      this.cameraPermissionFeedback =
        'Tu navegador no permite solicitar acceso a la camara desde este sitio. Puedes continuar cargando archivos desde tu dispositivo.';
      return;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: 'environment',
          },
        },
      });

      stream.getTracks().forEach((track) => track.stop());

      this.cameraPermissionState = 'granted';
      this.cameraPermissionFeedback =
        'La camara ya esta habilitada para capturar documentos compatibles desde tu celular.';
    } catch {
      this.cameraPermissionState = 'denied';
      this.cameraPermissionFeedback =
        'No fue posible habilitar la camara. Revisa los permisos del navegador o continua cargando tus archivos desde el dispositivo.';
    }
  }

  submitForm(): void {
    this.submissionAttempted = true;
    this.publicForm.markAllAsTouched();

    if (this.publicForm.invalid || this.hasRequiredDocumentsPending) {
      return;
    }

    this.isSubmitted = true;
    this.submittedAt = new Date().toISOString();
  }

  openFileDialog(inputId: string): void {
    const input = this.documentRef.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
  }

  openDocumentPreview(documentId: string): void {
    this.activeDocumentPreview = this.uploadedDocuments[documentId];
  }

  closeDocumentPreview(): void {
    this.activeDocumentPreview = null;
  }

  onDocumentSelected(
    event: Event,
    document: ExpedientePublicFormDocumentDefinition,
    sourceLabel: UploadedPublicDocument['sourceLabel'],
  ): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);

    if (!file) {
      return;
    }

    this.revokeDocumentPreview(document.id);

    this.uploadedDocuments = {
      ...this.uploadedDocuments,
      [document.id]: {
        documentId: document.id,
        fileName: file.name,
        sizeLabel: this.formatFileSize(file.size),
        mimeType: file.type || this.getMimeTypeFromName(file.name),
        previewKind: this.getPreviewKind(file),
        objectUrl: URL.createObjectURL(file),
        fileExtension: this.getFileExtension(file.name),
        sourceLabel,
        uploadedAt: new Date().toISOString(),
      },
    };

    if (input) {
      input.value = '';
    }
  }

  removeDocument(documentId: string): void {
    this.revokeDocumentPreview(documentId);

    this.uploadedDocuments = {
      ...this.uploadedDocuments,
      [documentId]: null,
    };
  }

  isFieldInvalid(fieldId: string): boolean {
    const control = this.publicForm.get(fieldId);
    return !!control && control.invalid && control.touched;
  }

  hasDocumentError(document: ExpedientePublicFormDocumentDefinition): boolean {
    return this.submissionAttempted && document.required && !this.uploadedDocuments[document.id];
  }

  canUseMobileCamera(document: ExpedientePublicFormDocumentDefinition): boolean {
    return this.isMobileViewport && document.cameraEnabled;
  }

  getControl(fieldId: string): FormControl<string> {
    return this.publicForm.get(fieldId) as FormControl<string>;
  }

  getInputType(field: ExpedientePublicFormFieldDefinition): string {
    switch (field.type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }

  getFieldErrorMessage(field: ExpedientePublicFormFieldDefinition): string {
    const control = this.publicForm.get(field.id);
    if (!control?.errors) {
      return 'Campo invalido.';
    }

    if (control.errors['required']) {
      return `Captura ${field.label.toLowerCase()}.`;
    }

    if (control.errors['email']) {
      return 'Captura un correo electronico valido.';
    }

    if (control.errors['pattern']) {
      return field.type === 'tel'
        ? 'Captura un telefono valido.'
        : 'Revisa el formato del dato.';
    }

    return 'Revisa la informacion capturada.';
  }

  getFieldIcon(field: ExpedientePublicFormFieldDefinition): LucideIconData {
    const signature = this.normalizeText(`${field.id} ${field.label} ${field.description}`);

    if (field.type === 'email' || signature.includes('correo') || signature.includes('email')) {
      return this.Mail;
    }

    if (field.type === 'tel' || signature.includes('telefono') || signature.includes('celular')) {
      return this.Phone;
    }

    if (
      signature.includes('empresa') ||
      signature.includes('proveedor') ||
      signature.includes('razon social') ||
      signature.includes('compania')
    ) {
      return this.Building2;
    }

    if (
      signature.includes('nombre') ||
      signature.includes('persona') ||
      signature.includes('representante')
    ) {
      return this.UserRound;
    }

    return this.FileText;
  }

  getDocumentIcon(document: ExpedientePublicFormDocumentDefinition): LucideIconData {
    const signature = this.normalizeText(`${document.id} ${document.label} ${document.description}`);

    if (
      signature.includes('ine') ||
      signature.includes('identificacion') ||
      signature.includes('identidad') ||
      signature.includes('pasaporte')
    ) {
      return this.ScanFace;
    }

    if (
      signature.includes('domicilio') ||
      signature.includes('empresa') ||
      signature.includes('constitutiva')
    ) {
      return this.Building2;
    }

    return this.FileText;
  }

  getDocumentBadgeClass(required: boolean): string {
    return required
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
      : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200';
  }

  getDocumentCardClass(document: ExpedientePublicFormDocumentDefinition): string {
    if (this.uploadedDocuments[document.id]) {
      return 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10';
    }

    if (this.hasDocumentError(document)) {
      return 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10';
    }

    return 'border-gray-200 bg-white/85 dark:border-gray-800 dark:bg-gray-950/55';
  }

  getDocumentStatusLabel(documentId: string): string {
    const upload = this.uploadedDocuments[documentId];
    return upload ? 'Cargado' : 'Pendiente';
  }

  getDocumentStatusClass(documentId: string): string {
    return this.uploadedDocuments[documentId]
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-amber-700 dark:text-amber-300';
  }

  isImagePreview(upload: UploadedPublicDocument | null): boolean {
    return upload?.previewKind === 'image';
  }

  isPdfPreview(upload: UploadedPublicDocument | null): boolean {
    return upload?.previewKind === 'pdf';
  }

  getDocumentFormatSummary(document: ExpedientePublicFormDocumentDefinition): string {
    const formatLabel = document.allowedFormats.join(', ');
    const sizeBits = [
      document.maxSizePerFileMb ? `${document.maxSizePerFileMb} MB por archivo` : null,
      document.totalMaxSizeMb ? `${document.totalMaxSizeMb} MB totales` : null,
    ].filter(Boolean);

    return [formatLabel, ...sizeBits].join(' | ');
  }

  getFileInputId(documentId: string): string {
    return `public-form-file-${documentId}`;
  }

  getCameraInputId(documentId: string): string {
    return `public-form-camera-${documentId}`;
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  trackByField(_: number, field: ExpedientePublicFormFieldDefinition): string {
    return field.id;
  }

  trackByDocument(_: number, document: ExpedientePublicFormDocumentDefinition): string {
    return document.id;
  }

  private loadAccessContext(token: string | null): void {
    this.releaseAllDocumentPreviews();
    this.accessContext = token ? this.publicFormService.resolveAccessToken(token) : null;
    this.resetTransientState();

    if (!this.accessContext) {
      this.clearFormControls();
      return;
    }

    this.buildFormControls(this.accessContext.fields);
    this.uploadedDocuments = Object.fromEntries(
      this.accessContext.documents.map((document) => [document.id, null]),
    ) as Record<string, UploadedPublicDocument | null>;
  }

  private resetTransientState(): void {
    this.verificationVariant = Math.random() >= 0.5 ? 'challenge' : 'checkbox';
    this.verificationPassed = false;
    this.verificationFeedback = '';
    this.robotConfirmed = false;
    this.challengeCode = this.generateChallengeCode();
    this.challengeAnswer = '';
    this.cameraPermissionState = 'idle';
    this.cameraPermissionFeedback = '';
    this.submissionAttempted = false;
    this.isSubmitted = false;
    this.submittedAt = '';
    this.activeDocumentPreview = null;
  }

  private buildFormControls(fields: ExpedientePublicFormFieldDefinition[]): void {
    this.clearFormControls();

    fields.forEach((field) => {
      this.publicForm.addControl(
        field.id,
        this.fb.nonNullable.control(field.initialValue, {
          validators: this.getFieldValidators(field),
        }),
      );
    });
  }

  private clearFormControls(): void {
    Object.keys(this.publicForm.controls).forEach((controlName) => {
      this.publicForm.removeControl(controlName);
    });
  }

  private getFieldValidators(field: ExpedientePublicFormFieldDefinition): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    if (field.type === 'email') {
      validators.push(Validators.email);
    }

    if (field.type === 'tel') {
      validators.push(Validators.pattern(/^[0-9+\s()-]{7,25}$/));
    }

    return validators;
  }

  private generateChallengeCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
    ).join('');
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  private revokeDocumentPreview(documentId: string): void {
    const existingDocument = this.uploadedDocuments[documentId];

    if (existingDocument?.objectUrl) {
      URL.revokeObjectURL(existingDocument.objectUrl);
    }

    if (this.activeDocumentPreview?.documentId === documentId) {
      this.activeDocumentPreview = null;
    }
  }

  private releaseAllDocumentPreviews(): void {
    Object.values(this.uploadedDocuments).forEach((document) => {
      if (document?.objectUrl) {
        URL.revokeObjectURL(document.objectUrl);
      }
    });

    this.activeDocumentPreview = null;
  }

  private getPreviewKind(file: File): UploadedDocumentPreviewKind {
    const mimeType = file.type || this.getMimeTypeFromName(file.name);

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }

    return 'file';
  }

  private getMimeTypeFromName(fileName: string): string {
    return fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'ARCHIVO';
  }

  private observeViewport(): void {
    const mediaQuery = this.documentRef.defaultView?.matchMedia('(max-width: 767px)');

    if (!mediaQuery) {
      return;
    }

    this.isMobileViewport = mediaQuery.matches;

    const syncViewport = (event: MediaQueryListEvent): void => {
      this.isMobileViewport = event.matches;

      if (!event.matches) {
        this.cameraPermissionState = 'idle';
        this.cameraPermissionFeedback = '';
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', syncViewport));
      return;
    }

    mediaQuery.addListener(syncViewport);
    this.destroyRef.onDestroy(() => mediaQuery.removeListener(syncViewport));
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}

import { CommonModule } from '@angular/common';
import { DestroyRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Eye,
  FileText,
  FolderOpen,
  History,
  LayoutTemplate,
  LucideAngularModule,
  Mail,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-angular';
import {
  ExpedienteComplianceStatus,
  ExpedientePersonRecordStatus,
  ExpedienteProviderDetail,
  ExpedienteProviderHistoryItem,
  ExpedienteProviderPerson,
  ExpedienteProviderStatus,
  ExpedienteRepositoryHealth,
  ExpedienteTemplateDocumentSource,
  ExpedienteTemplateRequestedDocument,
} from '../../interfaces/expediente-proveedores.interface';
import { ExpedienteProveedoresService } from '../../services/expediente-proveedores.service';
import { ExpedientePublicFormService } from '../../services/expediente-public-form.service';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  getDocumentCompletionPercent,
  getRequestedTemplateDocuments,
} from '../../utils/expediente-template.utils';

type ProviderDetailTab =
  | 'resumen'
  | 'personas'
  | 'plantilla'
  | 'historial';

@Component({
  selector: 'app-proveedor-detalle-expediente',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    ModalComponent,
  ],
  templateUrl: './proveedor-detalle-expediente.component.html',
})
export class ProveedorDetalleExpedienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly publicFormService = inject(ExpedientePublicFormService);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly Building2 = Building2;
  readonly UserRound = UserRound;
  readonly ShieldCheck = ShieldCheck;
  readonly BadgeCheck = BadgeCheck;
  readonly ClipboardCheck = ClipboardCheck;
  readonly Users = Users;
  readonly LayoutTemplate = LayoutTemplate;
  readonly FolderOpen = FolderOpen;
  readonly History = History;
  readonly CalendarDays = CalendarDays;
  readonly Eye = Eye;
  readonly Pencil = Pencil;
  readonly Plus = Plus;
  readonly Send = Send;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly FileText = FileText;
  readonly X = X;
  readonly peoplePageSizeOptions = [5, 10];

  provider: ExpedienteProviderDetail | null = null;
  activeTab: ProviderDetailTab = 'personas';
  peoplePageSize = 5;
  peopleCurrentPage = 1;
  isPersonFormOpen = false;
  isPersonSummaryOpen = false;
  editingPersonId: string | null = null;
  selectedPerson: ExpedienteProviderPerson | null = null;

  readonly personForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(140)]],
    phone: ['', [Validators.required, Validators.maxLength(25)]],
    role: ['', [Validators.required, Validators.maxLength(120)]],
  });

  readonly tabs: Array<{ id: ProviderDetailTab; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'personas', label: 'Personas' },
    { id: 'plantilla', label: 'Plantilla asignada' },
    { id: 'historial', label: 'Historial' },
  ];

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, queryParams]) => {
        const providerId = params.get('id');
        this.provider = providerId
          ? this.providersService.getProviderById(providerId) ?? null
          : null;

        const requestedTab = queryParams.get('tab');
        this.activeTab = this.isValidTab(requestedTab) ? requestedTab : 'personas';
        this.peopleCurrentPage = 1;
      });
  }

  get totalPeople(): number {
    return this.provider?.people.length ?? 0;
  }

  get peopleTotalPages(): number {
    return Math.max(1, Math.ceil(this.totalPeople / this.peoplePageSize));
  }

  get peoplePageStartItem(): number {
    if (this.totalPeople === 0) {
      return 0;
    }

    return (this.peopleCurrentPage - 1) * this.peoplePageSize + 1;
  }

  get peoplePageEndItem(): number {
    return Math.min(this.peopleCurrentPage * this.peoplePageSize, this.totalPeople);
  }

  get paginatedPeople(): ExpedienteProviderPerson[] {
    const people = this.provider?.people ?? [];
    const start = (this.peopleCurrentPage - 1) * this.peoplePageSize;
    return people.slice(start, start + this.peoplePageSize);
  }

  get requestedDocuments(): ExpedienteTemplateRequestedDocument[] {
    return this.provider ? getRequestedTemplateDocuments(this.provider.template) : [];
  }

  get fixedRequestedDocuments(): ExpedienteTemplateRequestedDocument[] {
    return this.requestedDocuments.filter((document) => document.source === 'fixed');
  }

  get optionalRequestedDocuments(): ExpedienteTemplateRequestedDocument[] {
    return this.requestedDocuments.filter((document) => document.source === 'optional');
  }

  get extraRequestedDocuments(): ExpedienteTemplateRequestedDocument[] {
    return this.requestedDocuments.filter((document) => document.source === 'extra');
  }

  get fixedDataFieldsCount(): number {
    return (
      this.provider?.template.baseFields.filter(
        (field) => field.category === 'data' && field.enabled,
      ).length ?? 0
    );
  }

  get customNonDocumentFieldsCount(): number {
    return (
      this.provider?.template.customFields.filter((field) => field.type !== 'FILE').length ?? 0
    );
  }

  get personModalTitle(): string {
    return this.editingPersonId ? 'Editar persona' : 'Agregar persona';
  }

  get personModalSubmitLabel(): string {
    return this.editingPersonId ? 'Guardar cambios' : 'Registrar persona';
  }

  get selectedPersonCompletionPercent(): number {
    return this.selectedPerson
      ? getDocumentCompletionPercent(this.selectedPerson.documentSummary)
      : 0;
  }

  setActiveTab(tab: ProviderDetailTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  onPeoplePageSizeChange(value: number | string): void {
    this.peoplePageSize = Number(value);
    this.peopleCurrentPage = 1;
  }

  goToPreviousPeoplePage(): void {
    if (this.peopleCurrentPage > 1) {
      this.peopleCurrentPage -= 1;
    }
  }

  goToNextPeoplePage(): void {
    if (this.peopleCurrentPage < this.peopleTotalPages) {
      this.peopleCurrentPage += 1;
    }
  }

  openEdit(): void {
    if (!this.provider) {
      return;
    }

    this.router.navigate(['/expediente/proveedores', this.provider.id, 'editar']);
  }

  openTemplateConfig(): void {
    if (!this.provider) {
      return;
    }

    this.router.navigate(['/expediente/proveedores', this.provider.id, 'plantilla']);
  }

  openCreatePersonModal(): void {
    this.editingPersonId = null;
    this.personForm.reset({
      name: '',
      email: '',
      phone: '',
      role: '',
    });
    this.isPersonFormOpen = true;
  }

  openEditPersonModal(person: ExpedienteProviderPerson): void {
    this.editingPersonId = person.id;
    this.personForm.reset({
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
    });
    this.isPersonFormOpen = true;
  }

  closePersonFormModal(): void {
    this.isPersonFormOpen = false;
    this.editingPersonId = null;
    this.personForm.reset({
      name: '',
      email: '',
      phone: '',
      role: '',
    });
  }

  savePerson(): void {
    if (!this.provider) {
      return;
    }

    if (this.personForm.invalid) {
      this.personForm.markAllAsTouched();
      return;
    }

    const updatedProvider = this.providersService.upsertProviderPerson(
      this.provider.id,
      {
        name: (this.personForm.controls.name.value ?? '').trim(),
        email: (this.personForm.controls.email.value ?? '').trim(),
        phone: (this.personForm.controls.phone.value ?? '').trim(),
        role: (this.personForm.controls.role.value ?? '').trim(),
      },
      this.editingPersonId ?? undefined,
    );

    if (!updatedProvider) {
      return;
    }

    this.provider = updatedProvider;
    this.peopleCurrentPage = 1;
    this.closePersonFormModal();
    this.toastService.show({
      type: 'success',
      message: this.editingPersonId
        ? 'Los datos de la persona se actualizaron localmente.'
        : 'La persona se agrego al proveedor con datos locales.',
    });
  }

  openPersonSummary(person: ExpedienteProviderPerson): void {
    this.selectedPerson = person;
    this.isPersonSummaryOpen = true;
  }

  closePersonSummaryModal(): void {
    this.isPersonSummaryOpen = false;
    this.selectedPerson = null;
  }

  openPersonRecord(person: ExpedienteProviderPerson): void {
    if (!this.provider) {
      return;
    }

    this.router.navigate(['/expediente/proveedores', this.provider.id, 'personas', person.id]);
  }

  resendLink(person: ExpedienteProviderPerson): void {
    if (!this.provider) {
      return;
    }

    const updatedProvider = this.providersService.resendPersonLink(this.provider.id, person.id);
    if (!updatedProvider) {
      return;
    }

    this.provider = updatedProvider;
    const refreshedPerson = updatedProvider.people.find((item) => item.id === person.id) ?? person;

    if (this.selectedPerson?.id === person.id) {
      this.selectedPerson = refreshedPerson;
    }

    const token = this.publicFormService.createAccessToken(updatedProvider, refreshedPerson);
    const publicUrl = this.router.serializeUrl(
      this.router.createUrlTree(['/expediente/formulario', token]),
    );

    globalThis.open(publicUrl, '_blank', 'noopener,noreferrer');

    this.toastService.show({
      type: 'info',
      message: `Se envio el link de acceso a ${person.name} y se abrio el formulario publico en una nueva pestana.`,
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  getStatusClass(status: ExpedienteProviderStatus): string {
    switch (status) {
      case 'Activo':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'En revision':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Observado':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getComplianceClass(status: ExpedienteComplianceStatus): string {
    switch (status) {
      case 'Al corriente':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'En seguimiento':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Atencion prioritaria':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getPersonStatusClass(status: ExpedientePersonRecordStatus): string {
    switch (status) {
      case 'Vigente':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'En revision':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'Por vencer':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Observado':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getRepositoryHealthClass(health: ExpedienteRepositoryHealth): string {
    switch (health) {
      case 'Estable':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'Seguimiento':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'Prioritario':
      default:
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }
  }

  getHistoryTone(item: ExpedienteProviderHistoryItem): string {
    switch (item.type) {
      case 'alta':
        return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'revision':
        return 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200';
      case 'documento':
        return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200';
      case 'plantilla':
      default:
        return 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200';
    }
  }

  getDocumentSourceLabel(source: ExpedienteTemplateDocumentSource): string {
    switch (source) {
      case 'fixed':
        return 'Obligatorio fijo';
      case 'optional':
        return 'Opcional activo';
      case 'extra':
      default:
        return 'Documento extra';
    }
  }

  getDocumentSourceClass(source: ExpedienteTemplateDocumentSource): string {
    switch (source) {
      case 'fixed':
        return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
      case 'optional':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
      case 'extra':
      default:
        return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
    }
  }

  getDocumentCardClass(source: ExpedienteTemplateDocumentSource): string {
    switch (source) {
      case 'fixed':
        return 'border-sky-200/80 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/10';
      case 'optional':
        return 'border-amber-200/80 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10';
      case 'extra':
      default:
        return 'border-violet-200/80 bg-violet-50/70 dark:border-violet-500/20 dark:bg-violet-500/10';
    }
  }

  getPersonCompletionPercent(person: ExpedienteProviderPerson): number {
    return getDocumentCompletionPercent(person.documentSummary);
  }

  getPersonDocumentSummary(person: ExpedienteProviderPerson): string {
    const { approved, requested, pending, observed } = person.documentSummary;
    const issues = pending + observed;
    return `${approved}/${requested} listos${issues > 0 ? ` • ${issues} en seguimiento` : ''}`;
  }

  getPersonDocumentTone(person: ExpedienteProviderPerson): string {
    if (person.documentSummary.observed > 0 || person.recordStatus === 'Observado') {
      return 'text-rose-600 dark:text-rose-300';
    }

    if (person.documentSummary.pending > 0 || person.recordStatus === 'Por vencer') {
      return 'text-amber-600 dark:text-amber-300';
    }

    return 'text-emerald-600 dark:text-emerald-300';
  }

  getPersonLastLinkText(person: ExpedienteProviderPerson): string {
    return person.lastLinkSentAt
      ? this.formatDateTime(person.lastLinkSentAt)
      : 'Sin envio reciente';
  }

  isPersonControlInvalid(controlName: 'name' | 'email' | 'phone' | 'role'): boolean {
    const control = this.personForm.controls[controlName];
    return control.invalid && control.touched;
  }

  trackByPerson(_: number, person: ExpedienteProviderPerson): string {
    return person.id;
  }

  trackByRequestedDocument(_: number, document: ExpedienteTemplateRequestedDocument): string {
    return document.id;
  }

  trackByCategory(
    _: number,
    category: NonNullable<ExpedienteProviderDetail['repositoryCategories']>[number],
  ): string {
    return category.id;
  }

  trackByDocument(
    _: number,
    document: NonNullable<ExpedienteProviderDetail['latestDocuments']>[number],
  ): string {
    return document.id;
  }

  trackByHistory(
    _: number,
    item: NonNullable<ExpedienteProviderDetail['history']>[number],
  ): string {
    return item.id;
  }

  private isValidTab(tab: string | null): tab is ProviderDetailTab {
    return (
      tab === 'resumen' ||
      tab === 'personas' ||
      tab === 'plantilla' ||
      tab === 'historial'
    );
  }
}

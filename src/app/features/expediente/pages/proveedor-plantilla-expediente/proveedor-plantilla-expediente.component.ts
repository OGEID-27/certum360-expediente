import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  FileText,
  LayoutTemplate,
  LucideAngularModule,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-angular';
import {
  ExpedienteProviderDetail,
  ExpedienteTemplateFileAllowedFormat,
  ExpedienteProviderTemplate,
  ExpedienteTemplateBaseField,
  ExpedienteTemplateCustomField,
  ExpedienteTemplateCustomFieldType,
} from '../../interfaces/expediente-proveedores.interface';
import { ExpedienteProveedoresService } from '../../services/expediente-proveedores.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { getRequestedTemplateDocuments } from '../../utils/expediente-template.utils';

type SelectOptionDraft = {
  id: string;
  value: string;
};

@Component({
  selector: 'app-proveedor-plantilla-expediente',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    ComponentCardComponent,
  ],
  templateUrl: './proveedor-plantilla-expediente.component.html',
})
export class ProveedorPlantillaExpedienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly LayoutTemplate = LayoutTemplate;
  readonly Settings2 = Settings2;
  readonly Save = Save;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Eye = Eye;
  readonly BadgeCheck = BadgeCheck;
  readonly FileText = FileText;

  readonly fieldTypeOptions: Array<{
    value: ExpedienteTemplateCustomFieldType;
    label: string;
    description: string;
  }> = [
    { value: 'TEXT', label: 'Texto', description: 'Dato abierto de una linea.' },
    { value: 'NUMBER', label: 'Numero', description: 'Dato cuantitativo corto.' },
    { value: 'FILE', label: 'Archivo', description: 'Documento o evidencia adjunta.' },
    { value: 'TEXTAREA', label: 'Textarea', description: 'Observacion o contexto adicional.' },
    { value: 'SELECT', label: 'Select', description: 'Seleccion simple preconfigurada.' },
  ];

  readonly fileFormatOptions: Array<{
    value: ExpedienteTemplateFileAllowedFormat;
    label: string;
    description: string;
  }> = [
    { value: 'PDF', label: 'PDF', description: 'Documentos administrativos o firmados.' },
    { value: 'JPG', label: 'JPG', description: 'Fotografia o escaneo liviano.' },
    { value: 'PNG', label: 'PNG', description: 'Imagen con mas detalle visual.' },
    { value: 'IMAGE', label: 'Imagenes', description: 'Permite cualquier imagen compatible.' },
  ];

  provider: ExpedienteProviderDetail | null = null;
  baseFields: ExpedienteTemplateBaseField[] = [];
  customFields: ExpedienteTemplateCustomField[] = [];
  selectOptionDrafts: SelectOptionDraft[] = [];
  selectedFileFormats: ExpedienteTemplateFileAllowedFormat[] = ['PDF', 'JPG', 'PNG'];
  selectOptionsTouched = false;
  fileFormatsTouched = false;

  readonly templateForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    customLabel: ['', [Validators.required, Validators.maxLength(120)]],
    customType: ['TEXT' as ExpedienteTemplateCustomFieldType, Validators.required],
    customRequired: [true],
    customDescription: ['', [Validators.required, Validators.maxLength(220)]],
    customPlaceholder: ['', [Validators.maxLength(120)]],
    fileTotalMaxSizeMb: [25 as number | null, [Validators.min(1), Validators.max(500)]],
    fileMaxCount: [5 as number | null, [Validators.min(1), Validators.max(20)]],
    fileMaxSizeMb: [10 as number | null, [Validators.min(1), Validators.max(100)]],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const providerId = params.get('id');
      const provider = providerId
        ? this.providersService.getProviderById(providerId) ?? null
        : null;

      this.provider = provider;
      this.baseFields = structuredClone(provider?.template.baseFields ?? []);
      this.customFields = structuredClone(provider?.template.customFields ?? []);
      this.templateForm.patchValue({
        name: provider?.template.name ?? '',
      });
      this.resetCustomFieldForm();
    });
  }

  get fixedFields(): ExpedienteTemplateBaseField[] {
    return this.baseFields.filter((field) => !field.removable);
  }

  get optionalFields(): ExpedienteTemplateBaseField[] {
    return this.baseFields.filter((field) => field.removable);
  }

  get previewTemplate(): ExpedienteProviderTemplate {
    return {
      name: (this.templateForm.controls.name.value ?? '').trim(),
      version: this.provider?.template.version ?? 'v1.0',
      assignedBy: this.provider?.template.assignedBy ?? 'Coordinacion de expediente',
      updatedAt: this.provider?.template.updatedAt ?? new Date().toISOString(),
      baseFields: structuredClone(this.baseFields),
      customFields: structuredClone(this.customFields),
    };
  }

  get requestedDocuments() {
    return getRequestedTemplateDocuments(this.previewTemplate);
  }

  get activeOptionalFieldCount(): number {
    return this.optionalFields.filter((field) => field.enabled).length;
  }

  get extraRequestedDocumentCount(): number {
    return this.requestedDocuments.filter((document) => document.source === 'extra').length;
  }

  get previewDataFields(): Array<{ label: string; type: string; required: boolean }> {
    const baseDataFields = this.baseFields
      .filter((field) => field.category === 'data' && field.enabled)
      .map((field) => ({
        label: field.label,
        type: field.inputType,
        required: field.required,
      }));

    const customDataFields = this.customFields
      .filter((field) => field.type !== 'FILE')
      .map((field) => ({
        label: field.label,
        type: field.type,
        required: field.required,
      }));

    return [...baseDataFields, ...customDataFields];
  }

  get isCustomTypeSelect(): boolean {
    return this.templateForm.controls.customType.value === 'SELECT';
  }

  get isCustomTypeFile(): boolean {
    return this.templateForm.controls.customType.value === 'FILE';
  }

  get selectOptions(): string[] {
    return this.selectOptionDrafts
      .map((option) => option.value.trim())
      .filter((option) => option.length > 0);
  }

  get previewCustomLabel(): string {
    return (this.templateForm.controls.customLabel.value ?? '').trim() || 'Nombre del campo';
  }

  get previewCustomDescription(): string {
    return (
      (this.templateForm.controls.customDescription.value ?? '').trim() ||
      'Aqui se mostrara la ayuda o descripcion para la persona.'
    );
  }

  get previewCustomPlaceholder(): string {
    return (
      (this.templateForm.controls.customPlaceholder.value ?? '').trim() ||
      'Captura tu respuesta'
    );
  }

  get previewSelectOptions(): string[] {
    return this.selectOptions.length > 0
      ? this.selectOptions
      : ['Opcion 1', 'Opcion 2', 'Opcion 3'];
  }

  get previewFileConfig() {
    return {
      totalMaxSizeMb: this.templateForm.controls.fileTotalMaxSizeMb.value ?? 25,
      maxFiles: this.templateForm.controls.fileMaxCount.value ?? 5,
      maxSizeMb: this.templateForm.controls.fileMaxSizeMb.value ?? 10,
      formats:
        this.selectedFileFormats.length > 0
          ? this.selectedFileFormats
          : (['PDF'] as ExpedienteTemplateFileAllowedFormat[]),
    };
  }

  get hasValidSelectOptions(): boolean {
    return this.selectOptions.length > 0;
  }

  get hasValidFileFormats(): boolean {
    return this.selectedFileFormats.length > 0;
  }

  get selectedCustomTypeOption() {
    return (
      this.fieldTypeOptions.find(
        (option) => option.value === this.templateForm.controls.customType.value,
      ) ?? this.fieldTypeOptions[0]
    );
  }

  toggleOptionalField(fieldId: string): void {
    this.baseFields = this.baseFields.map((field) =>
      field.id === fieldId && field.removable
        ? { ...field, enabled: !field.enabled }
        : field,
    );
  }

  selectCustomType(type: ExpedienteTemplateCustomFieldType): void {
    this.templateForm.controls.customType.setValue(type);

    if (type === 'SELECT' && this.selectOptionDrafts.length === 0) {
      this.selectOptionDrafts = [this.createSelectOptionDraft(), this.createSelectOptionDraft(), this.createSelectOptionDraft()];
    }

    if (type === 'FILE' && this.selectedFileFormats.length === 0) {
      this.selectedFileFormats = ['PDF', 'JPG', 'PNG'];
    }
  }

  addSelectOption(value = ''): void {
    this.selectOptionDrafts = [...this.selectOptionDrafts, this.createSelectOptionDraft(value)];
    this.selectOptionsTouched = true;
  }

  updateSelectOption(optionId: string, value: string): void {
    this.selectOptionDrafts = this.selectOptionDrafts.map((option) =>
      option.id === optionId ? { ...option, value } : option,
    );
    this.selectOptionsTouched = true;
  }

  removeSelectOption(optionId: string): void {
    if (this.selectOptionDrafts.length <= 1) {
      return;
    }

    this.selectOptionDrafts = this.selectOptionDrafts.filter((option) => option.id !== optionId);
    this.selectOptionsTouched = true;
  }

  toggleFileFormat(format: ExpedienteTemplateFileAllowedFormat): void {
    this.fileFormatsTouched = true;

    if (this.selectedFileFormats.includes(format)) {
      this.selectedFileFormats = this.selectedFileFormats.filter((item) => item !== format);
      return;
    }

    this.selectedFileFormats = [...this.selectedFileFormats, format];
  }

  isFileFormatSelected(format: ExpedienteTemplateFileAllowedFormat): boolean {
    return this.selectedFileFormats.includes(format);
  }

  addCustomField(): void {
    const controls = this.templateForm.controls;
    const label = (controls.customLabel.value ?? '').trim();
    const description = (controls.customDescription.value ?? '').trim();
    const placeholder = (controls.customPlaceholder.value ?? '').trim();
    const type = controls.customType.value;
    const required = controls.customRequired.value ?? false;
    const options = this.selectOptions;

    if (
      !label ||
      !description ||
      !type ||
      (type === 'SELECT' && options.length === 0) ||
      (type === 'FILE' && this.selectedFileFormats.length === 0)
    ) {
      controls.customLabel.markAsTouched();
      controls.customDescription.markAsTouched();
      this.selectOptionsTouched = true;
      this.fileFormatsTouched = true;
      return;
    }

    this.customFields = [
      ...this.customFields,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
        label,
        type,
        required,
        description,
        placeholder: placeholder || undefined,
        options: type === 'SELECT' ? options : undefined,
        fileConfig:
          type === 'FILE'
            ? {
                totalMaxSizeMb: controls.fileTotalMaxSizeMb.value ?? undefined,
                maxFiles: controls.fileMaxCount.value ?? undefined,
                maxSizePerFileMb: controls.fileMaxSizeMb.value ?? undefined,
                allowedFormats: [...this.selectedFileFormats],
              }
            : undefined,
      },
    ];

    this.resetCustomFieldForm();
  }

  removeCustomField(fieldId: string): void {
    this.customFields = this.customFields.filter((field) => field.id !== fieldId);
  }

  saveTemplate(): void {
    if (!this.provider) {
      return;
    }

    if (this.templateForm.controls.name.invalid) {
      this.templateForm.controls.name.markAsTouched();
      return;
    }

    const updatedProvider = this.providersService.saveProviderTemplate(
      this.provider.id,
      {
        ...this.previewTemplate,
        name: (this.templateForm.controls.name.value ?? '').trim(),
      },
    );

    if (!updatedProvider) {
      return;
    }

    this.provider = updatedProvider;
    this.baseFields = structuredClone(updatedProvider.template.baseFields);
    this.customFields = structuredClone(updatedProvider.template.customFields);
    this.templateForm.patchValue({
      name: updatedProvider.template.name,
    });
    this.toastService.show({
      type: 'success',
      message: 'La plantilla se actualizo localmente para este proveedor.',
    });
  }

  goBack(): void {
    if (!this.provider) {
      this.router.navigate(['/expediente/proveedores']);
      return;
    }

    this.router.navigate(['/expediente/proveedores', this.provider.id], {
      queryParams: { tab: 'plantilla' },
    });
  }

  getCustomTypeLabel(type: ExpedienteTemplateCustomFieldType): string {
    return this.fieldTypeOptions.find((option) => option.value === type)?.label ?? type;
  }

  getCustomFieldIcon(type: ExpedienteTemplateCustomFieldType) {
    switch (type) {
      case 'NUMBER':
        return this.BadgeCheck;
      case 'TEXTAREA':
        return this.LayoutTemplate;
      case 'SELECT':
        return this.Settings2;
      case 'FILE':
      case 'TEXT':
      default:
        return this.FileText;
    }
  }

  isCustomControlInvalid(controlName: 'customLabel' | 'customDescription'): boolean {
    const control = this.templateForm.controls[controlName];
    return control.invalid && control.touched;
  }

  trackByFieldId(_: number, field: { id: string }): string {
    return field.id;
  }

  trackBySelectOptionId(_: number, option: SelectOptionDraft): string {
    return option.id;
  }

  private resetCustomFieldForm(): void {
    this.templateForm.patchValue({
      customLabel: '',
      customType: 'TEXT',
      customRequired: true,
      customDescription: '',
      customPlaceholder: '',
      fileTotalMaxSizeMb: 25,
      fileMaxCount: 5,
      fileMaxSizeMb: 10,
    });
    this.selectOptionDrafts = [];
    this.selectedFileFormats = ['PDF', 'JPG', 'PNG'];
    this.selectOptionsTouched = false;
    this.fileFormatsTouched = false;
  }

  private createSelectOptionDraft(value = ''): SelectOptionDraft {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
      value,
    };
  }
}

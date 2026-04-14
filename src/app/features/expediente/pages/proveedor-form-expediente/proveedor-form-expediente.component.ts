import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  Building2,
  Camera,
  LucideAngularModule,
  Pencil,
  Plus,
} from 'lucide-angular';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import {
  ExpedienteProviderStatus,
  ExpedienteProviderUpsertPayload,
} from '../../interfaces/expediente-proveedores.interface';
import { ExpedienteProveedoresService } from '../../services/expediente-proveedores.service';

const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;
const RFC_PATTERN = /^[A-Z&N]{3,4}\d{6}[A-Z0-9]{3}$/;
const STATUS_OPTIONS: ExpedienteProviderStatus[] = [
  'Activo',
  'En revision',
  'Observado',
];
const TAX_REGIME_OPTIONS = [
  'General de Ley Personas Morales',
  'Personas Morales con fines no lucrativos',
  'Regimen Simplificado de Confianza',
  'Persona Fisica con Actividad Empresarial',
];

@Component({
  selector: 'app-proveedor-form-expediente',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ComponentCardComponent,
  ],
  templateUrl: './proveedor-form-expediente.component.html',
})
export class ProveedorFormExpedienteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly providersService = inject(ExpedienteProveedoresService);

  readonly ArrowLeft = ArrowLeft;
  readonly Building2 = Building2;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Camera = Camera;
  readonly statusOptions = STATUS_OPTIONS;
  readonly taxRegimeOptions = TAX_REGIME_OPTIONS;
  readonly serviceTypeOptions = Array.from(
    new Set(this.providersService.listProviders().map((provider) => provider.serviceType)),
  ).sort((a, b) => a.localeCompare(b));

  providerId: string | null = null;
  logoPreviewUrl: string | null = null;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    businessName: ['', [Validators.required, Validators.minLength(3)]],
    serviceType: ['', [Validators.required]],
    contactName: ['', [Validators.required]],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', [Validators.pattern(PHONE_PATTERN)]],
    status: ['Activo' as ExpedienteProviderStatus, [Validators.required]],
    observations: [''],
    logoUrl: [null as string | null],
    fiscalData: this.fb.group({
      rfc: ['', [Validators.required, Validators.pattern(RFC_PATTERN)]],
      taxRegime: ['', [Validators.required]],
      taxAddress: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern(POSTAL_CODE_PATTERN)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      country: ['Mexico', [Validators.required]],
      fiscalClassification: [''],
    }),
  });

  constructor() {
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.providerId ? 'Editar proveedor' : 'Alta de proveedor';
  }

  get pageDescription(): string {
    return this.providerId
      ? 'Actualiza datos generales, fiscales e imagen del proveedor.'
      : 'Registra un proveedor nuevo con su informacion general y fiscal.';
  }

  get submitLabel(): string {
    return this.providerId ? 'Guardar cambios' : 'Crear proveedor';
  }

  get providerLetters(): string {
    const name = this.form.get('name')?.value ?? '';
    const cleanName = name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    return (cleanName.slice(0, 2) || 'PR').padEnd(2, 'X');
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  saveProvider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (this.providerId) {
      this.providersService.updateProvider(this.providerId, payload);
    } else {
      this.providersService.createProvider(payload);
    }

    this.goToList();
  }

  cancel(): void {
    this.goToList();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      this.logoPreviewUrl = result;
      this.form.patchValue({ logoUrl: result });
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.logoPreviewUrl = null;
    this.form.patchValue({ logoUrl: null });
  }

  hasError(path: string, errorKey: string): boolean {
    const control = this.form.get(path);
    return !!control?.errors?.[errorKey] && control.touched;
  }

  isInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

  private initializeFromRoute(): void {
    this.route.paramMap.subscribe((params) => {
      const providerId = params.get('id');

      if (!providerId) {
        this.providerId = null;
        this.resetFormForCreate();
        return;
      }

      this.loadProvider(providerId);
    });
  }

  private loadProvider(providerId: string): void {
    const provider = this.providersService.getProviderById(providerId);
    if (!provider) {
      this.goToList();
      return;
    }

    this.providerId = provider.id;
    this.logoPreviewUrl = provider.logoUrl;
    this.form.reset({
      name: provider.name,
      businessName: provider.businessName,
      serviceType: provider.serviceType,
      contactName: provider.contactName,
      contactEmail: provider.contactEmail,
      contactPhone: provider.contactPhone,
      status: provider.status,
      observations: provider.observations,
      logoUrl: provider.logoUrl,
      fiscalData: {
        rfc: provider.fiscalData.rfc,
        taxRegime: provider.fiscalData.taxRegime,
        taxAddress: provider.fiscalData.taxAddress,
        postalCode: provider.fiscalData.postalCode,
        city: provider.fiscalData.city,
        state: provider.fiscalData.state,
        country: provider.fiscalData.country,
        fiscalClassification: provider.fiscalData.fiscalClassification,
      },
    });

    this.form.markAsPristine();
  }

  private resetFormForCreate(): void {
    this.logoPreviewUrl = null;
    this.form.reset({
      name: '',
      businessName: '',
      serviceType: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      status: 'Activo',
      observations: '',
      logoUrl: null,
      fiscalData: {
        rfc: '',
        taxRegime: '',
        taxAddress: '',
        postalCode: '',
        city: '',
        state: '',
        country: 'Mexico',
        fiscalClassification: '',
      },
    });

    this.form.markAsPristine();
  }

  private buildPayload(): ExpedienteProviderUpsertPayload {
    const raw = this.form.getRawValue();

    return {
      name: (raw.name ?? '').trim(),
      businessName: (raw.businessName ?? '').trim(),
      serviceType: (raw.serviceType ?? '').trim(),
      contactName: (raw.contactName ?? '').trim(),
      contactEmail: (raw.contactEmail ?? '').trim().toLowerCase(),
      contactPhone: (raw.contactPhone ?? '').trim(),
      status: (raw.status as ExpedienteProviderStatus) ?? 'Activo',
      observations: (raw.observations ?? '').trim(),
      logoUrl: raw.logoUrl ?? null,
      fiscalData: {
        rfc: (raw.fiscalData?.rfc ?? '').trim().toUpperCase(),
        taxRegime: (raw.fiscalData?.taxRegime ?? '').trim(),
        taxAddress: (raw.fiscalData?.taxAddress ?? '').trim(),
        postalCode: (raw.fiscalData?.postalCode ?? '').trim(),
        city: (raw.fiscalData?.city ?? '').trim(),
        state: (raw.fiscalData?.state ?? '').trim(),
        country: (raw.fiscalData?.country ?? '').trim() || 'Mexico',
        fiscalClassification: (raw.fiscalData?.fiscalClassification ?? '').trim(),
      },
    };
  }

  private goToList(): void {
    this.router.navigate(['/expediente/proveedores']);
  }
}

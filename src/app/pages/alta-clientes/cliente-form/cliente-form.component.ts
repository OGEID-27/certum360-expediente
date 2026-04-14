import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ArrowLeft, Building2, Camera, LucideAngularModule, Pencil, Plus, Users } from 'lucide-angular';
import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import {
  CLIENTE_TIPO_LABELS,
  CP_PATTERN,
  Cliente,
  ESTATUS_CLIENTE_OPTIONS,
  EstatusCliente,
  PHONE_PATTERN,
  REGIMEN_FISCAL_OPTIONS,
  RFC_PATTERN,
  SECTORES_CLIENTE,
  SaveClientePayload,
  TipoCliente,
  isFiscalCompleto,
} from '../alta-clientes.models';
import { ClientUsersDrawerComponent } from '../client-users-drawer/client-users-drawer.component';
import { ClientsStoreService } from '../clients-store.service';

@Component({
  selector: 'app-cliente-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ComponentCardComponent,
    ClientUsersDrawerComponent,
  ],
  templateUrl: './cliente-form.component.html',
})
export class ClienteFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly clientsStore = inject(ClientsStoreService);

  readonly ArrowLeft = ArrowLeft;
  readonly Building2 = Building2;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Users = Users;
  readonly Camera = Camera;

  readonly tipoLabels = CLIENTE_TIPO_LABELS;
  readonly sectores = SECTORES_CLIENTE;
  readonly estatusOptions = ESTATUS_CLIENTE_OPTIONS;
  readonly regimenOptions = REGIMEN_FISCAL_OPTIONS;

  clientId: number | null = null;
  usersDrawerOpen = false;

  form = this.fb.group({
    tipoCliente: ['MORAL' as TipoCliente, [Validators.required]],
    nombreCliente: ['', [Validators.required, Validators.minLength(3)]],
    sector: ['', [Validators.required]],
    estatus: ['Prospecto' as EstatusCliente, [Validators.required]],
    contactoNombre: ['', [Validators.required]],
    correoPrincipal: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.pattern(PHONE_PATTERN)]],
    notas: [''],

    rfc: ['', [Validators.pattern(RFC_PATTERN)]],
    razonSocialFiscal: [''],
    nombreFiscal: [''],
    regimenFiscal: [''],
    cpFiscal: ['', [Validators.pattern(CP_PATTERN)]],
    domicilioFiscal: this.fb.group({
      calle: [''],
      numeroExt: [''],
      numeroInt: [''],
      colonia: [''],
      municipio: [''],
      estado: [''],
      pais: ['Mexico'],
    }),
    correoFacturacion: ['', [Validators.email]],
    usarCorreoPrincipalFacturacion: [false],
  });

  constructor() {
    this.setupConditionalBehavior();
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.clientId ? 'Editar cliente' : 'Nuevo cliente';
  }

  get isProspecto(): boolean {
    return this.form.get('estatus')?.value === 'Prospecto';
  }

  get isActivo(): boolean {
    return this.form.get('estatus')?.value === 'Activo';
  }

  get fiscalCompleto(): boolean {
    const raw = this.form.getRawValue();

    return isFiscalCompleto({
      tipoCliente: (raw.tipoCliente as TipoCliente) ?? 'MORAL',
      rfc: raw.rfc ?? '',
      razonSocialFiscal: raw.razonSocialFiscal ?? '',
      nombreFiscal: raw.nombreFiscal ?? '',
      regimenFiscal: raw.regimenFiscal ?? '',
      cpFiscal: raw.cpFiscal ?? '',
      domicilioFiscal: {
        calle: raw.domicilioFiscal?.calle ?? '',
        numeroExt: raw.domicilioFiscal?.numeroExt ?? '',
        numeroInt: raw.domicilioFiscal?.numeroInt ?? '',
        colonia: raw.domicilioFiscal?.colonia ?? '',
        municipio: raw.domicilioFiscal?.municipio ?? '',
        estado: raw.domicilioFiscal?.estado ?? '',
        pais: raw.domicilioFiscal?.pais ?? '',
      },
      correoFacturacion: raw.correoFacturacion ?? '',
    });
  }

  get canManageUsers(): boolean {
    return this.clientId !== null;
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  saveClient(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    let saved: Cliente | undefined;

    if (this.clientId) {
      saved = this.clientsStore.updateClient(this.clientId, payload);
    } else {
      saved = this.clientsStore.createClient(payload);
    }

    if (!saved) {
      return;
    }

    if (!this.clientId) {
      this.router.navigate(['/alta-clientes/editar', saved.id]);
      return;
    }

    this.loadClient(saved.id);
  }

  cancel(): void {
    this.goToList();
  }

  openUsersDrawer(): void {
    if (!this.clientId) {
      return;
    }

    this.usersDrawerOpen = true;
  }

  closeUsersDrawer(): void {
    this.usersDrawerOpen = false;
  }

  hasError(path: string, errorKey: string): boolean {
    const control = this.form.get(path);
    return !!control && !!control.errors?.[errorKey] && control.touched;
  }

  isInvalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && control.touched;
  }

  private initializeFromRoute(): void {
    this.route.paramMap.subscribe((params) => {
      this.usersDrawerOpen = false;
      const rawId = params.get('id');
      if (!rawId) {
        this.clientId = null;
        this.resetFormForCreate();
        return;
      }

      const id = Number(rawId);
      if (!Number.isFinite(id) || id <= 0) {
        this.goToList();
        return;
      }

      this.loadClient(id);
    });
  }

  private loadClient(clientId: number): void {
    const client = this.clientsStore.getById(clientId);
    if (!client) {
      this.goToList();
      return;
    }

    this.clientId = client.id;
    const usesMainEmail = client.correoFacturacion === client.correoPrincipal && !!client.correoFacturacion;

    this.form.reset({
      tipoCliente: client.tipoCliente,
      nombreCliente: client.nombreCliente,
      sector: client.sector,
      estatus: client.estatus,
      contactoNombre: client.contactoNombre,
      correoPrincipal: client.correoPrincipal,
      telefono: client.telefono,
      notas: client.notas,
      rfc: client.rfc,
      razonSocialFiscal: client.razonSocialFiscal,
      nombreFiscal: client.nombreFiscal,
      regimenFiscal: client.regimenFiscal,
      cpFiscal: client.cpFiscal,
      domicilioFiscal: {
        calle: client.domicilioFiscal.calle,
        numeroExt: client.domicilioFiscal.numeroExt,
        numeroInt: client.domicilioFiscal.numeroInt,
        colonia: client.domicilioFiscal.colonia,
        municipio: client.domicilioFiscal.municipio,
        estado: client.domicilioFiscal.estado,
        pais: client.domicilioFiscal.pais || 'Mexico',
      },
      correoFacturacion: client.correoFacturacion,
      usarCorreoPrincipalFacturacion: usesMainEmail,
    });

    if (usesMainEmail) {
      this.form.get('correoFacturacion')?.disable({ emitEvent: false });
    } else {
      this.form.get('correoFacturacion')?.enable({ emitEvent: false });
    }

    this.applyConditionalFiscalValidators();
    this.form.markAsPristine();
  }

  private resetFormForCreate(): void {
    this.form.reset({
      tipoCliente: 'MORAL',
      nombreCliente: '',
      sector: '',
      estatus: 'Prospecto',
      contactoNombre: '',
      correoPrincipal: '',
      telefono: '',
      notas: '',
      rfc: '',
      razonSocialFiscal: '',
      nombreFiscal: '',
      regimenFiscal: '',
      cpFiscal: '',
      domicilioFiscal: {
        calle: '',
        numeroExt: '',
        numeroInt: '',
        colonia: '',
        municipio: '',
        estado: '',
        pais: 'Mexico',
      },
      correoFacturacion: '',
      usarCorreoPrincipalFacturacion: false,
    });

    this.form.get('correoFacturacion')?.enable({ emitEvent: false });
    this.applyConditionalFiscalValidators();
    this.form.markAsPristine();
  }

  private setupConditionalBehavior(): void {
    this.form.get('estatus')?.valueChanges.subscribe(() => {
      this.applyConditionalFiscalValidators();
    });

    this.form.get('tipoCliente')?.valueChanges.subscribe(() => {
      this.applyConditionalFiscalValidators();
    });

    this.form.get('usarCorreoPrincipalFacturacion')?.valueChanges.subscribe((value) => {
      const billingControl = this.form.get('correoFacturacion');

      if (value) {
        const principal = this.form.get('correoPrincipal')?.value ?? '';
        billingControl?.setValue(principal, { emitEvent: false });
        billingControl?.disable({ emitEvent: false });
      } else {
        billingControl?.enable({ emitEvent: false });
      }

      billingControl?.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('correoPrincipal')?.valueChanges.subscribe((value) => {
      if (this.form.get('usarCorreoPrincipalFacturacion')?.value) {
        this.form.get('correoFacturacion')?.setValue(value ?? '', { emitEvent: false });
      }
    });

    this.applyConditionalFiscalValidators();
  }

  private applyConditionalFiscalValidators(): void {
    const isActive = this.isActivo;
    const tipo = (this.form.get('tipoCliente')?.value as TipoCliente) ?? 'MORAL';

    this.setValidators('rfc', [Validators.pattern(RFC_PATTERN)], isActive);
    this.setValidators('regimenFiscal', [], isActive);
    this.setValidators('cpFiscal', [Validators.pattern(CP_PATTERN)], isActive);
    this.setValidators('correoFacturacion', [Validators.email], isActive);

    this.setValidators('razonSocialFiscal', [], isActive && tipo === 'MORAL');
    this.setValidators('nombreFiscal', [], isActive && tipo === 'FISICA');

    this.setValidators('domicilioFiscal.calle', [], isActive);
    this.setValidators('domicilioFiscal.numeroExt', [], isActive);
    this.setValidators('domicilioFiscal.colonia', [], isActive);
    this.setValidators('domicilioFiscal.municipio', [], isActive);
    this.setValidators('domicilioFiscal.estado', [], isActive);
    this.setValidators('domicilioFiscal.pais', [], isActive);
  }

  private setValidators(path: string, extraValidators: ValidatorFn[], required: boolean): void {
    const control = this.form.get(path);
    if (!control) {
      return;
    }

    const validators = required ? [Validators.required, ...extraValidators] : extraValidators;
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): SaveClientePayload {
    const raw = this.form.getRawValue();

    return {
      tipoCliente: (raw.tipoCliente as TipoCliente) ?? 'MORAL',
      nombreCliente: (raw.nombreCliente ?? '').trim(),
      sector: (raw.sector ?? '').trim(),
      rfc: (raw.rfc ?? '').trim().toUpperCase(),
      contactoNombre: (raw.contactoNombre ?? '').trim(),
      correoPrincipal: (raw.correoPrincipal ?? '').trim().toLowerCase(),
      estatus: (raw.estatus as EstatusCliente) ?? 'Prospecto',
      telefono: (raw.telefono ?? '').trim(),
      notas: (raw.notas ?? '').trim(),
      razonSocialFiscal: (raw.razonSocialFiscal ?? '').trim(),
      nombreFiscal: (raw.nombreFiscal ?? '').trim(),
      regimenFiscal: (raw.regimenFiscal ?? '').trim(),
      cpFiscal: (raw.cpFiscal ?? '').trim(),
      domicilioFiscal: {
        calle: (raw.domicilioFiscal?.calle ?? '').trim(),
        numeroExt: (raw.domicilioFiscal?.numeroExt ?? '').trim(),
        numeroInt: (raw.domicilioFiscal?.numeroInt ?? '').trim(),
        colonia: (raw.domicilioFiscal?.colonia ?? '').trim(),
        municipio: (raw.domicilioFiscal?.municipio ?? '').trim(),
        estado: (raw.domicilioFiscal?.estado ?? '').trim(),
        pais: (raw.domicilioFiscal?.pais ?? '').trim() || 'Mexico',
      },
      correoFacturacion: (raw.correoFacturacion ?? '').trim().toLowerCase(),
    };
  }

  private goToList(): void {
    this.router.navigate(['/alta-clientes']);
  }
}

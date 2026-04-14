import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AREAS_USUARIO_OPTIONS,
  AreaUsuarioBase,
  ESTATUS_USUARIO_OPTIONS,
  EstatusUsuarioCliente,
  UsuarioCliente,
} from '../alta-clientes.models';
import {
  Ban,
  CircleCheckBig,
  LucideAngularModule,
  Pencil,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-angular';
import { ClientsStoreService } from '../clients-store.service';

@Component({
  selector: 'app-client-users-drawer',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './client-users-drawer.component.html',
})
export class ClientUsersDrawerComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly clientsStore = inject(ClientsStoreService);

  @Input() isOpen = false;
  @Input() clientId: number | null = null;
  @Input() clientName = '';

  @Output() closed = new EventEmitter<void>();
  @Output() usersChanged = new EventEmitter<void>();

  readonly Users = Users;
  readonly UserPlus = UserPlus;
  readonly Pencil = Pencil;
  readonly X = X;
  readonly Send = Send;
  readonly Ban = Ban;
  readonly CircleCheckBig = CircleCheckBig;

  readonly estatusOptions = ESTATUS_USUARIO_OPTIONS;
  readonly areaOptions = AREAS_USUARIO_OPTIONS;

  activeTab: 'users' | 'newUser' = 'users';
  users: UsuarioCliente[] = [];
  editingUserId: number | null = null;
  editingUserName = '';

  isPanelVisible = false;
  isOverlayVisible = false;

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  userForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    areaPreset: ['Sistemas' as AreaUsuarioBase, [Validators.required]],
    areaCustom: [''],
    estatus: ['Activo' as EstatusUsuarioCliente, [Validators.required]],
    enviarInvitacion: [true],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] || changes['isOpen']) {
      this.reloadUsers();
    }

    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue) {
        this.playOpenAnimation();
        this.activeTab = 'users';
        this.resetForm();
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

  get drawerTitle(): string {
    return this.clientName
      ? `Usuarios de ${this.clientName}`
      : 'Usuarios del cliente';
  }

  get isEmailTaken(): boolean {
    const control = this.userForm.get('email');
    return !!control?.errors?.['emailTaken'] && !!control?.touched;
  }

  get isInviteEnabled(): boolean {
    return !!this.userForm.get('enviarInvitacion')?.value;
  }

  get isOtherAreaSelected(): boolean {
    return this.userForm.get('areaPreset')?.value === 'Otro';
  }

  hasError(controlName: string, errorKey: string): boolean {
    const control = this.userForm.get(controlName);
    return !!control && !!control.errors?.[errorKey] && control.touched;
  }

  onEmailBlur(): void {
    this.validateUniqueEmail();
  }

  onAreaPresetChange(value: AreaUsuarioBase): void {
    this.userForm.patchValue({ areaPreset: value });
    if (value !== 'Otro') {
      this.userForm.patchValue({ areaCustom: '' });
    }
    this.syncAreaValidators();
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

  switchTab(tab: 'users' | 'newUser'): void {
    this.activeTab = tab;

    if (tab === 'newUser' && this.editingUserId !== null) {
      this.resetForm();
    }
  }

  startEdit(user: UsuarioCliente): void {
    this.editingUserId = user.id;
    this.editingUserName = `${user.nombres} ${user.apellidos}`.trim();
    this.activeTab = 'users';

    const matchedArea = this.areaOptions.find(
      (option) => option.toLowerCase() === user.area.trim().toLowerCase(),
    );

    this.userForm.patchValue({
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      telefono: user.telefono,
      areaPreset: matchedArea ?? 'Otro',
      areaCustom: matchedArea ? '' : user.area,
      estatus: user.estatus,
      enviarInvitacion: false,
    });

    this.syncAreaValidators();
    this.userForm.markAsPristine();
    this.userForm.get('email')?.updateValueAndValidity();
  }

  toggleBlocked(user: UsuarioCliente): void {
    if (!this.clientId) {
      return;
    }

    const nextStatus: EstatusUsuarioCliente =
      user.estatus === 'Activo' ? 'Bloqueado' : 'Activo';
    this.clientsStore.updateUserStatus(this.clientId, user.id, nextStatus);
    this.reloadUsers();
    this.usersChanged.emit();
  }

  saveUser(): void {
    if (!this.clientId) {
      return;
    }

    this.validateUniqueEmail();
    this.syncAreaValidators();

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();

    this.clientsStore.saveUser(this.clientId, {
      id: this.editingUserId ?? undefined,
      nombres: (value.nombres ?? '').trim(),
      apellidos: (value.apellidos ?? '').trim(),
      email: (value.email ?? '').trim().toLowerCase(),
      telefono: (value.telefono ?? '').trim(),
      area: this.resolveArea(),
      estatus: (value.estatus as EstatusUsuarioCliente) ?? 'Activo',
    });

    this.reloadUsers();
    this.usersChanged.emit();
    this.resetForm();
    this.activeTab = 'users';
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'users';
  }

  getStatusToggleIcon(user: UsuarioCliente): unknown {
    return user.estatus === 'Activo' ? this.Ban : this.CircleCheckBig;
  }

  getStatusToggleLabel(user: UsuarioCliente): string {
    return user.estatus === 'Activo' ? 'Bloquear' : 'Activar';
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

  private validateUniqueEmail(): void {
    if (!this.clientId) {
      return;
    }

    const emailControl = this.userForm.get('email');
    const emailValue = String(emailControl?.value ?? '')
      .trim()
      .toLowerCase();

    if (!emailValue) {
      return;
    }

    if (
      this.clientsStore.isEmailTakenByClient(
        this.clientId,
        emailValue,
        this.editingUserId ?? undefined,
      )
    ) {
      emailControl?.setErrors({
        ...(emailControl.errors ?? {}),
        emailTaken: true,
      });
      emailControl?.markAsTouched();
      return;
    }

    if (emailControl?.errors?.['emailTaken']) {
      const { emailTaken, ...rest } = emailControl.errors;
      void emailTaken;
      emailControl.setErrors(Object.keys(rest).length > 0 ? rest : null);
    }
  }

  private reloadUsers(): void {
    if (!this.clientId) {
      this.users = [];
      return;
    }

    this.users = this.clientsStore.listUsersByClient(this.clientId);
  }

  private resetForm(): void {
    this.editingUserId = null;
    this.editingUserName = '';

    this.userForm.reset({
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      areaPreset: 'Sistemas',
      areaCustom: '',
      estatus: 'Activo',
      enviarInvitacion: true,
    });
    this.syncAreaValidators();
  }

  private syncAreaValidators(): void {
    const areaCustomControl = this.userForm.get('areaCustom');
    if (!areaCustomControl) {
      return;
    }

    if (this.isOtherAreaSelected) {
      areaCustomControl.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      areaCustomControl.clearValidators();
    }

    areaCustomControl.updateValueAndValidity({ emitEvent: false });
  }

  private resolveArea(): string {
    const areaPreset = this.userForm.get('areaPreset')?.value ?? 'Otro';
    if (areaPreset !== 'Otro') {
      return areaPreset;
    }

    return String(this.userForm.get('areaCustom')?.value ?? '').trim();
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

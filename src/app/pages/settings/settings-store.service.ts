import { Injectable } from '@angular/core';
import { AppRole } from '../../core/services/session-role.service';
import {
  CardBrand,
  PaymentMethod,
  PaymentMethodType,
  SavePaymentMethodPayload,
  SettingsRole,
  SettingsUserProfile,
} from './settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsStoreService {
  private readonly paymentStorageKeys: Record<SettingsRole, string> = {
    admin: 'settings.payment-methods.admin.v1',
    user: 'settings.payment-methods.user.v1',
  };

  private readonly profiles: Record<SettingsRole, SettingsUserProfile> = {
    admin: {
      role: 'admin',
      fullName: 'Roberto Salazar',
      email: 'roberto@moontest.mx',
      roleLabel: 'Administrador',
      phone: '+52 81 8450 2201',
      joinedAt: '2024-01-12T10:00:00.000Z',
      accountStatus: 'Activa',
      company: 'MoonTest Administracion',
      area: 'Operacion y control',
      accountId: 'ADM-MXT-0018',
      nextBillingDate: '2026-04-05T12:00:00.000Z',
      paymentStatus: 'Al corriente',
      securityLevel: 'Alta',
    },
    user: {
      role: 'user',
      fullName: 'Adrian Molina',
      email: 'adrian@moontest.mx',
      roleLabel: 'Usuario',
      phone: '+52 55 5000 1122',
      joinedAt: '2025-07-03T09:15:00.000Z',
      accountStatus: 'Activa',
      company: 'MoonTest Cliente Demo',
      area: 'Seguimiento operativo',
      accountId: 'USR-MXT-1042',
      nextBillingDate: '2026-04-12T12:00:00.000Z',
      paymentStatus: 'Revision local',
      securityLevel: 'Media',
    },
  };

  constructor() {
    this.ensureSeedData('admin');
    this.ensureSeedData('user');
  }

  getUserProfile(role: AppRole): SettingsUserProfile {
    const safeRole = this.normalizeRole(role);
    return { ...this.profiles[safeRole] };
  }

  listPaymentMethods(role: AppRole): PaymentMethod[] {
    const safeRole = this.normalizeRole(role);
    this.ensureSeedData(safeRole);

    return this.readPaymentMethods(safeRole).sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }

      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }

  savePaymentMethod(
    role: AppRole,
    payload: SavePaymentMethodPayload,
    editingMethodId?: number | null,
  ): PaymentMethod {
    const safeRole = this.normalizeRole(role);
    const methods = this.readPaymentMethods(safeRole);
    const now = new Date().toISOString();
    const existing = editingMethodId
      ? methods.find((item) => item.id === editingMethodId)
      : undefined;

    const brand =
      payload.type === 'card'
        ? this.detectCardBrand(payload.reference, existing?.brand ?? null)
        : null;
    const normalizedReference = this.normalizeReferenceValue(
      payload.type,
      payload.reference,
      brand,
      existing,
    );
    const nextId = methods.reduce((max, item) => Math.max(max, item.id), 0) + 1;

    const paymentMethod: PaymentMethod = {
      id: existing?.id ?? nextId,
      type: payload.type,
      alias: payload.alias.trim(),
      holderName: payload.holderName.trim(),
      bankName: payload.bankName.trim(),
      maskedValue: normalizedReference.maskedValue,
      expiration:
        payload.type === 'card'
          ? (payload.expiration || existing?.expiration || '').trim()
          : '',
      lastFour: normalizedReference.lastFour,
      brand,
      isDefault: payload.isDefault || (!existing && methods.length === 0),
      isVerified: this.isVerifiedMethod(payload.type),
      status: this.resolveMethodStatus(payload.type),
      notes: payload.notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextMethods = existing
      ? methods.map((item) => (item.id === existing.id ? paymentMethod : item))
      : [paymentMethod, ...methods];

    this.writePaymentMethods(
      safeRole,
      this.ensureSingleDefault(nextMethods, paymentMethod.id),
    );

    return paymentMethod;
  }

  deletePaymentMethod(role: AppRole, methodId: number): void {
    const safeRole = this.normalizeRole(role);
    const remaining = this.readPaymentMethods(safeRole).filter(
      (item) => item.id !== methodId,
    );

    this.writePaymentMethods(safeRole, this.ensureSingleDefault(remaining));
  }

  setDefaultPaymentMethod(role: AppRole, methodId: number): void {
    const safeRole = this.normalizeRole(role);
    const methods = this.readPaymentMethods(safeRole);

    this.writePaymentMethods(safeRole, this.ensureSingleDefault(methods, methodId));
  }

  detectCardBrand(input: string, fallback: CardBrand = null): CardBrand {
    const digits = this.extractDigits(input);
    if (!digits) {
      return fallback;
    }

    if (digits.startsWith('4')) {
      return 'visa';
    }

    if (/^(5[1-5]|2[2-7])/.test(digits)) {
      return 'mastercard';
    }

    if (/^3[47]/.test(digits)) {
      return 'amex';
    }

    return 'generic';
  }

  getCardBrandAsset(brand: CardBrand): string | null {
    switch (brand) {
      case 'visa':
        return '/images/pay/visa_icon.png';
      case 'mastercard':
        return '/images/pay/mastercard_icon.png';
      case 'amex':
        return '/images/pay/americanexpress_icon.png';
      default:
        return null;
    }
  }

  getPaypalAsset(): string {
    return '/images/pay/paypal_icon.png';
  }

  private normalizeRole(role: AppRole): SettingsRole {
    return role === 'user' ? 'user' : 'admin';
  }

  private ensureSeedData(role: SettingsRole): void {
    const current = this.readPaymentMethods(role);
    if (current.length > 0) {
      return;
    }

    const now = new Date().toISOString();
    const seeded: PaymentMethod[] =
      role === 'admin'
        ? [
            {
              id: 1,
              type: 'card',
              alias: 'Tarjeta corporativa',
              holderName: 'Roberto Salazar',
              bankName: 'Banco Empresarial MX',
              maskedValue: '4111 •••• •••• 2048',
              expiration: '11/29',
              lastFour: '2048',
              brand: 'visa',
              isDefault: true,
              isVerified: true,
              status: 'Verificado',
              notes: 'Uso principal para renovaciones del panel administrativo.',
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 2,
              type: 'bank-transfer',
              alias: 'Tesoreria principal',
              holderName: 'MoonTest Administracion',
              bankName: 'BBVA Empresas',
              maskedValue: 'CLABE •••• 8842',
              expiration: '',
              lastFour: '8842',
              brand: null,
              isDefault: false,
              isVerified: true,
              status: 'Activo',
              notes: 'Cuenta dummy para transferencias internas y respaldo.',
              createdAt: now,
              updatedAt: now,
            },
          ]
        : [
            {
              id: 1,
              type: 'card',
              alias: 'Tarjeta principal',
              holderName: 'Adrian Molina',
              bankName: 'Santander',
              maskedValue: '5105 •••• •••• 7814',
              expiration: '08/28',
              lastFour: '7814',
              brand: 'mastercard',
              isDefault: true,
              isVerified: true,
              status: 'Verificado',
              notes: 'Metodo dummy de cobro local para usuario final.',
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 2,
              type: 'bank-reference',
              alias: 'Referencia de respaldo',
              holderName: 'Adrian Molina',
              bankName: 'Banorte',
              maskedValue: 'REF •••• 3209',
              expiration: '',
              lastFour: '3209',
              brand: null,
              isDefault: false,
              isVerified: false,
              status: 'Pendiente',
              notes: 'Referencia dummy para pagos manuales en caja o portal.',
              createdAt: now,
              updatedAt: now,
            },
          ];

    this.writePaymentMethods(role, seeded);
  }

  private readPaymentMethods(role: SettingsRole): PaymentMethod[] {
    const raw = localStorage.getItem(this.paymentStorageKeys[role]);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
    } catch {
      return [];
    }
  }

  private writePaymentMethods(role: SettingsRole, methods: PaymentMethod[]): void {
    localStorage.setItem(this.paymentStorageKeys[role], JSON.stringify(methods));
  }

  private ensureSingleDefault(
    methods: PaymentMethod[],
    preferredId?: number,
  ): PaymentMethod[] {
    if (methods.length === 0) {
      return [];
    }

    const defaultId =
      preferredId && methods.some((item) => item.id === preferredId)
        ? preferredId
        : methods.find((item) => item.isDefault)?.id ?? methods[0].id;

    return methods.map((item) => ({
      ...item,
      isDefault: item.id === defaultId,
    }));
  }

  private normalizeReferenceValue(
    type: PaymentMethodType,
    input: string,
    brand: CardBrand,
    existing?: PaymentMethod,
  ): { maskedValue: string; lastFour: string } {
    const rawValue = input.trim();
    if (/[•*]/.test(rawValue) && existing) {
      return {
        maskedValue: existing.maskedValue,
        lastFour: existing.lastFour,
      };
    }

    if (type === 'paypal') {
      return this.normalizePaypalReference(rawValue, existing);
    }

    const digits = this.extractDigits(rawValue);
    const lastFour = digits.slice(-4);

    if (type === 'card') {
      return {
        maskedValue: this.maskCardValue(digits, brand),
        lastFour,
      };
    }

    return {
      maskedValue: this.maskReferenceValue(type, lastFour),
      lastFour,
    };
  }

  private maskCardValue(digits: string, brand: CardBrand): string {
    if (!digits) {
      return '•••• •••• •••• ••••';
    }

    const lastFour = digits.slice(-4);
    const prefix =
      brand === 'amex'
        ? digits.slice(0, 2)
        : digits.length >= 4
          ? digits.slice(0, 4)
          : digits;

    if (brand === 'amex') {
      return `${prefix}•• •••••• •${lastFour || '••••'}`;
    }

    return `${prefix.padEnd(4, '•')} •••• •••• ${lastFour || '••••'}`;
  }

  private maskReferenceValue(
    type: Exclude<PaymentMethodType, 'card'>,
    lastFour: string,
  ): string {
    const prefix =
      type === 'bank-transfer'
        ? 'CLABE'
        : type === 'direct-debit'
          ? 'DOM'
          : 'REF';

    return `${prefix} •••• ${lastFour || '0000'}`;
  }

  private extractDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizePaypalReference(
    rawValue: string,
    existing?: PaymentMethod,
  ): { maskedValue: string; lastFour: string } {
    if (!rawValue && existing) {
      return {
        maskedValue: existing.maskedValue,
        lastFour: existing.lastFour,
      };
    }

    const sanitizedValue = rawValue || 'cliente@paypal.demo';

    return {
      maskedValue: sanitizedValue,
      lastFour: sanitizedValue.slice(-4),
    };
  }

  private isVerifiedMethod(type: PaymentMethodType): boolean {
    return type === 'card' || type === 'bank-transfer' || type === 'paypal';
  }

  private resolveMethodStatus(
    type: PaymentMethodType,
  ): PaymentMethod['status'] {
    if (type === 'card' || type === 'paypal') {
      return 'Verificado';
    }

    return 'Activo';
  }
}

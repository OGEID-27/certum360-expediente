import { AppRole } from '../../core/services/session-role.service';

export type SettingsRole = Exclude<AppRole, null | 'expediente'>;
export type SettingsSection = 'profile' | 'payments';
export type PaymentMethodType =
  | 'card'
  | 'bank-transfer'
  | 'direct-debit'
  | 'bank-reference'
  | 'paypal';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'generic' | null;

export interface SettingsUserProfile {
  role: SettingsRole;
  fullName: string;
  email: string;
  roleLabel: string;
  phone: string;
  joinedAt: string;
  accountStatus: 'Activa' | 'Pendiente';
  company: string;
  area: string;
  accountId: string;
  nextBillingDate: string;
  paymentStatus: 'Al corriente' | 'Revision local';
  securityLevel: 'Alta' | 'Media';
}

export interface PaymentMethod {
  id: number;
  type: PaymentMethodType;
  alias: string;
  holderName: string;
  bankName: string;
  maskedValue: string;
  expiration: string;
  lastFour: string;
  brand: CardBrand;
  isDefault: boolean;
  isVerified: boolean;
  status: 'Activo' | 'Pendiente' | 'Verificado';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavePaymentMethodPayload {
  type: PaymentMethodType;
  alias: string;
  holderName: string;
  reference: string;
  expiration: string;
  cvv: string;
  bankName: string;
  isDefault: boolean;
  notes: string;
}

export const PAYMENT_METHOD_TYPE_OPTIONS: Array<{
  value: PaymentMethodType;
  label: string;
  helper: string;
}> = [
  {
    value: 'card',
    label: 'Tarjeta',
    helper: 'Credito o debito para cobro recurrente local.',
  },
  {
    value: 'bank-transfer',
    label: 'Transferencia',
    helper: 'Cuenta de tesoreria para dispersion o transferencia.',
  },
  {
    value: 'direct-debit',
    label: 'Domiciliacion',
    helper: 'Cargo automatico con convenio bancario dummy.',
  },
  {
    value: 'bank-reference',
    label: 'Referencia bancaria',
    helper: 'Linea o convenio de pago para referencia manual.',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    helper: 'Cuenta digital conectada para cobro rapido local.',
  },
];

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  card: 'Tarjeta',
  'bank-transfer': 'Transferencia',
  'direct-debit': 'Domiciliacion',
  'bank-reference': 'Referencia bancaria',
  paypal: 'PayPal',
};

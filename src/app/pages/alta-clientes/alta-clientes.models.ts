export type TipoCliente = 'MORAL' | 'FISICA';

export type EstatusCliente = 'Prospecto' | 'Activo' | 'Pendiente' | 'Inactivo';

export type EstatusUsuarioCliente = 'Activo' | 'Bloqueado';
export type AreaUsuarioBase =
  | 'Sistemas'
  | 'Contaduria'
  | 'RH'
  | 'Operaciones'
  | 'Ventas'
  | 'Legal'
  | 'Compras'
  | 'Otro';

export type DomicilioFiscal = {
  calle: string;
  numeroExt: string;
  numeroInt: string;
  colonia: string;
  municipio: string;
  estado: string;
  pais: string;
};

export type Cliente = {
  id: number;
  photoUrl?: string;
  tipoCliente: TipoCliente;
  nombreCliente: string;
  sector: string;
  rfc: string;
  contactoNombre: string;
  correoPrincipal: string;
  estatus: EstatusCliente;
  telefono: string;
  notas: string;
  razonSocialFiscal: string;
  nombreFiscal: string;
  regimenFiscal: string;
  cpFiscal: string;
  domicilioFiscal: DomicilioFiscal;
  correoFacturacion: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveClientePayload = {
  photoUrl?: string;
  tipoCliente: TipoCliente;
  nombreCliente: string;
  sector: string;
  rfc: string;
  contactoNombre: string;
  correoPrincipal: string;
  estatus: EstatusCliente;
  telefono: string;
  notas: string;
  razonSocialFiscal: string;
  nombreFiscal: string;
  regimenFiscal: string;
  cpFiscal: string;
  domicilioFiscal: DomicilioFiscal;
  correoFacturacion: string;
};

export type UsuarioCliente = {
  id: number;
  clientId: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  area: string;
  estatus: EstatusUsuarioCliente;
  createdAt: string;
  updatedAt: string;
};

export type SaveUsuarioClientePayload = {
  id?: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  area: string;
  estatus: EstatusUsuarioCliente;
};

export const CLIENTE_TIPO_LABELS: Record<TipoCliente, string> = {
  MORAL: 'Persona moral',
  FISICA: 'Persona fisica',
};

export const ESTATUS_CLIENTE_OPTIONS: EstatusCliente[] = [
  'Prospecto',
  'Activo',
  'Pendiente',
  'Inactivo',
];

export const ESTATUS_USUARIO_OPTIONS: EstatusUsuarioCliente[] = ['Activo', 'Bloqueado'];
export const AREAS_USUARIO_OPTIONS: AreaUsuarioBase[] = [
  'Sistemas',
  'Contaduria',
  'RH',
  'Operaciones',
  'Ventas',
  'Legal',
  'Compras',
  'Otro',
];

export const SECTORES_CLIENTE = [
  'Agroindustrial',
  'Infraestructura',
  'Salud',
  'Transporte',
  'Tecnologia',
  'Comercio',
  'Educacion',
  'Servicios',
];

export const REGIMEN_FISCAL_OPTIONS = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '612 - Personas Fisicas con Actividades Empresariales y Profesionales',
  '626 - Regimen Simplificado de Confianza',
];

export const RFC_PATTERN = /^([A-Z&\xD1]{3,4})\d{6}([A-Z0-9]{3})$/i;
export const CP_PATTERN = /^\d{5}$/;
export const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export function isFiscalCompleto(cliente: Pick<Cliente,
  'tipoCliente' |
  'rfc' |
  'regimenFiscal' |
  'cpFiscal' |
  'razonSocialFiscal' |
  'nombreFiscal' |
  'correoFacturacion' |
  'domicilioFiscal'>): boolean {
  const domicilio = cliente.domicilioFiscal;

  const hasRequiredAddress = [
    domicilio.calle,
    domicilio.numeroExt,
    domicilio.colonia,
    domicilio.municipio,
    domicilio.estado,
    domicilio.pais,
  ].every((value) => value.trim().length > 0);

  const hasFiscalName =
    cliente.tipoCliente === 'MORAL'
      ? cliente.razonSocialFiscal.trim().length > 0
      : cliente.nombreFiscal.trim().length > 0;

  return (
    hasFiscalName &&
    RFC_PATTERN.test(cliente.rfc.trim()) &&
    cliente.regimenFiscal.trim().length > 0 &&
    CP_PATTERN.test(cliente.cpFiscal.trim()) &&
    hasRequiredAddress &&
    cliente.correoFacturacion.trim().length > 0
  );
}

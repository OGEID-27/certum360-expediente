import {
  ExpedientePersonRecordStatus,
  ExpedienteProviderPersonDocumentSummary,
  ExpedienteProviderTemplate,
  ExpedienteTemplateBaseField,
  ExpedienteTemplateRequestedDocument,
} from '../interfaces/expediente-proveedores.interface';

export function createDefaultTemplateBaseFields(): ExpedienteTemplateBaseField[] {
  return [
    {
      id: 'full-name',
      label: 'Nombre',
      category: 'data',
      inputType: 'text',
      required: true,
      removable: false,
      enabled: true,
      description: 'Identificacion principal de la persona asociada al proveedor.',
    },
    {
      id: 'phone-number',
      label: 'Numero de telefono',
      category: 'data',
      inputType: 'phone',
      required: true,
      removable: false,
      enabled: true,
      description: 'Contacto operativo para validaciones y seguimiento.',
    },
    {
      id: 'email-address',
      label: 'Correo electronico',
      category: 'data',
      inputType: 'email',
      required: true,
      removable: false,
      enabled: true,
      description: 'Canal principal para envio de liga y notificaciones.',
    },
    {
      id: 'ine-front',
      label: 'INE frente',
      category: 'document',
      inputType: 'file',
      required: true,
      removable: false,
      enabled: true,
      description: 'Documento base obligatorio para validar identidad.',
    },
    {
      id: 'ine-back',
      label: 'INE reverso',
      category: 'document',
      inputType: 'file',
      required: true,
      removable: false,
      enabled: true,
      description: 'Complemento obligatorio para expediente de identidad.',
    },
    {
      id: 'proof-of-address',
      label: 'Comprobante de domicilio',
      category: 'document',
      inputType: 'file',
      required: false,
      removable: true,
      enabled: true,
      description: 'Documento opcional activable para validar domicilio vigente.',
    },
    {
      id: 'tax-certificate',
      label: 'Constancia fiscal',
      category: 'document',
      inputType: 'file',
      required: false,
      removable: true,
      enabled: true,
      description: 'Documento opcional para trazabilidad fiscal del perfil.',
    },
  ];
}

export function getRequestedTemplateDocuments(
  template: ExpedienteProviderTemplate,
): ExpedienteTemplateRequestedDocument[] {
  const baseDocuments = template.baseFields
    .filter((field) => field.category === 'document' && field.enabled)
    .map((field) => ({
      id: field.id,
      label: field.label,
      source: field.removable ? 'optional' : 'fixed',
      required: field.required,
      removable: field.removable,
      description: field.description,
    })) satisfies ExpedienteTemplateRequestedDocument[];

  const extraDocuments = template.customFields
    .filter((field) => field.type === 'FILE')
    .map((field) => ({
      id: field.id,
      label: field.label,
      source: 'extra',
      required: field.required,
      removable: true,
      description: field.description,
    })) satisfies ExpedienteTemplateRequestedDocument[];

  return [...baseDocuments, ...extraDocuments];
}

export function buildDocumentSummaryFromStatus(
  requestedDocuments: number,
  status: ExpedientePersonRecordStatus,
): ExpedienteProviderPersonDocumentSummary {
  const total = Math.max(requestedDocuments, 2);

  switch (status) {
    case 'Vigente':
      return {
        requested: total,
        approved: total,
        pending: 0,
        observed: 0,
      };
    case 'En revision':
      return {
        requested: total,
        approved: Math.max(total - 1, 1),
        pending: 1,
        observed: 0,
      };
    case 'Por vencer':
      return {
        requested: total,
        approved: Math.max(total - 1, 1),
        pending: 1,
        observed: 0,
      };
    case 'Observado':
    default:
      return {
        requested: total,
        approved: Math.max(total - 2, 0),
        pending: 1,
        observed: 1,
      };
  }
}

export function getDocumentCompletionPercent(
  summary: ExpedienteProviderPersonDocumentSummary,
): number {
  if (summary.requested <= 0) {
    return 0;
  }

  return Math.round((summary.approved / summary.requested) * 100);
}

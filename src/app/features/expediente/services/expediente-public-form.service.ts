import { Injectable, inject } from '@angular/core';
import {
  ExpedienteProviderDetail,
  ExpedienteProviderPerson,
  ExpedienteProviderTemplate,
  ExpedienteTemplateCustomField,
  ExpedienteTemplateFileAllowedFormat,
  ExpedienteTemplateRequestedDocument,
} from '../interfaces/expediente-proveedores.interface';
import { getRequestedTemplateDocuments } from '../utils/expediente-template.utils';
import { ExpedienteProveedoresService } from './expediente-proveedores.service';

type PublicFieldControlType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select';

interface ExpedientePublicFormStoredRecord {
  token: string;
  createdAt: string;
  provider: Pick<
    ExpedienteProviderDetail,
    | 'id'
    | 'name'
    | 'businessName'
    | 'serviceType'
    | 'contactName'
    | 'contactEmail'
    | 'contactPhone'
    | 'logoUrl'
  >;
  person: ExpedienteProviderPerson;
  template: ExpedienteProviderTemplate;
}

export interface ExpedientePublicFormFieldDefinition {
  id: string;
  label: string;
  type: PublicFieldControlType;
  required: boolean;
  description: string;
  placeholder: string;
  options?: string[];
  initialValue: string;
  source: 'base' | 'custom';
}

export interface ExpedientePublicFormDocumentDefinition {
  id: string;
  label: string;
  required: boolean;
  description: string;
  source: ExpedienteTemplateRequestedDocument['source'];
  accept: string;
  cameraEnabled: boolean;
  allowedFormats: ExpedienteTemplateFileAllowedFormat[];
  maxFiles?: number;
  maxSizePerFileMb?: number;
  totalMaxSizeMb?: number;
}

export interface ExpedientePublicFormAccessContext {
  token: string;
  createdAt: string;
  provider: ExpedientePublicFormStoredRecord['provider'];
  person: ExpedienteProviderPerson;
  template: ExpedienteProviderTemplate;
  fields: ExpedientePublicFormFieldDefinition[];
  documents: ExpedientePublicFormDocumentDefinition[];
  hasPrefilledData: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExpedientePublicFormService {
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly storageKey = 'expediente.public-form.records';
  private readonly tokenPrefix = 'expf_';
  private readonly maxStoredRecords = 100;

  createAccessToken(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): string {
    const token = this.buildToken(provider.id, person.id);
    const record: ExpedientePublicFormStoredRecord = {
      token,
      createdAt: new Date().toISOString(),
      provider: {
        id: provider.id,
        name: provider.name,
        businessName: provider.businessName,
        serviceType: provider.serviceType,
        contactName: provider.contactName,
        contactEmail: provider.contactEmail,
        contactPhone: provider.contactPhone,
        logoUrl: provider.logoUrl,
      },
      person: structuredClone(person),
      template: structuredClone(provider.template),
    };

    this.persistRecord(record);
    return token;
  }

  resolveAccessToken(token: string): ExpedientePublicFormAccessContext | null {
    const storedRecord = this.readRecords()[token];
    if (storedRecord) {
      return this.toAccessContext(storedRecord);
    }

    const parsedToken = this.parseToken(token);
    if (!parsedToken) {
      return null;
    }

    const provider = this.providersService.getProviderById(parsedToken.providerId);
    const person = provider?.people.find((item) => item.id === parsedToken.personId);

    if (!provider || !person) {
      return null;
    }

    return this.toAccessContext({
      token,
      createdAt: new Date().toISOString(),
      provider: {
        id: provider.id,
        name: provider.name,
        businessName: provider.businessName,
        serviceType: provider.serviceType,
        contactName: provider.contactName,
        contactEmail: provider.contactEmail,
        contactPhone: provider.contactPhone,
        logoUrl: provider.logoUrl,
      },
      person,
      template: provider.template,
    });
  }

  private toAccessContext(
    record: ExpedientePublicFormStoredRecord,
  ): ExpedientePublicFormAccessContext {
    const fields = this.buildFields(record.template, record.person);

    return {
      token: record.token,
      createdAt: record.createdAt,
      provider: structuredClone(record.provider),
      person: structuredClone(record.person),
      template: structuredClone(record.template),
      fields,
      documents: this.buildDocuments(record.template),
      hasPrefilledData: fields.some((field) => field.initialValue.trim().length > 0),
    };
  }

  private buildFields(
    template: ExpedienteProviderTemplate,
    person: ExpedienteProviderPerson,
  ): ExpedientePublicFormFieldDefinition[] {
    const baseFields = template.baseFields
      .filter((field) => field.category === 'data' && field.enabled)
      .map((field) => ({
        id: field.id,
        label: field.label,
        type: this.mapBaseFieldType(field.inputType),
        required: field.required,
        description: field.description,
        placeholder: `Captura ${field.label.toLowerCase()}`,
        initialValue: this.getBaseFieldInitialValue(field.id, person),
        source: 'base' as const,
      }));

    const customFields = template.customFields
      .filter((field) => field.type !== 'FILE')
      .map((field) => ({
        id: field.id,
        label: field.label,
        type: this.mapCustomFieldType(field.type),
        required: field.required,
        description: field.description,
        placeholder:
          field.placeholder?.trim() ||
          (field.type === 'SELECT' ? 'Selecciona una opcion' : `Captura ${field.label.toLowerCase()}`),
        options: field.type === 'SELECT' ? field.options ?? [] : undefined,
        initialValue: this.getCustomFieldInitialValue(field, person),
        source: 'custom' as const,
      }));

    return [...baseFields, ...customFields];
  }

  private buildDocuments(
    template: ExpedienteProviderTemplate,
  ): ExpedientePublicFormDocumentDefinition[] {
    const extraDocumentFields = new Map<string, ExpedienteTemplateCustomField>(
      template.customFields
        .filter((field) => field.type === 'FILE')
        .map((field) => [field.id, field]),
    );

    return getRequestedTemplateDocuments(template).map((document) => {
      const extraConfig = extraDocumentFields.get(document.id)?.fileConfig;
      const allowedFormats =
        extraConfig?.allowedFormats && extraConfig.allowedFormats.length > 0
          ? [...extraConfig.allowedFormats]
          : this.getDefaultDocumentFormats(document);

      return {
        id: document.id,
        label: document.label,
        required: document.required,
        description: document.description,
        source: document.source,
        accept: this.buildAcceptValue(allowedFormats, document.label),
        cameraEnabled: this.supportsCameraCapture(document.label),
        allowedFormats,
        maxFiles: extraConfig?.maxFiles,
        maxSizePerFileMb: extraConfig?.maxSizePerFileMb,
        totalMaxSizeMb: extraConfig?.totalMaxSizeMb,
      };
    });
  }

  private getBaseFieldInitialValue(
    fieldId: string,
    person: ExpedienteProviderPerson,
  ): string {
    switch (fieldId) {
      case 'full-name':
        return person.name;
      case 'phone-number':
        return person.phone;
      case 'email-address':
        return person.email;
      default:
        return '';
    }
  }

  private getCustomFieldInitialValue(
    field: ExpedienteTemplateCustomField,
    person: ExpedienteProviderPerson,
  ): string {
    const normalized = `${field.label} ${field.description}`.toLowerCase();
    if (
      normalized.includes('puesto') ||
      normalized.includes('actividad') ||
      normalized.includes('cargo') ||
      normalized.includes('rol')
    ) {
      return person.role;
    }

    return '';
  }

  private mapBaseFieldType(
    type: ExpedienteProviderTemplate['baseFields'][number]['inputType'],
  ): PublicFieldControlType {
    switch (type) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'text':
      case 'file':
      default:
        return 'text';
    }
  }

  private mapCustomFieldType(
    type: ExpedienteTemplateCustomField['type'],
  ): PublicFieldControlType {
    switch (type) {
      case 'NUMBER':
        return 'number';
      case 'TEXTAREA':
        return 'textarea';
      case 'SELECT':
        return 'select';
      case 'TEXT':
      default:
        return 'text';
    }
  }

  private getDefaultDocumentFormats(
    document: ExpedienteTemplateRequestedDocument,
  ): ExpedienteTemplateFileAllowedFormat[] {
    return this.supportsCameraCapture(document.label)
      ? ['JPG', 'PNG', 'IMAGE']
      : ['PDF', 'JPG', 'PNG'];
  }

  private buildAcceptValue(
    allowedFormats: ExpedienteTemplateFileAllowedFormat[],
    label: string,
  ): string {
    const mappedFormats = allowedFormats.flatMap((format) => {
      switch (format) {
        case 'PDF':
          return ['.pdf'];
        case 'JPG':
          return ['.jpg', '.jpeg'];
        case 'PNG':
          return ['.png'];
        case 'IMAGE':
          return ['image/*'];
        default:
          return [];
      }
    });

    if (this.supportsCameraCapture(label)) {
      mappedFormats.push('image/*');
    }

    const uniqueFormats = Array.from(new Set(mappedFormats));
    return uniqueFormats.join(',') || '.pdf,.jpg,.jpeg,.png,image/*';
  }

  private supportsCameraCapture(label: string): boolean {
    const normalized = label.toLowerCase();
    return normalized.includes('ine') || normalized.includes('identificacion');
  }

  private persistRecord(record: ExpedientePublicFormStoredRecord): void {
    const records = this.readRecords();
    records[record.token] = record;

    const trimmedEntries = Object.values(records)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, this.maxStoredRecords);

    const trimmedRecords = Object.fromEntries(
      trimmedEntries.map((item) => [item.token, item]),
    ) as Record<string, ExpedientePublicFormStoredRecord>;

    localStorage.setItem(this.storageKey, JSON.stringify(trimmedRecords));
  }

  private readRecords(): Record<string, ExpedientePublicFormStoredRecord> {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return {};
      }

      const parsedValue = JSON.parse(rawValue) as Record<
        string,
        ExpedientePublicFormStoredRecord
      >;

      return parsedValue ?? {};
    } catch {
      return {};
    }
  }

  private buildToken(providerId: string, personId: string): string {
    const payload = JSON.stringify({ providerId, personId, version: 1 });
    return `${this.tokenPrefix}${this.toBase64Url(payload)}`;
  }

  private parseToken(
    token: string,
  ): { providerId: string; personId: string } | null {
    if (!token.startsWith(this.tokenPrefix)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        this.fromBase64Url(token.slice(this.tokenPrefix.length)),
      ) as {
        providerId?: string;
        personId?: string;
      };

      if (!payload.providerId || !payload.personId) {
        return null;
      }

      return {
        providerId: payload.providerId,
        personId: payload.personId,
      };
    } catch {
      return null;
    }
  }

  private toBase64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private fromBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return atob(`${normalized}${padding}`);
  }
}

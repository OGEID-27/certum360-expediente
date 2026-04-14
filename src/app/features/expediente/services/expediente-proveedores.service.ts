import { Injectable } from '@angular/core';
import {
  ExpedienteDocumentReviewStatus,
  ExpedientePersonRecordDetail,
  ExpedienteProviderDetail,
  ExpedienteProviderHistoryItem,
  ExpedienteProviderListItem,
  ExpedienteProviderPerson,
  ExpedienteProviderPersonUpsertPayload,
  ExpedienteProviderStatus,
  ExpedienteProviderTemplate,
  ExpedienteProviderUpsertPayload,
  ExpedienteRecordDocument,
  ExpedienteRecordDocumentFolder,
  ExpedienteRecordField,
  ExpedienteRecordObservation,
  ExpedienteRecordTimelineItem,
  ExpedienteReviewComplianceLevel,
  ExpedienteReviewQueueItem,
  ExpedienteReviewWorkflowStatus,
} from '../interfaces/expediente-proveedores.interface';
import { EXPEDIENTE_PROVIDERS_MOCK } from '../mocks/expediente-proveedores.mock';
import {
  buildDocumentSummaryFromStatus,
  createDefaultTemplateBaseFields,
  getDocumentCompletionPercent,
  getRequestedTemplateDocuments,
} from '../utils/expediente-template.utils';

type FolderDefinition = Pick<
  ExpedienteRecordDocumentFolder,
  'id' | 'name' | 'description'
>;

type DocumentSeed = {
  id: string;
  label: string;
  category: string;
  type: string;
  required: boolean;
};

@Injectable({ providedIn: 'root' })
export class ExpedienteProveedoresService {
  private providersStore: ExpedienteProviderDetail[] = structuredClone(
    EXPEDIENTE_PROVIDERS_MOCK,
  );

  listProviders(): ExpedienteProviderListItem[] {
    return structuredClone(this.providersStore)
      .map((provider) => this.toListItem(provider))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  listReviewQueue(): ExpedienteReviewQueueItem[] {
    return structuredClone(this.providersStore)
      .flatMap((provider) =>
        provider.people.map((person) => this.toReviewQueueItem(provider, person)),
      )
      .sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated));
  }

  getProviderById(id: string): ExpedienteProviderDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === id);
    return provider ? structuredClone(provider) : undefined;
  }

  getProviderPerson(
    providerId: string,
    personId: string,
  ): ExpedienteProviderPerson | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    const person = provider?.people.find((item) => item.id === personId);
    return person ? structuredClone(person) : undefined;
  }

  getPersonRecordDetail(
    providerId: string,
    personId: string,
  ): ExpedientePersonRecordDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    const person = provider?.people.find((item) => item.id === personId);

    if (!provider || !person) {
      return undefined;
    }

    return this.buildRecordDetail(provider, person);
  }

  createProvider(payload: ExpedienteProviderUpsertPayload): ExpedienteProviderDetail {
    const now = new Date();
    const provider: ExpedienteProviderDetail = {
      id: this.buildUniqueId(payload.name),
      name: payload.name,
      businessName: payload.businessName,
      serviceType: payload.serviceType,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      status: payload.status,
      complianceStatus: this.getComplianceStatus(payload.status),
      reviewStatus: this.getReviewStatus(payload.status),
      registeredPeople: 0,
      activeRecords: 0,
      pendingItems: 0,
      expiringDocuments: 0,
      compliancePercent: this.getInitialCompliance(payload.status),
      updatedAt: now.toISOString(),
      nextReviewAt: this.createNextReviewDate(now, payload.status),
      observations: payload.observations,
      logoUrl: payload.logoUrl,
      fiscalData: payload.fiscalData,
      executiveSummary: this.buildExecutiveSummary(payload),
      people: [],
      template: {
        name: 'Plantilla base de expediente',
        version: 'v1.0',
        assignedBy: 'Coordinacion de expediente',
        updatedAt: now.toISOString(),
        baseFields: createDefaultTemplateBaseFields(),
        customFields: [],
      },
      repositoryCategories: [],
      latestDocuments: [],
      history: [
        this.buildHistoryItem({
          providerName: payload.name,
          title: 'Proveedor registrado',
          description:
            'Se dio de alta el proveedor en expediente con datos generales y fiscales listos para seguimiento inicial.',
          timestamp: now.toISOString(),
          type: 'alta',
        }),
      ],
    };

    this.providersStore = [provider, ...this.providersStore];
    return structuredClone(provider);
  }

  updateProvider(
    id: string,
    payload: ExpedienteProviderUpsertPayload,
  ): ExpedienteProviderDetail | undefined {
    const index = this.providersStore.findIndex((item) => item.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = this.providersStore[index];
    const updatedAt = new Date().toISOString();
    const updatedProvider: ExpedienteProviderDetail = {
      ...existing,
      name: payload.name,
      businessName: payload.businessName,
      serviceType: payload.serviceType,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      status: payload.status,
      complianceStatus: this.getComplianceStatus(payload.status),
      reviewStatus: this.getReviewStatus(payload.status),
      compliancePercent: this.getUpdatedCompliance(existing.compliancePercent, payload.status),
      updatedAt,
      nextReviewAt: this.createNextReviewDate(new Date(), payload.status),
      observations: payload.observations,
      logoUrl: payload.logoUrl,
      fiscalData: payload.fiscalData,
      executiveSummary: this.buildExecutiveSummary(payload),
      history: [
        this.buildHistoryItem({
          providerName: payload.name,
          title: 'Datos del proveedor actualizados',
          description:
            'Se ajustaron datos generales, fiscales o de contacto dentro del expediente administrativo del proveedor.',
          timestamp: updatedAt,
          type: 'revision',
        }),
        ...existing.history,
      ],
    };

    this.providersStore = this.providersStore.map((item, itemIndex) =>
      itemIndex === index ? updatedProvider : item,
    );

    return structuredClone(updatedProvider);
  }

  saveProviderTemplate(
    providerId: string,
    template: ExpedienteProviderTemplate,
  ): ExpedienteProviderDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    if (!provider) {
      return undefined;
    }

    const updatedAt = new Date().toISOString();
    const updatedProvider: ExpedienteProviderDetail = {
      ...provider,
      template: {
        ...structuredClone(template),
        updatedAt,
        version: this.bumpTemplateVersion(provider.template.version),
      },
      updatedAt,
      history: [
        this.buildHistoryItem({
          providerName: provider.name,
          title: 'Plantilla actualizada',
          description:
            'Se ajustaron documentos solicitados y campos configurables del expediente del proveedor.',
          timestamp: updatedAt,
          type: 'plantilla',
        }),
        ...provider.history,
      ],
    };

    this.providersStore = this.providersStore.map((item) =>
      item.id === providerId ? updatedProvider : item,
    );

    return structuredClone(updatedProvider);
  }

  upsertProviderPerson(
    providerId: string,
    payload: ExpedienteProviderPersonUpsertPayload,
    personId?: string,
  ): ExpedienteProviderDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    if (!provider) {
      return undefined;
    }

    const now = new Date().toISOString();
    const requestedDocuments = getRequestedTemplateDocuments(provider.template).length;
    const existingPerson = personId
      ? provider.people.find((item) => item.id === personId)
      : undefined;

    const person: ExpedienteProviderPerson = existingPerson
      ? {
          ...existingPerson,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: payload.role,
          lastUpdate: now,
        }
      : {
          id: this.buildUniquePersonId(provider.id, payload.name),
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: payload.role,
          recordStatus: 'En revision',
          reviewState: 'Pendiente',
          validUntil: this.createPersonValidUntil(),
          lastUpdate: now,
          submittedAt: now,
          documentSummary: {
            requested: requestedDocuments,
            approved: 0,
            pending: requestedDocuments,
            observed: 0,
          },
          complianceSummary:
            'Registro inicial creado. Pendiente de carga documental para completar el expediente.',
          lastLinkSentAt: null,
        };

    const updatedPeople = existingPerson
      ? provider.people.map((item) => (item.id === existingPerson.id ? person : item))
      : [person, ...provider.people];

    const updatedProvider = this.withRecalculatedProviderState({
      ...provider,
      people: updatedPeople,
      updatedAt: now,
      history: [
        this.buildHistoryItem({
          providerName: provider.name,
          title: existingPerson ? 'Persona actualizada' : 'Persona agregada',
          description: existingPerson
            ? `Se actualizaron los datos principales de ${payload.name} dentro del registro del proveedor.`
            : `Se agrego a ${payload.name} como nueva persona vinculada al expediente del proveedor.`,
          timestamp: now,
          type: existingPerson ? 'revision' : 'alta',
        }),
        ...provider.history,
      ],
    });

    this.providersStore = this.providersStore.map((item) =>
      item.id === providerId ? updatedProvider : item,
    );

    return structuredClone(updatedProvider);
  }

  resendPersonLink(
    providerId: string,
    personId: string,
  ): ExpedienteProviderDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    const person = provider?.people.find((item) => item.id === personId);
    if (!provider || !person) {
      return undefined;
    }

    const timestamp = new Date().toISOString();
    const updatedProvider: ExpedienteProviderDetail = {
      ...provider,
      people: provider.people.map((item) =>
        item.id === personId ? { ...item, lastLinkSentAt: timestamp, lastUpdate: timestamp } : item,
      ),
      updatedAt: timestamp,
      history: [
        this.buildHistoryItem({
          providerName: provider.name,
          title: 'Liga reenviada a persona',
          description: `Se reenviaron instrucciones de captura documental a ${person.name}.`,
          timestamp,
          type: 'revision',
        }),
        ...provider.history,
      ],
    };

    this.providersStore = this.providersStore.map((item) =>
      item.id === providerId ? updatedProvider : item,
    );

    return structuredClone(updatedProvider);
  }

  updatePersonReviewState(
    providerId: string,
    personId: string,
    reviewState: ExpedienteReviewWorkflowStatus,
  ): ExpedienteProviderDetail | undefined {
    const provider = this.providersStore.find((item) => item.id === providerId);
    const person = provider?.people.find((item) => item.id === personId);

    if (!provider || !person) {
      return undefined;
    }

    const timestamp = new Date().toISOString();
    const requestedDocuments =
      getRequestedTemplateDocuments(provider.template).length || person.documentSummary.requested;
    const updatedProvider = this.withRecalculatedProviderState({
      ...provider,
      people: provider.people.map((item) =>
        item.id === personId
          ? {
              ...item,
              reviewState,
              recordStatus: this.getRecordStatusFromReviewState(reviewState, item.recordStatus),
              lastUpdate: timestamp,
              documentSummary: buildDocumentSummaryFromStatus(
                requestedDocuments,
                this.getRecordStatusFromReviewState(reviewState, item.recordStatus),
              ),
              complianceSummary: this.buildReviewComplianceSummary(item.role, reviewState),
            }
          : item,
      ),
      updatedAt: timestamp,
      history: [
        this.buildHistoryItem({
          providerName: provider.name,
          title: 'Estado de revision actualizado',
          description: `Se cambio el expediente de ${person.name} a ${reviewState.toLowerCase()}.`,
          timestamp,
          type: 'revision',
        }),
        ...provider.history,
      ],
    });

    this.providersStore = this.providersStore.map((item) =>
      item.id === providerId ? updatedProvider : item,
    );

    return structuredClone(updatedProvider);
  }

  private toListItem(
    provider: ExpedienteProviderDetail,
  ): ExpedienteProviderListItem {
    return {
      id: provider.id,
      name: provider.name,
      businessName: provider.businessName,
      serviceType: provider.serviceType,
      contactName: provider.contactName,
      contactEmail: provider.contactEmail,
      contactPhone: provider.contactPhone,
      registeredPeople: provider.registeredPeople,
      activeRecords: provider.activeRecords,
      pendingItems: provider.pendingItems,
      expiringDocuments: provider.expiringDocuments,
      compliancePercent: provider.compliancePercent,
      status: provider.status,
      complianceStatus: provider.complianceStatus,
      reviewStatus: provider.reviewStatus,
      updatedAt: provider.updatedAt,
      logoUrl: provider.logoUrl,
    };
  }

  private toReviewQueueItem(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedienteReviewQueueItem {
    const documents = this.buildRecordDocuments(provider, person);
    const observations = this.buildRecordObservations(provider, person, documents);
    const progressPercent = this.buildReviewSummary(provider, person, documents, observations)
      .progressPercent;

    return {
      id: `${provider.id}__${person.id}`,
      providerId: provider.id,
      providerName: provider.name,
      personId: person.id,
      personName: person.name,
      personRole: person.role,
      state: person.reviewState,
      recordStatus: person.recordStatus,
      compliance: this.getReviewComplianceLevel(progressPercent, observations.length),
      progressPercent,
      lastUpdated: person.lastUpdate,
      submittedAt: person.submittedAt,
      validUntil: person.validUntil,
      pendingObservations: observations.filter((item) => item.status !== 'Resuelta').length,
      approvedDocuments: documents.filter((document) => document.status === 'Aprobado').length,
      totalDocuments: documents.length,
      providerStatus: provider.status,
    };
  }

  private buildRecordDetail(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedientePersonRecordDetail {
    const documents = this.buildRecordDocuments(provider, person);
    const observations = this.buildRecordObservations(provider, person, documents);
    const reviewSummary = this.buildReviewSummary(provider, person, documents, observations);

    return {
      id: `${provider.id}__${person.id}`,
      providerId: provider.id,
      providerName: provider.name,
      providerBusinessName: provider.businessName,
      providerServiceType: provider.serviceType,
      personId: person.id,
      personName: person.name,
      personRole: person.role,
      personEmail: person.email,
      personPhone: person.phone,
      recordStatus: person.recordStatus,
      reviewState: person.reviewState,
      submittedAt: person.submittedAt,
      lastUpdate: person.lastUpdate,
      validUntil: person.validUntil,
      completionPercent: getDocumentCompletionPercent(person.documentSummary),
      executiveSummary: person.complianceSummary,
      reviewSummary,
      generalData: this.buildGeneralData(provider, person),
      fiscalData: this.buildFiscalData(provider, person),
      addressData: this.buildAddressData(provider, person),
      documents,
      folders: this.buildFolders(documents),
      observations,
      history: this.buildRecordTimeline(provider, person, observations),
    };
  }

  private buildGeneralData(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedienteRecordField[] {
    return [
      { label: 'Nombre completo', value: person.name },
      { label: 'Puesto o actividad', value: person.role },
      { label: 'Proveedor', value: provider.name, helper: provider.businessName },
      { label: 'Correo electronico', value: person.email },
      { label: 'Telefono', value: person.phone },
      { label: 'Fecha de envio', value: this.formatDateTime(person.submittedAt) },
    ];
  }

  private buildFiscalData(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedienteRecordField[] {
    const initials = person.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.slice(0, 2).toUpperCase())
      .join('');

    return [
      {
        label: 'RFC relacionado',
        value: `${initials}${provider.fiscalData.postalCode}${provider.fiscalData.rfc.slice(-3)}`,
      },
      { label: 'Regimen', value: provider.fiscalData.taxRegime },
      { label: 'Clasificacion fiscal', value: provider.fiscalData.fiscalClassification },
      { label: 'RFC del proveedor', value: provider.fiscalData.rfc },
    ];
  }

  private buildAddressData(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedienteRecordField[] {
    return [
      {
        label: 'Direccion base',
        value: provider.fiscalData.taxAddress,
        helper: `${person.role} asignado a ${provider.serviceType.toLowerCase()}.`,
      },
      { label: 'Ciudad', value: provider.fiscalData.city },
      { label: 'Estado', value: provider.fiscalData.state },
      { label: 'Codigo postal', value: provider.fiscalData.postalCode },
      { label: 'Pais', value: provider.fiscalData.country },
    ];
  }

  private buildRecordDocuments(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): ExpedienteRecordDocument[] {
    const requestedDocuments = getRequestedTemplateDocuments(provider.template);
    const additionalDocuments: DocumentSeed[] = [
      {
        id: `${person.id}-annex`,
        label: 'Anexo operativo firmado',
        category: 'Anexos',
        type: 'Anexo administrativo',
        required: false,
      },
      {
        id: `${person.id}-other`,
        label: 'Archivo complementario de acceso',
        category: 'Otros archivos',
        type: 'Archivo complementario',
        required: false,
      },
    ];

    const documentSeeds: DocumentSeed[] = [
      ...requestedDocuments.map((document) => ({
        id: document.id,
        label: document.label,
        category: this.getDocumentCategory(document.label, provider.serviceType),
        type: this.getDocumentType(document.label, provider.serviceType),
        required: document.required,
      })),
      ...additionalDocuments,
    ];

    const statuses = this.buildDocumentStatuses(person.reviewState, documentSeeds.length);

    return documentSeeds.map((document, index) => {
      const folder = this.getFolderByDocument(document.label, document.category);
      const uploadedAt = this.shiftDate(person.submittedAt, index * 4 + 2);
      const status = statuses[index];

      return {
        id: `${person.id}-${document.id}`,
        name: document.label,
        category: document.category,
        type: document.type,
        extension: this.getDocumentExtension(document.label),
        status,
        uploadedAt,
        validUntil:
          status === 'Faltante'
            ? null
            : index < 4
              ? person.validUntil
              : this.shiftDate(person.validUntil, 24 * (index + 10)).slice(0, 10),
        sizeLabel: `${(index + 1) * 0.4 + 0.8} MB`,
        uploadedBy: person.name,
        reviewerNote: this.getDocumentReviewerNote(status, document.label),
        folderId: folder.id,
        folderName: folder.name,
        required: document.required,
      };
    });
  }

  private buildFolders(
    documents: ExpedienteRecordDocument[],
  ): ExpedienteRecordDocumentFolder[] {
    return this.getFolderDefinitions().map((folder) => {
      const folderDocuments = documents.filter((document) => document.folderId === folder.id);

      return {
        ...folder,
        totalDocuments: folderDocuments.length,
        approvedDocuments: folderDocuments.filter((document) => document.status === 'Aprobado')
          .length,
        observedDocuments: folderDocuments.filter((document) => document.status === 'Observado')
          .length,
        pendingDocuments: folderDocuments.filter(
          (document) => document.status === 'Pendiente' || document.status === 'Faltante',
        ).length,
      };
    });
  }

  private buildRecordObservations(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
    documents: ExpedienteRecordDocument[],
  ): ExpedienteRecordObservation[] {
    const observations: ExpedienteRecordObservation[] = [];
    const observedDocument = documents.find((document) => document.status === 'Observado');
    const pendingDocument = documents.find(
      (document) => document.status === 'Pendiente' || document.status === 'Faltante',
    );

    if (observedDocument) {
      observations.push({
        id: `${person.id}-obs-documento`,
        title: `Revision abierta en ${observedDocument.name}`,
        description: observedDocument.reviewerNote,
        area: observedDocument.category,
        status: 'Pendiente',
        createdAt: this.shiftDate(person.lastUpdate, -6),
      });
    }

    if (pendingDocument) {
      observations.push({
        id: `${person.id}-obs-carga`,
        title: `Pendiente documental en ${pendingDocument.name}`,
        description:
          'Se requiere completar la carga para cerrar la validacion administrativa del expediente.',
        area: pendingDocument.category,
        status: person.reviewState === 'Pendiente' ? 'Pendiente' : 'En seguimiento',
        createdAt: this.shiftDate(person.lastUpdate, -10),
      });
    }

    if (provider.observations) {
      observations.push({
        id: `${person.id}-obs-proveedor`,
        title: 'Observacion operativa del proveedor',
        description: provider.observations,
        area: provider.serviceType,
        status:
          person.reviewState === 'Aprobado' && !observedDocument ? 'Resuelta' : 'En seguimiento',
        createdAt: this.shiftDate(person.submittedAt, 12),
      });
    }

    return observations.slice(0, 3);
  }

  private buildRecordTimeline(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
    observations: ExpedienteRecordObservation[],
  ): ExpedienteRecordTimelineItem[] {
    const baseTimeline: ExpedienteRecordTimelineItem[] = [
      {
        id: `${person.id}-timeline-envio`,
        title: 'Expediente enviado para revision',
        description:
          'La persona completo la carga inicial y el expediente quedo disponible para validacion administrativa.',
        timestamp: person.submittedAt,
        type: 'envio',
      },
      {
        id: `${person.id}-timeline-estado`,
        title: `Estado actual: ${person.reviewState}`,
        description: this.buildReviewComplianceSummary(person.role, person.reviewState),
        timestamp: person.lastUpdate,
        type:
          person.reviewState === 'Aprobado'
            ? 'aprobacion'
            : person.reviewState === 'Observado' || person.reviewState === 'Rechazado'
              ? 'observacion'
              : 'revision',
      },
      ...observations.map((observation, index) => ({
        id: `${person.id}-timeline-observacion-${index}`,
        title: observation.title,
        description: observation.description,
        timestamp: observation.createdAt,
        type: 'observacion' as const,
      })),
    ];

    return [
      ...baseTimeline,
      ...provider.history.slice(0, 2).map((item, index) => ({
        id: `${person.id}-provider-history-${index}`,
        title: item.title,
        description: item.description,
        timestamp: item.timestamp,
        type:
          (item.type === 'documento' ? 'revision' : 'aprobacion') as ExpedienteRecordTimelineItem['type'],
      })),
    ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  private buildReviewSummary(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
    documents: ExpedienteRecordDocument[],
    observations: ExpedienteRecordObservation[],
  ): ExpedientePersonRecordDetail['reviewSummary'] {
    const totalDataFields = this.buildGeneralData(provider, person).length;
    const { loadedDataFields, reviewedDataFields } = this.getDataFieldProgress(
      person.reviewState,
      totalDataFields,
    );
    const loadedDocuments = documents.filter((document) => document.status !== 'Faltante').length;
    const reviewedDocuments = documents.filter(
      (document) =>
        document.status === 'Aprobado' || document.status === 'Observado',
    ).length;
    const approvedDocuments = documents.filter((document) => document.status === 'Aprobado').length;
    const observedDocuments = documents.filter((document) => document.status === 'Observado').length;
    const missingDocuments = documents.filter((document) => document.status === 'Faltante').length;
    const totalDocuments = documents.length;

    const progressPercent = Math.round(
      ((loadedDataFields / totalDataFields) * 0.2 +
        (reviewedDataFields / totalDataFields) * 0.3 +
        (loadedDocuments / totalDocuments) * 0.2 +
        (reviewedDocuments / totalDocuments) * 0.3) *
        100,
    );

    return {
      totalDataFields,
      loadedDataFields,
      reviewedDataFields,
      totalDocuments,
      loadedDocuments,
      reviewedDocuments,
      approvedDocuments,
      observedDocuments,
      missingDocuments,
      pendingObservations: observations.filter((item) => item.status !== 'Resuelta').length,
      progressPercent,
    };
  }

  private buildUniqueId(name: string): string {
    const baseId =
      name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'proveedor';

    let candidate = baseId;
    let suffix = 2;

    while (this.providersStore.some((provider) => provider.id === candidate)) {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private buildUniquePersonId(providerId: string, name: string): string {
    const baseId = `${providerId}-${name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'persona'}`;

    let candidate = baseId;
    let suffix = 2;

    while (
      this.providersStore.some((provider) =>
        provider.people.some((person) => person.id === candidate),
      )
    ) {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private createNextReviewDate(now: Date, status: ExpedienteProviderStatus): string {
    const reviewDate = new Date(now);
    reviewDate.setDate(
      reviewDate.getDate() +
        (status === 'Activo' ? 30 : status === 'En revision' ? 14 : 7),
    );
    reviewDate.setHours(9, 0, 0, 0);
    return reviewDate.toISOString();
  }

  private getComplianceStatus(status: ExpedienteProviderStatus) {
    switch (status) {
      case 'Activo':
        return 'Al corriente' as const;
      case 'En revision':
        return 'En seguimiento' as const;
      case 'Observado':
      default:
        return 'Atencion prioritaria' as const;
    }
  }

  private getReviewStatus(status: ExpedienteProviderStatus) {
    switch (status) {
      case 'Activo':
        return 'Revision mensual' as const;
      case 'En revision':
        return 'Revision semanal' as const;
      case 'Observado':
      default:
        return 'Documentos por vencer' as const;
    }
  }

  private getInitialCompliance(status: ExpedienteProviderStatus): number {
    switch (status) {
      case 'Activo':
        return 90;
      case 'En revision':
        return 84;
      case 'Observado':
      default:
        return 72;
    }
  }

  private getUpdatedCompliance(
    currentCompliance: number,
    status: ExpedienteProviderStatus,
  ): number {
    const baseline = this.getInitialCompliance(status);
    if (status === 'Activo') {
      return Math.max(currentCompliance, baseline);
    }

    return Math.min(currentCompliance, baseline + 4);
  }

  private createPersonValidUntil(): string {
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 6);
    return validUntil.toISOString().slice(0, 10);
  }

  private personNeedsFollowUp(person: ExpedienteProviderPerson): boolean {
    return (
      person.documentSummary.pending > 0 ||
      person.documentSummary.observed > 0 ||
      person.recordStatus !== 'Vigente' ||
      person.reviewState !== 'Aprobado'
    );
  }

  private personIsActive(person: ExpedienteProviderPerson): boolean {
    return person.recordStatus !== 'Observado';
  }

  private personIsExpiring(person: ExpedienteProviderPerson): boolean {
    return person.recordStatus === 'Por vencer';
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private bumpTemplateVersion(currentVersion: string): string {
    const match = currentVersion.match(/^v(\d+)\.(\d+)$/i);
    if (!match) {
      return currentVersion;
    }

    const major = Number(match[1]);
    const minor = Number(match[2]) + 1;
    return `v${major}.${minor}`;
  }

  private buildExecutiveSummary(payload: ExpedienteProviderUpsertPayload): string {
    const contactText = payload.contactName
      ? `El contacto principal registrado es ${payload.contactName}.`
      : '';
    const notesText = payload.observations
      ? ` Observaciones operativas: ${payload.observations}`
      : '';

    return `Proveedor de ${payload.serviceType.toLowerCase()} con seguimiento administrativo en expediente. ${contactText}${notesText}`.trim();
  }

  private buildHistoryItem(params: {
    providerName: string;
    title: string;
    description: string;
    timestamp: string;
    type: ExpedienteProviderHistoryItem['type'];
  }): ExpedienteProviderHistoryItem {
    return {
      id: `${params.providerName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.parse(params.timestamp)}`,
      title: params.title,
      description: params.description,
      timestamp: params.timestamp,
      type: params.type,
    };
  }

  private getReviewComplianceLevel(
    progressPercent: number,
    pendingObservations: number,
  ): ExpedienteReviewComplianceLevel {
    if (progressPercent >= 80 && pendingObservations === 0) {
      return 'Alto';
    }

    if (progressPercent >= 55 && pendingObservations <= 2) {
      return 'Medio';
    }

    return 'Bajo';
  }

  private withRecalculatedProviderState(
    provider: ExpedienteProviderDetail,
  ): ExpedienteProviderDetail {
    const registeredPeople = provider.people.length;
    const activeRecords = provider.people.filter((person) => this.personIsActive(person)).length;
    const pendingItems = provider.people.filter((person) => this.personNeedsFollowUp(person)).length;
    const expiringDocuments = provider.people.filter((person) => this.personIsExpiring(person)).length;
    const compliancePercent =
      provider.people.length > 0
        ? Math.round(
            provider.people.reduce(
              (total, person) => total + getDocumentCompletionPercent(person.documentSummary),
              0,
            ) / provider.people.length,
          )
        : provider.compliancePercent;

    return {
      ...provider,
      registeredPeople,
      activeRecords,
      pendingItems,
      expiringDocuments,
      compliancePercent: this.clampPercent(compliancePercent),
    };
  }

  private getRecordStatusFromReviewState(
    reviewState: ExpedienteReviewWorkflowStatus,
    currentStatus: ExpedienteProviderPerson['recordStatus'],
  ): ExpedienteProviderPerson['recordStatus'] {
    switch (reviewState) {
      case 'Aprobado':
        return 'Vigente';
      case 'En revision':
        return 'En revision';
      case 'Observado':
      case 'Rechazado':
        return 'Observado';
      case 'Pendiente':
      default:
        return currentStatus === 'Vigente' ? 'En revision' : currentStatus;
    }
  }

  private buildReviewComplianceSummary(
    role: string,
    reviewState: ExpedienteReviewWorkflowStatus,
  ): string {
    switch (reviewState) {
      case 'Aprobado':
        return `Revision concluida para ${role.toLowerCase()} con expediente listo para operacion.`;
      case 'En revision':
        return `La validacion administrativa de ${role.toLowerCase()} se mantiene en curso con hallazgos controlados.`;
      case 'Observado':
        return `El expediente de ${role.toLowerCase()} conserva observaciones activas por atender.`;
      case 'Rechazado':
        return `La revision no puede liberarse para ${role.toLowerCase()} hasta corregir incidencias criticas.`;
      case 'Pendiente':
      default:
        return `El expediente de ${role.toLowerCase()} esta pendiente de revision inicial.`;
    }
  }

  private getDocumentCategory(label: string, serviceType: string): string {
    const normalized = label.toLowerCase();

    if (normalized.includes('ine')) {
      return 'Identificacion oficial';
    }

    if (normalized.includes('domicilio') || normalized.includes('fiscal')) {
      return 'Fiscal y domicilio';
    }

    if (normalized.includes('anexo')) {
      return 'Anexos';
    }

    if (
      normalized.includes('dc-3') ||
      normalized.includes('licencia') ||
      normalized.includes('certificacion') ||
      normalized.includes('permiso')
    ) {
      return 'Documentos tecnicos';
    }

    return serviceType.toLowerCase().includes('industrial')
      ? 'Documentos tecnicos'
      : 'Otros archivos';
  }

  private getDocumentType(label: string, serviceType: string): string {
    const normalized = label.toLowerCase();

    if (normalized.includes('ine')) {
      return 'Identificacion oficial';
    }

    if (normalized.includes('domicilio')) {
      return 'Comprobante de domicilio';
    }

    if (normalized.includes('fiscal')) {
      return 'Constancia fiscal';
    }

    if (normalized.includes('anexo')) {
      return 'Anexo administrativo';
    }

    if (normalized.includes('permiso') || normalized.includes('certificacion')) {
      return 'Documento tecnico';
    }

    return `Soporte ${serviceType.toLowerCase()}`;
  }

  private getFolderDefinitions(): FolderDefinition[] {
    return [
      {
        id: 'identidad',
        name: 'Identidad',
        description: 'INE y documentos de identificacion oficial.',
      },
      {
        id: 'fiscal-domicilio',
        name: 'Fiscal y domicilio',
        description: 'Soportes fiscales y comprobantes de ubicacion.',
      },
      {
        id: 'anexos',
        name: 'Anexos',
        description: 'Complementos administrativos y anexos operativos.',
      },
      {
        id: 'tecnicos',
        name: 'Documentos tecnicos',
        description: 'Permisos, certificaciones y evidencias de especialidad.',
      },
      {
        id: 'otros',
        name: 'Otros archivos',
        description: 'Archivos complementarios de soporte.',
      },
    ];
  }

  private getFolderByDocument(label: string, category: string): FolderDefinition {
    const normalized = `${label} ${category}`.toLowerCase();

    if (normalized.includes('ine') || normalized.includes('identificacion')) {
      return this.getFolderDefinitions()[0];
    }

    if (normalized.includes('fiscal') || normalized.includes('domicilio')) {
      return this.getFolderDefinitions()[1];
    }

    if (normalized.includes('anexo')) {
      return this.getFolderDefinitions()[2];
    }

    if (
      normalized.includes('tecnico') ||
      normalized.includes('permiso') ||
      normalized.includes('certificacion')
    ) {
      return this.getFolderDefinitions()[3];
    }

    return this.getFolderDefinitions()[4];
  }

  private buildDocumentStatuses(
    reviewState: ExpedienteReviewWorkflowStatus,
    totalDocuments: number,
  ): ExpedienteDocumentReviewStatus[] {
    let approved = totalDocuments;
    let observed = 0;
    let pending = 0;
    let missing = 0;

    switch (reviewState) {
      case 'Aprobado':
        break;
      case 'En revision':
        approved = Math.max(totalDocuments - 2, 1);
        pending = totalDocuments - approved;
        break;
      case 'Pendiente':
        approved = Math.max(totalDocuments - 3, 1);
        pending = 2;
        missing = 1;
        break;
      case 'Observado':
        approved = Math.max(totalDocuments - 2, 1);
        observed = 1;
        pending = 1;
        break;
      case 'Rechazado':
      default:
        approved = Math.max(totalDocuments - 4, 0);
        observed = 2;
        pending = 1;
        missing = 1;
        break;
    }

    const statuses: ExpedienteDocumentReviewStatus[] = [
      ...Array.from({ length: approved }, () => 'Aprobado' as const),
      ...Array.from({ length: observed }, () => 'Observado' as const),
      ...Array.from({ length: pending }, () => 'Pendiente' as const),
      ...Array.from({ length: missing }, () => 'Faltante' as const),
    ];

    return [
      ...statuses,
      ...Array.from(
        { length: totalDocuments - statuses.length },
        () => 'Aprobado' as const,
      ),
    ].slice(0, totalDocuments);
  }

  private getDocumentExtension(label: string): string {
    const normalized = label.toLowerCase();

    if (normalized.includes('ine') || normalized.includes('identificacion')) {
      return 'JPG';
    }

    return 'PDF';
  }

  private getDocumentReviewerNote(
    status: ExpedienteDocumentReviewStatus,
    label: string,
  ): string {
    switch (status) {
      case 'Aprobado':
        return `${label} validado sin inconsistencias relevantes.`;
      case 'Observado':
        return `${label} requiere correccion por legibilidad o vigencia.`;
      case 'Pendiente':
        return `${label} en espera de validacion documental por el administrador.`;
      case 'Faltante':
      default:
        return `${label} aun no cuenta con carga suficiente para revision.`;
    }
  }

  private getDataFieldProgress(
    reviewState: ExpedienteReviewWorkflowStatus,
    totalDataFields: number,
  ): { loadedDataFields: number; reviewedDataFields: number } {
    switch (reviewState) {
      case 'Aprobado':
        return { loadedDataFields: totalDataFields, reviewedDataFields: totalDataFields };
      case 'En revision':
        return {
          loadedDataFields: totalDataFields,
          reviewedDataFields: Math.max(totalDataFields - 1, 1),
        };
      case 'Observado':
        return {
          loadedDataFields: totalDataFields,
          reviewedDataFields: Math.max(totalDataFields - 2, 1),
        };
      case 'Rechazado':
        return {
          loadedDataFields: Math.max(totalDataFields - 1, 1),
          reviewedDataFields: 1,
        };
      case 'Pendiente':
      default:
        return {
          loadedDataFields: Math.max(totalDataFields - 1, 1),
          reviewedDataFields: 0,
        };
    }
  }

  private shiftDate(value: string, hoursDelta: number): string {
    const date = new Date(value);
    date.setHours(date.getHours() + hoursDelta);
    return date.toISOString();
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}

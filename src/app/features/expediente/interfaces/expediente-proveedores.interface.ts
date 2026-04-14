export type ExpedienteProviderStatus = 'Activo' | 'En revision' | 'Observado';

export type ExpedienteComplianceStatus =
  | 'Al corriente'
  | 'En seguimiento'
  | 'Atencion prioritaria';

export type ExpedienteReviewStatus =
  | 'Revision semanal'
  | 'Revision mensual'
  | 'Revision trimestral'
  | 'Documentos por vencer';

export type ExpedientePersonRecordStatus =
  | 'Vigente'
  | 'En revision'
  | 'Por vencer'
  | 'Observado';

export type ExpedienteReviewWorkflowStatus =
  | 'Pendiente'
  | 'En revision'
  | 'Observado'
  | 'Aprobado'
  | 'Rechazado';

export type ExpedienteReviewComplianceLevel = 'Alto' | 'Medio' | 'Bajo';

export type ExpedienteDocumentReviewStatus =
  | 'Aprobado'
  | 'Observado'
  | 'Pendiente'
  | 'Faltante';

export type ExpedienteRecordObservationStatus =
  | 'Pendiente'
  | 'En seguimiento'
  | 'Resuelta';

export type ExpedienteRecordHistoryType =
  | 'envio'
  | 'revision'
  | 'observacion'
  | 'aprobacion';

export type ExpedienteRepositoryHealth =
  | 'Estable'
  | 'Seguimiento'
  | 'Prioritario';

export type ExpedienteTemplateBaseFieldInputType =
  | 'text'
  | 'email'
  | 'phone'
  | 'file';

export type ExpedienteTemplateCustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'FILE'
  | 'TEXTAREA'
  | 'SELECT';

export type ExpedienteTemplateFileAllowedFormat =
  | 'PDF'
  | 'JPG'
  | 'PNG'
  | 'IMAGE';

export type ExpedienteTemplateDocumentSource = 'fixed' | 'optional' | 'extra';

export type ExpedienteHistoryType =
  | 'alta'
  | 'revision'
  | 'documento'
  | 'plantilla';

export interface ExpedienteProviderPersonDocumentSummary {
  requested: number;
  approved: number;
  pending: number;
  observed: number;
}

export interface ExpedienteProviderPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  recordStatus: ExpedientePersonRecordStatus;
  reviewState: ExpedienteReviewWorkflowStatus;
  validUntil: string;
  lastUpdate: string;
  submittedAt: string;
  documentSummary: ExpedienteProviderPersonDocumentSummary;
  complianceSummary: string;
  lastLinkSentAt: string | null;
}

export interface ExpedienteTemplateBaseField {
  id: string;
  label: string;
  category: 'data' | 'document';
  inputType: ExpedienteTemplateBaseFieldInputType;
  required: boolean;
  removable: boolean;
  enabled: boolean;
  description: string;
}

export interface ExpedienteTemplateCustomField {
  id: string;
  label: string;
  type: ExpedienteTemplateCustomFieldType;
  required: boolean;
  description: string;
  placeholder?: string;
  options?: string[];
  fileConfig?: {
    totalMaxSizeMb?: number;
    maxFiles?: number;
    maxSizePerFileMb?: number;
    allowedFormats?: ExpedienteTemplateFileAllowedFormat[];
  };
}

export interface ExpedienteTemplateRequestedDocument {
  id: string;
  label: string;
  source: ExpedienteTemplateDocumentSource;
  required: boolean;
  removable: boolean;
  description: string;
}

export interface ExpedienteProviderTemplate {
  name: string;
  version: string;
  assignedBy: string;
  updatedAt: string;
  baseFields: ExpedienteTemplateBaseField[];
  customFields: ExpedienteTemplateCustomField[];
}

export interface ExpedienteProviderRepositoryCategory {
  id: string;
  name: string;
  totalDocuments: number;
  currentDocuments: number;
  pendingDocuments: number;
  lastMovementAt: string;
  health: ExpedienteRepositoryHealth;
}

export interface ExpedienteProviderRepositoryDocument {
  id: string;
  name: string;
  category: string;
  owner: string;
  updatedAt: string;
  status: ExpedientePersonRecordStatus;
}

export interface ExpedienteProviderHistoryItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: ExpedienteHistoryType;
}

export interface ExpedienteProviderFiscalData {
  rfc: string;
  taxRegime: string;
  taxAddress: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  fiscalClassification: string;
}

export interface ExpedienteProviderDetail {
  id: string;
  name: string;
  businessName: string;
  serviceType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: ExpedienteProviderStatus;
  complianceStatus: ExpedienteComplianceStatus;
  reviewStatus: ExpedienteReviewStatus;
  registeredPeople: number;
  activeRecords: number;
  pendingItems: number;
  expiringDocuments: number;
  compliancePercent: number;
  updatedAt: string;
  nextReviewAt: string;
  observations: string;
  logoUrl: string | null;
  fiscalData: ExpedienteProviderFiscalData;
  executiveSummary: string;
  people: ExpedienteProviderPerson[];
  template: ExpedienteProviderTemplate;
  repositoryCategories: ExpedienteProviderRepositoryCategory[];
  latestDocuments: ExpedienteProviderRepositoryDocument[];
  history: ExpedienteProviderHistoryItem[];
}

export interface ExpedienteProviderListItem {
  id: string;
  name: string;
  businessName: string;
  serviceType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  registeredPeople: number;
  activeRecords: number;
  pendingItems: number;
  expiringDocuments: number;
  compliancePercent: number;
  status: ExpedienteProviderStatus;
  complianceStatus: ExpedienteComplianceStatus;
  reviewStatus: ExpedienteReviewStatus;
  updatedAt: string;
  logoUrl: string | null;
}

export interface ExpedienteProviderUpsertPayload {
  name: string;
  businessName: string;
  serviceType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: ExpedienteProviderStatus;
  observations: string;
  logoUrl: string | null;
  fiscalData: ExpedienteProviderFiscalData;
}

export interface ExpedienteProviderPersonUpsertPayload {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface ExpedienteReviewQueueItem {
  id: string;
  providerId: string;
  providerName: string;
  personId: string;
  personName: string;
  personRole: string;
  state: ExpedienteReviewWorkflowStatus;
  recordStatus: ExpedientePersonRecordStatus;
  compliance: ExpedienteReviewComplianceLevel;
  progressPercent: number;
  lastUpdated: string;
  submittedAt: string;
  validUntil: string;
  pendingObservations: number;
  approvedDocuments: number;
  totalDocuments: number;
  providerStatus: ExpedienteProviderStatus;
}

export interface ExpedienteRecordField {
  label: string;
  value: string;
  helper?: string;
}

export interface ExpedienteRecordDocumentFolder {
  id: string;
  name: string;
  description: string;
  totalDocuments: number;
  approvedDocuments: number;
  observedDocuments: number;
  pendingDocuments: number;
}

export interface ExpedienteRecordDocument {
  id: string;
  name: string;
  category: string;
  type: string;
  extension: string;
  status: ExpedienteDocumentReviewStatus;
  uploadedAt: string;
  validUntil: string | null;
  sizeLabel: string;
  uploadedBy: string;
  reviewerNote: string;
  folderId: string;
  folderName: string;
  required: boolean;
}

export interface ExpedienteRecordObservation {
  id: string;
  title: string;
  description: string;
  area: string;
  status: ExpedienteRecordObservationStatus;
  createdAt: string;
}

export interface ExpedienteRecordTimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: ExpedienteRecordHistoryType;
}

export interface ExpedienteRecordReviewSummary {
  totalDataFields: number;
  loadedDataFields: number;
  reviewedDataFields: number;
  totalDocuments: number;
  loadedDocuments: number;
  reviewedDocuments: number;
  approvedDocuments: number;
  observedDocuments: number;
  missingDocuments: number;
  pendingObservations: number;
  progressPercent: number;
}

export interface ExpedientePersonRecordDetail {
  id: string;
  providerId: string;
  providerName: string;
  providerBusinessName: string;
  providerServiceType: string;
  personId: string;
  personName: string;
  personRole: string;
  personEmail: string;
  personPhone: string;
  recordStatus: ExpedientePersonRecordStatus;
  reviewState: ExpedienteReviewWorkflowStatus;
  submittedAt: string;
  lastUpdate: string;
  validUntil: string;
  completionPercent: number;
  executiveSummary: string;
  reviewSummary: ExpedienteRecordReviewSummary;
  generalData: ExpedienteRecordField[];
  fiscalData: ExpedienteRecordField[];
  addressData: ExpedienteRecordField[];
  documents: ExpedienteRecordDocument[];
  folders: ExpedienteRecordDocumentFolder[];
  observations: ExpedienteRecordObservation[];
  history: ExpedienteRecordTimelineItem[];
}

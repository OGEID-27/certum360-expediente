import { Injectable } from "@angular/core";

export type ExpedienteDocumentStatus =
  | "CARGADO"
  | "PENDIENTE"
  | "VENCIDO"
  | "EN_REVISION"
  | "RECHAZADO";

export interface ExpedienteDocumentHistoryEntry {
  id: string;
  action: string;
  status: ExpedienteDocumentStatus;
  at: string;
  note: string;
  actor: string;
}

export interface ExpedienteDocumentRecord {
  id: string;
  order: number;
  name: string;
  description: string;
  status: ExpedienteDocumentStatus;
  uploadedAt: string | null;
  fileName: string | null;
  fileSizeLabel: string | null;
  observations: string;
  history: ExpedienteDocumentHistoryEntry[];
  version: number;
}

export interface SaveExpedienteDocumentPayload {
  fileName: string;
  fileSizeLabel: string;
  uploadedAt: string;
  observations: string;
  status: Exclude<ExpedienteDocumentStatus, "PENDIENTE" | "VENCIDO">;
}

type StoredDocumentRecord = Partial<ExpedienteDocumentRecord> & {
  history?: Array<Partial<ExpedienteDocumentHistoryEntry>>;
};

@Injectable({ providedIn: "root" })
export class ExpedienteStorageService {
  readonly storageKey = "evaluaciones.expediente.documents";

  constructor() {
    this.seedDemoDocuments();
  }

  list(): ExpedienteDocumentRecord[] {
    const baseDocuments = this.buildDemoDocuments();
    const storedById = new Map(
      this.read().map((document) => [String(document.id ?? ""), document]),
    );

    return baseDocuments
      .map((baseDocument) =>
        this.normalizeDocument(storedById.get(baseDocument.id), baseDocument),
      )
      .sort((a, b) => a.order - b.order);
  }

  getById(documentId: string): ExpedienteDocumentRecord | undefined {
    return this.list().find((document) => document.id === documentId);
  }

  saveUpload(
    documentId: string,
    payload: SaveExpedienteDocumentPayload,
  ): ExpedienteDocumentRecord | undefined {
    const documents = this.list();
    const index = documents.findIndex((document) => document.id === documentId);

    if (index < 0) {
      return undefined;
    }

    const currentDocument = documents[index];
    const normalizedUploadedAt = this.normalizeIsoDate(payload.uploadedAt);
    const nextStatus = payload.status;
    const observations =
      payload.observations.trim() || this.getDefaultObservation(nextStatus);
    const nextDocument: ExpedienteDocumentRecord = {
      ...currentDocument,
      status: nextStatus,
      uploadedAt: normalizedUploadedAt,
      fileName: payload.fileName.trim(),
      fileSizeLabel: payload.fileSizeLabel.trim() || "1.0 MB",
      observations,
      version: currentDocument.fileName ? currentDocument.version + 1 : 1,
      history: [
        {
          id: this.generateId("expediente_history"),
          action: currentDocument.fileName
            ? "Archivo reemplazado"
            : "Archivo cargado",
          status: nextStatus,
          at: normalizedUploadedAt,
          note: observations,
          actor: "Operacion administrativa",
        },
        ...currentDocument.history,
      ],
    };

    documents[index] = nextDocument;
    this.write(documents);
    return nextDocument;
  }

  clearUpload(documentId: string): ExpedienteDocumentRecord | undefined {
    const documents = this.list();
    const index = documents.findIndex((document) => document.id === documentId);

    if (index < 0) {
      return undefined;
    }

    const currentDocument = documents[index];
    const clearedAt = new Date().toISOString();
    const nextDocument: ExpedienteDocumentRecord = {
      ...currentDocument,
      status: "PENDIENTE",
      uploadedAt: null,
      fileName: null,
      fileSizeLabel: null,
      observations: "Documento pendiente por nueva carga.",
      history: [
        {
          id: this.generateId("expediente_history"),
          action: "Archivo eliminado",
          status: "PENDIENTE",
          at: clearedAt,
          note: "Se retiro el archivo para cargar una nueva version.",
          actor: "Operacion administrativa",
        },
        ...currentDocument.history,
      ],
    };

    documents[index] = nextDocument;
    this.write(documents);
    return nextDocument;
  }

  private seedDemoDocuments(): void {
    if (this.read().length > 0) {
      return;
    }

    this.write(this.buildDemoDocuments());
  }

  private buildDemoDocuments(): ExpedienteDocumentRecord[] {
    return [
      {
        id: "constancia-situacion-fiscal",
        order: 1,
        name: "Constancia de situacion fiscal",
        description:
          "Documento SAT vigente con datos fiscales de la empresa cliente.",
        status: "CARGADO",
        uploadedAt: this.daysAgo(2),
        fileName: "constancia_situacion_fiscal_marzo_2026.pdf",
        fileSizeLabel: "1.4 MB",
        observations:
          "Documento validado y vigente para el ciclo actual de revision.",
        version: 1,
        history: [
          {
            id: "hist_constancia_1",
            action: "Archivo cargado",
            status: "CARGADO",
            at: this.daysAgo(2),
            note: "Validado por administracion documental.",
            actor: "Operacion administrativa",
          },
        ],
      },
      {
        id: "comprobante-domicilio",
        order: 2,
        name: "Comprobante de domicilio",
        description:
          "Recibo reciente del domicilio fiscal o corporativo del cliente.",
        status: "PENDIENTE",
        uploadedAt: null,
        fileName: null,
        fileSizeLabel: null,
        observations:
          "Sin archivo cargado. Requerido para concluir la validacion del expediente.",
        version: 0,
        history: [
          {
            id: "hist_domicilio_1",
            action: "Documento requerido",
            status: "PENDIENTE",
            at: this.daysAgo(5),
            note: "Pendiente de recepcion por parte del cliente.",
            actor: "Sistema local",
          },
        ],
      },
      {
        id: "acta-constitutiva",
        order: 3,
        name: "Acta constitutiva",
        description:
          "Acta societaria y ultima reforma corporativa aplicable.",
        status: "EN_REVISION",
        uploadedAt: this.daysAgo(1),
        fileName: "acta_constitutiva_actualizada_v2.pdf",
        fileSizeLabel: "3.8 MB",
        observations:
          "Se revisa la integracion de la ultima reforma y poderes vigentes.",
        version: 2,
        history: [
          {
            id: "hist_acta_2",
            action: "Archivo reemplazado",
            status: "EN_REVISION",
            at: this.daysAgo(1),
            note: "Se cargo una version con anexos complementarios.",
            actor: "Operacion administrativa",
          },
          {
            id: "hist_acta_1",
            action: "Archivo cargado",
            status: "CARGADO",
            at: this.daysAgo(7),
            note: "Version inicial del acta constitutiva.",
            actor: "Operacion administrativa",
          },
        ],
      },
      {
        id: "ine-representante-legal",
        order: 4,
        name: "INE de socios o representante legal",
        description:
          "Identificacion oficial legible del representante legal o socios obligados.",
        status: "RECHAZADO",
        uploadedAt: this.daysAgo(4),
        fileName: "ine_representante_legal_frente.jpg",
        fileSizeLabel: "820 KB",
        observations:
          "Se requiere una nueva carga con frente y reverso legibles.",
        version: 1,
        history: [
          {
            id: "hist_ine_2",
            action: "Revision concluida",
            status: "RECHAZADO",
            at: this.daysAgo(3),
            note: "El reverso no fue adjuntado en la evidencia.",
            actor: "Mesa documental",
          },
          {
            id: "hist_ine_1",
            action: "Archivo cargado",
            status: "EN_REVISION",
            at: this.daysAgo(4),
            note: "Pendiente de validar legibilidad del documento.",
            actor: "Operacion administrativa",
          },
        ],
      },
      {
        id: "opinion-cumplimiento-sat",
        order: 5,
        name: "Opinion de cumplimiento SAT",
        description:
          "Opinion positiva de cumplimiento con vigencia mensual.",
        status: "VENCIDO",
        uploadedAt: this.daysAgo(32),
        fileName: "opinion_cumplimiento_sat_febrero_2026.pdf",
        fileSizeLabel: "960 KB",
        observations:
          "La opinion excedio la vigencia recomendada. Debe renovarse este mes.",
        version: 1,
        history: [
          {
            id: "hist_opinion_2",
            action: "Vigencia expirada",
            status: "VENCIDO",
            at: this.daysAgo(1),
            note: "Se requiere una opinion SAT del periodo vigente.",
            actor: "Sistema local",
          },
          {
            id: "hist_opinion_1",
            action: "Archivo cargado",
            status: "CARGADO",
            at: this.daysAgo(32),
            note: "Documento aceptado en su carga inicial.",
            actor: "Operacion administrativa",
          },
        ],
      },
    ];
  }

  private normalizeDocument(
    value: StoredDocumentRecord | undefined,
    fallback: ExpedienteDocumentRecord,
  ): ExpedienteDocumentRecord {
    const history = Array.isArray(value?.history)
      ? value?.history
      : fallback.history;

    return {
      id: String(value?.id ?? fallback.id),
      order: this.normalizeNumber(value?.order, fallback.order),
      name: String(value?.name ?? fallback.name),
      description: String(value?.description ?? fallback.description),
      status: this.normalizeStatus(value?.status, fallback.status),
      uploadedAt: this.normalizeNullableDate(
        value?.uploadedAt ?? fallback.uploadedAt,
      ),
      fileName: this.normalizeNullableString(value?.fileName ?? fallback.fileName),
      fileSizeLabel: this.normalizeNullableString(
        value?.fileSizeLabel ?? fallback.fileSizeLabel,
      ),
      observations: String(value?.observations ?? fallback.observations),
      version: this.normalizeNumber(value?.version, fallback.version),
      history: history
        .map((entry, index) => this.normalizeHistoryEntry(entry, index))
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    };
  }

  private normalizeHistoryEntry(
    value: Partial<ExpedienteDocumentHistoryEntry>,
    index: number,
  ): ExpedienteDocumentHistoryEntry {
    const normalizedDate = this.normalizeIsoDate(value.at);

    return {
      id: String(value.id ?? `expediente_history_${index}`),
      action: String(value.action ?? "Actualizacion"),
      status: this.normalizeStatus(value.status, "PENDIENTE"),
      at: normalizedDate,
      note: String(value.note ?? "Movimiento registrado en almacenamiento local."),
      actor: String(value.actor ?? "Sistema local"),
    };
  }

  private normalizeStatus(
    value: unknown,
    fallback: ExpedienteDocumentStatus,
  ): ExpedienteDocumentStatus {
    if (
      value === "CARGADO" ||
      value === "PENDIENTE" ||
      value === "VENCIDO" ||
      value === "EN_REVISION" ||
      value === "RECHAZADO"
    ) {
      return value;
    }

    return fallback;
  }

  private normalizeIsoDate(value: unknown): string {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return new Date().toISOString();
    }

    const candidate =
      /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : raw;
    const parsed = Date.parse(candidate);
    return Number.isFinite(parsed)
      ? new Date(parsed).toISOString()
      : new Date().toISOString();
  }

  private normalizeNullableDate(value: unknown): string | null {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }

    return this.normalizeIsoDate(value);
  }

  private normalizeNullableString(value: unknown): string | null {
    const normalized = String(value ?? "").trim();
    return normalized ? normalized : null;
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private getDefaultObservation(status: ExpedienteDocumentStatus): string {
    if (status === "RECHAZADO") {
      return "Carga registrada con observaciones pendientes por corregir.";
    }

    if (status === "EN_REVISION") {
      return "Documento recibido y en revision documental.";
    }

    return "Documento cargado correctamente en el expediente.";
  }

  private read(): StoredDocumentRecord[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as StoredDocumentRecord[]) : [];
    } catch {
      return [];
    }
  }

  private write(documents: ExpedienteDocumentRecord[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(documents));
  }

  private daysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  private generateId(prefix: string): string {
    const uuid =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    return `${prefix}_${uuid}`;
  }
}

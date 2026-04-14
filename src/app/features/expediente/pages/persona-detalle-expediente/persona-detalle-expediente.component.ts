import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { combineLatest } from "rxjs";
import {
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BadgeX,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CircleAlert,
  ClipboardCheck,
  Eye,
  FileText,
  FolderOpen,
  History,
  LayoutTemplate,
  LucideAngularModule,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-angular";
import {
  ExpedientePersonRecordDetail,
  ExpedienteProviderDetail,
  ExpedienteProviderPerson,
  ExpedienteRecordDocument,
  ExpedienteRecordObservation,
  ExpedienteRecordTimelineItem,
  ExpedienteReviewWorkflowStatus,
  ExpedienteTemplateBaseField,
  ExpedienteTemplateCustomField,
} from "../../interfaces/expediente-proveedores.interface";
import { ExpedienteProveedoresService } from "../../services/expediente-proveedores.service";
import { ToastService } from "../../../../shared/services/toast.service";

type DetailTab = "campos" | "documentos" | "historial";
type DocumentViewMode = "explorer" | "table";
type ReviewItemStatus = "Pendiente" | "Aprobado" | "Observado" | "Rechazado";
type TemplateFieldSource = "Base" | "Personalizado";
type FileKind = "image" | "pdf";
type ExplorerPath = string | null;

interface TemplateFieldRow {
  id: string;
  label: string;
  fieldType: string;
  value: string;
  description: string;
  source: TemplateFieldSource;
  required: boolean;
  status: ReviewItemStatus;
  comment: string;
}

interface ReviewDocumentItem extends ExpedienteRecordDocument {
  reviewStatus: ReviewItemStatus;
  reviewComment: string;
  fileAvailable: boolean;
  fileKind: FileKind;
}

interface ExplorerFolder {
  id: string;
  name: string;
  description: string;
  totalDocuments: number;
  approvedDocuments: number;
  observedDocuments: number;
  rejectedDocuments: number;
  pendingDocuments: number;
}

interface ExplorerBreadcrumb {
  label: string;
  folderId: string | null;
}

@Component({
  selector: "app-persona-detalle-expediente",
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: "./persona-detalle-expediente.component.html",
})
export class PersonaDetalleExpedienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly providersService = inject(ExpedienteProveedoresService);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly ArrowUp = ArrowUp;
  readonly UserRound = UserRound;
  readonly ShieldCheck = ShieldCheck;
  readonly FolderOpen = FolderOpen;
  readonly Building2 = Building2;
  readonly CalendarDays = CalendarDays;
  readonly ClipboardCheck = ClipboardCheck;
  readonly BadgeCheck = BadgeCheck;
  readonly BadgeX = BadgeX;
  readonly LayoutTemplate = LayoutTemplate;
  readonly FileText = FileText;
  readonly CircleAlert = CircleAlert;
  readonly Clock3 = Clock3;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly History = History;
  readonly Eye = Eye;
  readonly Save = Save;

  readonly tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "campos", label: "Campos" },
    { id: "documentos", label: "Documentos" },
    { id: "historial", label: "Historial" },
  ];

  readonly reviewStatuses: ReviewItemStatus[] = [
    "Pendiente",
    "Aprobado",
    "Observado",
    "Rechazado",
  ];

  readonly folderIconPath = "/images/icons/icons8-carpeta-96.png";
  readonly imageIconPath = "/images/icons/icons8-imagen-96.png";
  readonly pdfIconPath = "/images/icons/icons8-pdf-96.png";

  provider: ExpedienteProviderDetail | null = null;
  person: ExpedienteProviderPerson | null = null;
  recordDetail: ExpedientePersonRecordDetail | null = null;
  activeTab: DetailTab = "campos";
  documentView: DocumentViewMode = "explorer";
  currentExplorerFolderId: ExplorerPath = null;
  private explorerHistory: ExplorerPath[] = [null];
  private explorerHistoryIndex = 0;
  selectedFolderId: string | null = null;
  selectedDocumentId: string | null = null;
  previewDocumentId: string | null = null;
  commentModalDocumentId: string | null = null;
  cameFromReview = false;

  reviewFields: TemplateFieldRow[] = [];
  reviewDocuments: ReviewDocumentItem[] = [];

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, queryParams]) => {
        const providerId = params.get("id");
        const personId = params.get("personId");
        this.cameFromReview = queryParams.get("source") === "revision";

        if (!providerId || !personId) {
          this.provider = null;
          this.person = null;
          this.recordDetail = null;
          this.reviewFields = [];
          this.reviewDocuments = [];
          return;
        }

        this.loadRecord(providerId, personId);
      });
  }

  get backLink(): string[] {
    return this.cameFromReview
      ? ["/expediente/revision"]
      : ["/expediente/proveedores", this.provider?.id ?? ""];
  }

  get backLabel(): string {
    return this.cameFromReview ? "Volver a revision" : "Volver a personas";
  }

  get explorerFolders(): ExplorerFolder[] {
    if (!this.recordDetail) {
      return [];
    }

    return this.recordDetail.folders
      .map((folder) => {
        const folderDocuments = this.reviewDocuments.filter(
          (document) => document.folderId === folder.id,
        );

        return {
          id: folder.id,
          name: folder.name,
          description: folder.description,
          totalDocuments: folderDocuments.length,
          approvedDocuments: folderDocuments.filter(
            (document) => document.reviewStatus === "Aprobado",
          ).length,
          observedDocuments: folderDocuments.filter(
            (document) => document.reviewStatus === "Observado",
          ).length,
          rejectedDocuments: folderDocuments.filter(
            (document) => document.reviewStatus === "Rechazado",
          ).length,
          pendingDocuments: folderDocuments.filter(
            (document) =>
              document.reviewStatus === "Pendiente" || !document.fileAvailable,
          ).length,
        };
      })
      .filter((folder) => folder.totalDocuments > 0);
  }

  get selectedFolder(): ExplorerFolder | null {
    return (
      this.explorerFolders.find(
        (folder) => folder.id === this.selectedFolderId,
      ) ?? null
    );
  }

  get currentExplorerFolder(): ExplorerFolder | null {
    return (
      this.explorerFolders.find(
        (folder) => folder.id === this.currentExplorerFolderId,
      ) ?? null
    );
  }

  get explorerBreadcrumbs(): ExplorerBreadcrumb[] {
    const breadcrumbs: ExplorerBreadcrumb[] = [
      { label: "Expediente", folderId: null },
      { label: "Documentos", folderId: null },
    ];

    if (this.currentExplorerFolder) {
      breadcrumbs.push({
        label: this.currentExplorerFolder.name,
        folderId: this.currentExplorerFolder.id,
      });
    }

    return breadcrumbs;
  }

  get canGoBackInExplorer(): boolean {
    return this.explorerHistoryIndex > 0;
  }

  get canGoForwardInExplorer(): boolean {
    return this.explorerHistoryIndex < this.explorerHistory.length - 1;
  }

  get canGoUpInExplorer(): boolean {
    return this.currentExplorerFolderId !== null;
  }

  get isExplorerAtRoot(): boolean {
    return this.currentExplorerFolderId === null;
  }

  get currentFolderDocuments(): ReviewDocumentItem[] {
    if (!this.currentExplorerFolderId) {
      return [];
    }

    return this.reviewDocuments.filter(
      (document) => document.folderId === this.currentExplorerFolderId,
    );
  }

  get selectedDocument(): ReviewDocumentItem | null {
    return (
      this.reviewDocuments.find(
        (document) => document.id === this.selectedDocumentId,
      ) ?? null
    );
  }

  get previewDocument(): ReviewDocumentItem | null {
    return (
      this.reviewDocuments.find(
        (document) => document.id === this.previewDocumentId,
      ) ?? null
    );
  }

  get commentModalDocument(): ReviewDocumentItem | null {
    return (
      this.reviewDocuments.find(
        (document) => document.id === this.commentModalDocumentId,
      ) ?? null
    );
  }

  get detailFolder(): ExplorerFolder | null {
    return this.selectedDocument
      ? null
      : (this.selectedFolder ??
          this.currentExplorerFolder ??
          this.explorerFolders[0] ??
          null);
  }

  get personAvatarUrl(): string | null {
    return (
      ((this.person as { avatarUrl?: string | null } | null)?.avatarUrl ??
        null) ||
      null
    );
  }

  get personInitials(): string {
    const fullName = this.person?.name?.trim() ?? "";
    if (!fullName) {
      return "NA";
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstInitial = parts[0]?.charAt(0) ?? "";
    const lastInitial =
      parts.length > 1
        ? (parts[parts.length - 1]?.charAt(0) ?? "")
        : (parts[0]?.charAt(1) ?? parts[0]?.charAt(0) ?? "");

    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  get reviewOverview() {
    const totalFields = this.reviewFields.length;
    const loadedFields = this.reviewFields.filter(
      (field) => field.value.trim().length > 0,
    ).length;
    const approvedFields = this.reviewFields.filter(
      (field) => field.status === "Aprobado",
    ).length;
    const observedFields = this.reviewFields.filter(
      (field) => field.status === "Observado",
    ).length;
    const rejectedFields = this.reviewFields.filter(
      (field) => field.status === "Rechazado",
    ).length;
    const pendingFields = this.reviewFields.filter(
      (field) => field.status === "Pendiente",
    ).length;

    const totalDocuments = this.reviewDocuments.length;
    const loadedDocuments = this.reviewDocuments.filter(
      (document) => document.fileAvailable,
    ).length;
    const approvedDocuments = this.reviewDocuments.filter(
      (document) => document.reviewStatus === "Aprobado",
    ).length;
    const observedDocuments = this.reviewDocuments.filter(
      (document) => document.reviewStatus === "Observado",
    ).length;
    const rejectedDocuments = this.reviewDocuments.filter(
      (document) => document.reviewStatus === "Rechazado",
    ).length;
    const pendingDocuments = this.reviewDocuments.filter(
      (document) => document.reviewStatus === "Pendiente",
    ).length;
    const missingDocuments = this.reviewDocuments.filter(
      (document) => !document.fileAvailable,
    ).length;

    const reviewedFields = approvedFields + observedFields + rejectedFields;
    const reviewedDocuments =
      approvedDocuments + observedDocuments + rejectedDocuments;
    const totalItems = totalFields + totalDocuments;
    const reviewedItems = reviewedFields + reviewedDocuments;
    const progressPercent =
      totalItems > 0 ? Math.round((reviewedItems / totalItems) * 100) : 0;
    const pendingCorrections =
      observedFields + rejectedFields + observedDocuments + rejectedDocuments;

    if (rejectedFields + rejectedDocuments > 0) {
      return {
        totalFields,
        loadedFields,
        approvedFields,
        observedFields,
        rejectedFields,
        pendingFields,
        reviewedFields,
        totalDocuments,
        loadedDocuments,
        approvedDocuments,
        observedDocuments,
        rejectedDocuments,
        pendingDocuments,
        missingDocuments,
        reviewedDocuments,
        progressPercent,
        pendingCorrections,
        globalLabel: "Requiere correccion",
        globalDetail:
          "Hay campos o documentos rechazados. El expediente debe corregirse antes de liberarse.",
        tone: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
      };
    }

    if (observedFields + observedDocuments > 0) {
      return {
        totalFields,
        loadedFields,
        approvedFields,
        observedFields,
        rejectedFields,
        pendingFields,
        reviewedFields,
        totalDocuments,
        loadedDocuments,
        approvedDocuments,
        observedDocuments,
        rejectedDocuments,
        pendingDocuments,
        missingDocuments,
        reviewedDocuments,
        progressPercent,
        pendingCorrections,
        globalLabel: "En observacion",
        globalDetail:
          "La revision detecto observaciones activas. Hay elementos que requieren ajuste o comentario del proveedor.",
        tone: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
      };
    }

    if (pendingFields + pendingDocuments > 0 || missingDocuments > 0) {
      return {
        totalFields,
        loadedFields,
        approvedFields,
        observedFields,
        rejectedFields,
        pendingFields,
        reviewedFields,
        totalDocuments,
        loadedDocuments,
        approvedDocuments,
        observedDocuments,
        rejectedDocuments,
        pendingDocuments,
        missingDocuments,
        reviewedDocuments,
        progressPercent,
        pendingCorrections,
        globalLabel: "En revision",
        globalDetail:
          "Todavia hay elementos pendientes de revision o documentos sin archivo disponible.",
        tone: "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300",
      };
    }

    return {
      totalFields,
      loadedFields,
      approvedFields,
      observedFields,
      rejectedFields,
      pendingFields,
      reviewedFields,
      totalDocuments,
      loadedDocuments,
      approvedDocuments,
      observedDocuments,
      rejectedDocuments,
      pendingDocuments,
      missingDocuments,
      reviewedDocuments,
      progressPercent: 100,
      pendingCorrections: 0,
      globalLabel: "Listo para liberar",
      globalDetail:
        "Todos los campos y documentos definidos en la plantilla quedaron aprobados.",
      tone: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }

  get executiveCards() {
    const overview = this.reviewOverview;

    return [
      {
        label: "Datos cargados",
        value: `${overview.loadedFields}/${overview.totalFields}`,
        icon: this.ClipboardCheck,
        tone: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
      },
      {
        label: "Datos aprobados",
        value: `${overview.approvedFields}`,
        icon: this.BadgeCheck,
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        label: "Datos pendientes",
        value: `${overview.pendingFields}`,
        icon: this.CircleAlert,
        tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
      },
      {
        label: "Incidencias en datos",
        value: `${overview.observedFields + overview.rejectedFields}`,
        icon: this.ShieldCheck,
        tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        label: "Documentos cargados",
        value: `${overview.loadedDocuments}/${overview.totalDocuments}`,
        icon: this.FolderOpen,
        tone: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
      },
      {
        label: "Documentos aprobados",
        value: `${overview.approvedDocuments}`,
        icon: this.FileText,
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
      {
        label: "Documentos pendientes",
        value: `${overview.pendingDocuments + overview.missingDocuments}`,
        icon: this.CircleAlert,
        tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
      },
      {
        label: "Correcciones activas",
        value: `${overview.pendingCorrections}`,
        icon: this.LayoutTemplate,
        tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
      },
    ];
  }

  get generatedObservations(): ExpedienteRecordObservation[] {
    if (!this.recordDetail || !this.provider) {
      return [];
    }

    const recordDetail = this.recordDetail;
    const observations: ExpedienteRecordObservation[] = [];

    this.reviewFields.forEach((field, index) => {
      if (field.status !== "Observado" && field.status !== "Rechazado") {
        return;
      }

      observations.push({
        id: `field-${field.id}`,
        title:
          field.status === "Rechazado"
            ? `Campo rechazado: ${field.label}`
            : `Campo observado: ${field.label}`,
        description:
          field.comment ||
          this.getDefaultFieldComment(field.label, field.status),
        area: "Campos de plantilla",
        status: "Pendiente",
        createdAt: this.offsetIso(recordDetail.lastUpdate, -(index + 1) * 2),
      });
    });

    this.reviewDocuments.forEach((document, index) => {
      if (!document.fileAvailable) {
        observations.push({
          id: `missing-${document.id}`,
          title: `${document.name} pendiente de carga`,
          description:
            document.reviewComment ||
            "No existe archivo disponible para cerrar la revision documental.",
          area: document.category,
          status: "En seguimiento",
          createdAt: this.offsetIso(recordDetail.submittedAt, (index + 1) * 3),
        });
        return;
      }

      if (
        document.reviewStatus !== "Observado" &&
        document.reviewStatus !== "Rechazado"
      ) {
        return;
      }

      observations.push({
        id: `document-${document.id}`,
        title:
          document.reviewStatus === "Rechazado"
            ? `Documento rechazado: ${document.name}`
            : `Documento observado: ${document.name}`,
        description:
          document.reviewComment ||
          this.getDefaultDocumentComment(document, document.reviewStatus),
        area: document.category,
        status: "Pendiente",
        createdAt: this.offsetIso(recordDetail.lastUpdate, -(index + 1) * 3),
      });
    });

    if (this.provider.observations.trim().length > 0) {
      observations.push({
        id: `${this.person?.id}-provider-note`,
        title: "Seguimiento operativo del proveedor",
        description: this.provider.observations,
        area: this.provider.serviceType,
        status:
          this.reviewOverview.pendingCorrections === 0
            ? "Resuelta"
            : "En seguimiento",
        createdAt: this.offsetIso(recordDetail.lastUpdate, 6),
      });
    }

    if (!observations.length) {
      observations.push({
        id: `${this.person?.id}-stable`,
        title: "Sin incidencias activas",
        description:
          "No hay observaciones abiertas en campos o documentos. El expediente se mantiene estable.",
        area: "Expediente",
        status: "Resuelta",
        createdAt: recordDetail.lastUpdate,
      });
    }

    return observations.sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
  }

  setActiveTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  setDocumentView(view: DocumentViewMode): void {
    this.documentView = view;
  }

  selectFolder(folderId: string): void {
    this.selectedFolderId = folderId;
    this.selectedDocumentId = null;
  }

  openFolder(folderId: string): void {
    this.selectFolder(folderId);
    this.setExplorerLocation(folderId);
  }

  navigateToExplorerRoot(): void {
    this.setExplorerLocation(null);
  }

  navigateToExplorerBreadcrumb(folderId: string | null): void {
    this.setExplorerLocation(folderId);
  }

  goBackInExplorer(): void {
    if (!this.canGoBackInExplorer) {
      return;
    }

    this.explorerHistoryIndex -= 1;
    this.applyExplorerLocation(
      this.explorerHistory[this.explorerHistoryIndex] ?? null,
    );
  }

  goForwardInExplorer(): void {
    if (!this.canGoForwardInExplorer) {
      return;
    }

    this.explorerHistoryIndex += 1;
    this.applyExplorerLocation(
      this.explorerHistory[this.explorerHistoryIndex] ?? null,
    );
  }

  goUpInExplorer(): void {
    if (!this.canGoUpInExplorer) {
      return;
    }

    this.setExplorerLocation(null);
  }

  selectDocument(documentId: string): void {
    const document = this.reviewDocuments.find(
      (item) => item.id === documentId,
    );
    if (!document) {
      return;
    }

    this.selectedFolderId = document.folderId;
    this.selectedDocumentId = documentId;
  }

  openDocumentPreview(document: ReviewDocumentItem): void {
    this.selectDocument(document.id);
    this.setExplorerLocation(document.folderId, { preserveSelection: true });
    this.previewDocumentId = document.id;
  }

  closeDocumentPreview(): void {
    this.previewDocumentId = null;
  }

  openCommentModal(document: ReviewDocumentItem): void {
    this.commentModalDocumentId = document.id;
  }

  closeCommentModal(): void {
    this.commentModalDocumentId = null;
  }

  saveReviewChanges(): void {
    this.toastService.show({
      type: "success",
      message: "Los cambios de revision se guardaron localmente en esta vista.",
    });
  }

  updateFieldStatus(fieldId: string, status: ReviewItemStatus): void {
    this.reviewFields = this.reviewFields.map((field) => {
      if (field.id !== fieldId) {
        return field;
      }

      return {
        ...field,
        status,
        comment: this.getUpdatedComment(
          field.comment,
          status,
          this.getDefaultFieldComment(field.label, status),
        ),
      };
    });
  }

  updateFieldComment(fieldId: string, comment: string): void {
    this.reviewFields = this.reviewFields.map((field) =>
      field.id === fieldId ? { ...field, comment } : field,
    );
  }

  updateDocumentStatus(documentId: string, status: ReviewItemStatus): void {
    this.reviewDocuments = this.reviewDocuments.map((document) => {
      if (document.id !== documentId) {
        return document;
      }

      if (status === "Aprobado" && !document.fileAvailable) {
        return document;
      }

      return {
        ...document,
        reviewStatus: status,
        reviewComment: this.getUpdatedComment(
          document.reviewComment,
          status,
          this.getDefaultDocumentComment(document, status),
        ),
      };
    });
  }

  updateDocumentComment(documentId: string, comment: string): void {
    this.reviewDocuments = this.reviewDocuments.map((document) =>
      document.id === documentId
        ? { ...document, reviewComment: comment }
        : document,
    );
  }

  openObservationDocument(observation: ExpedienteRecordObservation): void {
    const document = this.reviewDocuments.find((item) =>
      observation.title.toLowerCase().includes(item.name.toLowerCase()),
    );

    if (!document) {
      return;
    }

    this.activeTab = "documentos";
    this.documentView = "explorer";
    this.openDocumentPreview(document);
  }

  canOpenObservationDocument(
    observation: ExpedienteRecordObservation,
  ): boolean {
    return this.reviewDocuments.some((item) =>
      observation.title.toLowerCase().includes(item.name.toLowerCase()),
    );
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
    }).format(new Date(value));
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  getReviewStatusIcon(status: ReviewItemStatus) {
    switch (status) {
      case "Aprobado":
        return this.BadgeCheck;
      case "Observado":
        return this.CircleAlert;
      case "Rechazado":
        return this.BadgeX;
      case "Pendiente":
      default:
        return this.Clock3;
    }
  }

  getReviewStatusClass(status: ReviewItemStatus): string {
    switch (status) {
      case "Aprobado":
        return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
      case "Observado":
        return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
      case "Rechazado":
        return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
      case "Pendiente":
      default:
        return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    }
  }

  getRecordStatusClass(
    status: ExpedienteProviderPerson["recordStatus"],
  ): string {
    switch (status) {
      case "Vigente":
        return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
      case "En revision":
        return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
      case "Por vencer":
        return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
      case "Observado":
      default:
        return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
    }
  }

  getObservationStatusClass(
    status: ExpedienteRecordObservation["status"],
  ): string {
    switch (status) {
      case "Resuelta":
        return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
      case "En seguimiento":
        return "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300";
      case "Pendiente":
      default:
        return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    }
  }

  getTimelineTone(item: ExpedienteRecordTimelineItem): string {
    switch (item.type) {
      case "aprobacion":
        return "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";
      case "observacion":
        return "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";
      case "revision":
        return "bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200";
      case "envio":
      default:
        return "bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200";
    }
  }

  getFolderTone(folder: ExplorerFolder): string {
    if (folder.rejectedDocuments > 0) {
      return "border-rose-300 bg-rose-50/80 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
    }

    if (folder.observedDocuments > 0 || folder.pendingDocuments > 0) {
      return "border-amber-300 bg-amber-50/80 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    }

    return "border-emerald-300 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  getFieldCommentPlaceholder(field: TemplateFieldRow): string {
    if (field.status === "Observado" || field.status === "Rechazado") {
      return "Describe la incidencia o la correccion esperada.";
    }

    return "Comentario del revisor para este campo.";
  }

  getDocumentCommentPlaceholder(document: ReviewDocumentItem): string {
    if (
      document.reviewStatus === "Observado" ||
      document.reviewStatus === "Rechazado"
    ) {
      return "Indica la incidencia documental y la accion requerida.";
    }

    if (!document.fileAvailable) {
      return "Documento sin archivo cargado. Indica el seguimiento requerido.";
    }

    return "Comentario del revisor para este documento.";
  }

  getDocumentIcon(document: ReviewDocumentItem): string {
    return document.fileKind === "image"
      ? this.imageIconPath
      : this.pdfIconPath;
  }

  getFolderRoute(folder: ExplorerFolder): string {
    return `Expediente / Documentos / ${folder.name}`;
  }

  getDocumentRoute(document: ReviewDocumentItem): string {
    const fallbackFolder: ExplorerFolder = {
      id: document.folderId,
      name: document.folderName,
      description: "",
      totalDocuments: 0,
      approvedDocuments: 0,
      observedDocuments: 0,
      rejectedDocuments: 0,
      pendingDocuments: 0,
    };

    return `${this.getFolderRoute(
      this.explorerFolders.find((folder) => folder.id === document.folderId) ??
        fallbackFolder,
    )} / ${document.name}`;
  }

  trackByField(_: number, field: TemplateFieldRow): string {
    return field.id;
  }

  trackByFolder(_: number, folder: ExplorerFolder): string {
    return folder.id;
  }

  trackByDocument(_: number, document: ReviewDocumentItem): string {
    return document.id;
  }

  trackByObservation(
    _: number,
    observation: ExpedienteRecordObservation,
  ): string {
    return observation.id;
  }

  trackByTimeline(_: number, item: ExpedienteRecordTimelineItem): string {
    return item.id;
  }

  private setExplorerLocation(
    folderId: ExplorerPath,
    options?: { preserveSelection?: boolean },
  ): void {
    const nextLocation = folderId ?? null;
    const currentLocation =
      this.explorerHistory[this.explorerHistoryIndex] ?? null;

    if (currentLocation === nextLocation) {
      this.applyExplorerLocation(nextLocation, options);
      return;
    }

    this.explorerHistory = this.explorerHistory.slice(
      0,
      this.explorerHistoryIndex + 1,
    );
    this.explorerHistory.push(nextLocation);
    this.explorerHistoryIndex = this.explorerHistory.length - 1;
    this.applyExplorerLocation(nextLocation, options);
  }

  private applyExplorerLocation(
    folderId: ExplorerPath,
    options?: { preserveSelection?: boolean },
  ): void {
    this.currentExplorerFolderId = folderId ?? null;

    if (folderId) {
      this.selectedFolderId = folderId;

      if (!options?.preserveSelection) {
        this.selectedDocumentId = null;
      }

      return;
    }

    if (!options?.preserveSelection) {
      this.selectedDocumentId = null;
    }

    this.selectedFolderId =
      this.selectedFolderId ?? this.explorerFolders[0]?.id ?? null;
  }

  private loadRecord(providerId: string, personId: string): void {
    this.provider = this.providersService.getProviderById(providerId) ?? null;
    this.person =
      this.providersService.getProviderPerson(providerId, personId) ?? null;
    this.recordDetail =
      this.providersService.getPersonRecordDetail(providerId, personId) ?? null;

    if (!this.provider || !this.person || !this.recordDetail) {
      this.reviewFields = [];
      this.reviewDocuments = [];
      this.currentExplorerFolderId = null;
      this.explorerHistory = [null];
      this.explorerHistoryIndex = 0;
      this.selectedFolderId = null;
      this.selectedDocumentId = null;
      this.previewDocumentId = null;
      this.commentModalDocumentId = null;
      return;
    }

    this.reviewFields = this.buildTemplateFields(this.provider, this.person);
    this.reviewDocuments = this.buildReviewDocuments(
      this.recordDetail.documents,
    );
    this.selectedFolderId = this.explorerFolders[0]?.id ?? null;
    this.selectedDocumentId = null;
    this.currentExplorerFolderId = null;
    this.explorerHistory = [null];
    this.explorerHistoryIndex = 0;
    this.previewDocumentId = null;
    this.commentModalDocumentId = null;
  }

  private buildTemplateFields(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): TemplateFieldRow[] {
    const baseDataFields = provider.template.baseFields
      .filter((field) => field.category === "data" && field.enabled)
      .map((field) => this.mapBaseField(field, provider, person));

    const customDataFields = provider.template.customFields
      .filter((field) => field.type !== "FILE")
      .map((field) => this.mapCustomField(field, provider, person));

    return [...baseDataFields, ...customDataFields].map((field, index) => {
      const status = this.getInitialFieldStatus(index);

      return {
        ...field,
        status,
        comment:
          status === "Observado" || status === "Rechazado"
            ? this.getDefaultFieldComment(field.label, status)
            : "",
      };
    });
  }

  private mapBaseField(
    field: ExpedienteTemplateBaseField,
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): Omit<TemplateFieldRow, "status" | "comment"> {
    return {
      id: field.id,
      label: field.label,
      fieldType: this.getBaseFieldTypeLabel(field),
      value: this.resolveBaseFieldValue(field, provider, person),
      description: field.description,
      source: "Base",
      required: field.required,
    };
  }

  private mapCustomField(
    field: ExpedienteTemplateCustomField,
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): Omit<TemplateFieldRow, "status" | "comment"> {
    return {
      id: field.id,
      label: field.label,
      fieldType: this.getCustomFieldTypeLabel(field),
      value: this.resolveCustomFieldValue(field, provider, person),
      description: field.description,
      source: "Personalizado",
      required: field.required,
    };
  }

  private resolveBaseFieldValue(
    field: ExpedienteTemplateBaseField,
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): string {
    switch (field.id) {
      case "full-name":
        return person.name;
      case "phone-number":
        return person.phone;
      case "email-address":
        return person.email;
      default:
        return this.resolveFieldValueFromLabel(field.label, provider, person);
    }
  }

  private resolveCustomFieldValue(
    field: ExpedienteTemplateCustomField,
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): string {
    if (field.type === "NUMBER") {
      return `${1000 + this.getDeterministicIndex(`${person.id}-${field.id}`, 8000)}`;
    }

    if (field.type === "SELECT" && field.options?.length) {
      return field.options[
        this.getDeterministicIndex(
          `${provider.id}-${person.id}-${field.id}`,
          field.options.length,
        )
      ];
    }

    if (field.type === "TEXTAREA") {
      return `Acceso autorizado para ${person.role.toLowerCase()} en ${provider.serviceType.toLowerCase()}. Seguimiento coordinado con el proveedor ${provider.name}.`;
    }

    return this.resolveFieldValueFromLabel(field.label, provider, person);
  }

  private resolveFieldValueFromLabel(
    label: string,
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): string {
    const normalized = label.toLowerCase();

    if (normalized.includes("correo")) {
      return person.email;
    }

    if (normalized.includes("telefono")) {
      return person.phone;
    }

    if (normalized.includes("rfc")) {
      return this.buildRelatedRfc(provider, person);
    }

    if (normalized.includes("empleado")) {
      return `${1000 + this.getDeterministicIndex(`${provider.id}-${person.id}`, 8000)}`;
    }

    if (normalized.includes("turno")) {
      return ["Matutino", "Vespertino", "Nocturno"][
        this.getDeterministicIndex(person.id, 3)
      ];
    }

    if (normalized.includes("gafete")) {
      return `${provider.id.split("-")[0].slice(0, 3).toUpperCase()}-${200 + this.getDeterministicIndex(person.id, 700)}`;
    }

    if (normalized.includes("zona")) {
      return [
        "Patio norte",
        "Acceso principal",
        "Bodega central",
        "Area administrativa",
      ][this.getDeterministicIndex(`${provider.id}-${person.id}`, 4)];
    }

    if (normalized.includes("frente")) {
      return ["Corporativo sur", "Torre norte", "Plataforma logisticas"][
        this.getDeterministicIndex(`${provider.id}-${person.id}`, 3)
      ];
    }

    if (normalized.includes("nivel de acceso")) {
      return ["General", "Cuarto electrico", "Linea critica"][
        this.getDeterministicIndex(`${provider.id}-${person.id}`, 3)
      ];
    }

    if (normalized.includes("especialidad")) {
      return person.role;
    }

    return `${person.role} / ${provider.serviceType}`;
  }

  private buildReviewDocuments(
    documents: ExpedienteRecordDocument[],
  ): ReviewDocumentItem[] {
    return documents.map((document, index) => {
      const fileAvailable = document.status !== "Faltante";
      const reviewStatus = this.getInitialDocumentStatus(document, index);

      return {
        ...document,
        reviewStatus,
        reviewComment:
          reviewStatus === "Observado" ||
          reviewStatus === "Rechazado" ||
          !fileAvailable
            ? this.getDefaultDocumentComment(document, reviewStatus)
            : "",
        fileAvailable,
        fileKind: document.extension.toUpperCase() === "JPG" ? "image" : "pdf",
      };
    });
  }

  private getInitialFieldStatus(index: number): ReviewItemStatus {
    const pattern = this.getFieldPatternByReviewState(
      this.recordDetail?.reviewState ?? "Pendiente",
    );
    return pattern[index % pattern.length];
  }

  private getInitialDocumentStatus(
    document: ExpedienteRecordDocument,
    index: number,
  ): ReviewItemStatus {
    if (document.status === "Aprobado") {
      return "Aprobado";
    }

    if (document.status === "Observado") {
      return this.recordDetail?.reviewState === "Observado" && index % 2 === 0
        ? "Rechazado"
        : "Observado";
    }

    return "Pendiente";
  }

  private getFieldPatternByReviewState(
    reviewState: ExpedienteReviewWorkflowStatus,
  ): ReviewItemStatus[] {
    switch (reviewState) {
      case "Aprobado":
        return ["Aprobado"];
      case "En revision":
        return ["Aprobado", "Pendiente", "Aprobado", "Pendiente"];
      case "Observado":
        return ["Aprobado", "Observado", "Rechazado", "Pendiente"];
      case "Rechazado":
        return ["Rechazado", "Observado", "Pendiente", "Rechazado"];
      case "Pendiente":
      default:
        return ["Pendiente", "Aprobado", "Pendiente", "Aprobado"];
    }
  }

  private getBaseFieldTypeLabel(field: ExpedienteTemplateBaseField): string {
    switch (field.inputType) {
      case "email":
        return "Correo";
      case "phone":
        return "Telefono";
      case "file":
        return "Archivo";
      case "text":
      default:
        return "Texto";
    }
  }

  private getCustomFieldTypeLabel(
    field: ExpedienteTemplateCustomField,
  ): string {
    switch (field.type) {
      case "NUMBER":
        return "Numero";
      case "TEXTAREA":
        return "Textarea";
      case "SELECT":
        return "Select";
      case "FILE":
        return "Archivo";
      case "TEXT":
      default:
        return "Texto";
    }
  }

  private getUpdatedComment(
    currentComment: string,
    status: ReviewItemStatus,
    defaultComment: string,
  ): string {
    if (status === "Aprobado") {
      return "";
    }

    if ((status === "Observado" || status === "Rechazado") && !currentComment) {
      return defaultComment;
    }

    return currentComment;
  }

  private getDefaultFieldComment(
    label: string,
    status: ReviewItemStatus,
  ): string {
    const normalized = label.toLowerCase();

    if (normalized.includes("correo")) {
      return status === "Rechazado"
        ? "Se rechaza el correo porque no coincide con el dominio operativo esperado."
        : "Validar formato y dominio del correo capturado.";
    }

    if (normalized.includes("rfc")) {
      return status === "Rechazado"
        ? "El RFC capturado no coincide con la constancia fiscal del expediente."
        : "Corregir RFC para que coincida con la constancia fiscal.";
    }

    if (normalized.includes("turno")) {
      return status === "Rechazado"
        ? "El turno asignado no coincide con la plantilla operativa vigente."
        : "Confirmar que el turno asignado coincida con la operacion actual.";
    }

    return status === "Rechazado"
      ? `Se rechazo ${label.toLowerCase()} por inconsistencia con la captura esperada.`
      : `Revisar ${label.toLowerCase()} antes de liberar el expediente.`;
  }

  private getDefaultDocumentComment(
    document: ReviewDocumentItem | ExpedienteRecordDocument,
    status: ReviewItemStatus,
  ): string {
    if (status === "Rechazado") {
      return `${document.name} fue rechazado por inconsistencias de vigencia, legibilidad o soporte documental.`;
    }

    if (status === "Observado") {
      return `${document.name} requiere ajuste antes de cerrarse la revision documental.`;
    }

    if ("status" in document && document.status === "Faltante") {
      return `${document.name} aun no cuenta con archivo disponible para revision.`;
    }

    return `${document.name} en espera de validacion documental por el administrador.`;
  }

  private buildRelatedRfc(
    provider: ExpedienteProviderDetail,
    person: ExpedienteProviderPerson,
  ): string {
    const initials = person.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.slice(0, 2).toUpperCase())
      .join("");

    return `${initials}${provider.fiscalData.postalCode}${provider.fiscalData.rfc.slice(-3)}`;
  }

  private getDeterministicIndex(seed: string, length: number): number {
    if (length <= 0) {
      return 0;
    }

    let hash = 0;

    for (const character of seed) {
      hash = (hash << 5) - hash + character.charCodeAt(0);
      hash |= 0;
    }

    return Math.abs(hash) % length;
  }

  private offsetIso(baseDate: string, offsetHours: number): string {
    const shifted = new Date(baseDate);
    shifted.setHours(shifted.getHours() + offsetHours);
    return shifted.toISOString();
  }
}

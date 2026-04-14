import { CommonModule } from "@angular/common";
import { Component, OnDestroy } from "@angular/core";
import {
  BadgeAlert,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleUserRound,
  Download,
  Eye,
  FileBadge,
  FileText,
  History,
  LucideAngularModule,
  Mail,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Signature,
} from "lucide-angular";
import { ContractDetailDrawerComponent } from "./contract-detail-drawer/contract-detail-drawer.component";
import { ContractSignDrawerComponent } from "./contract-sign-drawer/contract-sign-drawer.component";
import { getFirmaContratoMock } from "./firma-contrato.mock";
import {
  ContractData,
  ContractSignaturePayload,
  ContractStatus,
  ContractTimelineItem,
  ContractVersion,
  getContractStatusClasses,
} from "./firma-contrato.models";

type BannerTone = "success" | "info";

@Component({
  selector: "app-firma-contrato",
  imports: [
    CommonModule,
    LucideAngularModule,
    ContractDetailDrawerComponent,
    ContractSignDrawerComponent,
  ],
  templateUrl: "./firma-contrato.component.html",
})
export class FirmaContratoComponent implements OnDestroy {
  readonly FileBadge = FileBadge;
  readonly Signature = Signature;
  readonly Download = Download;
  readonly Eye = Eye;
  readonly ShieldCheck = ShieldCheck;
  readonly CalendarClock = CalendarClock;
  readonly RefreshCw = RefreshCw;
  readonly Building2 = Building2;
  readonly BadgeCheck = BadgeCheck;
  readonly BadgeAlert = BadgeAlert;
  readonly FileText = FileText;
  readonly History = History;
  readonly ScrollText = ScrollText;
  readonly CircleUserRound = CircleUserRound;
  readonly Mail = Mail;

  contract: ContractData;
  versions: ContractVersion[];

  isDetailDrawerOpen = false;
  isSignDrawerOpen = false;
  banner: { tone: BannerTone; message: string } | null = null;

  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const mock = getFirmaContratoMock();
    this.contract = mock.contract;
    this.versions = mock.versions;
  }

  ngOnDestroy(): void {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  }

  get deadlineLabel(): string {
    return this.contract.status === "Firmado"
      ? "Fecha de firma"
      : "Fecha limite de firma";
  }

  get contractTimeline(): ContractTimelineItem[] {
    const status = this.contract.status;

    return [
      {
        title: "Contrato emitido",
        description: `Version ${this.contract.version} liberada para consulta interna.`,
        state: "done",
      },
      {
        title: "Contrato enviado",
        description: "Disponible para revision, descarga y validacion contractual.",
        state: "done",
      },
      {
        title: this.getFinalStepTitle(status),
        description: this.getFinalStepDescription(status),
        state: this.getFinalStepState(status),
      },
    ];
  }

  get nextSteps(): string[] {
    if (this.contract.status === "Firmado") {
      return [
        "Descargar el archivo dummy firmado para evidencia local.",
        "Validar que el firmante principal y correo queden actualizados.",
        "Dar seguimiento a la siguiente renovacion contractual.",
      ];
    }

    return [
      "Revisar el detalle del contrato y validar la version vigente.",
      "Descargar el archivo dummy para compartirlo con el area legal si aplica.",
      "Completar la firma digital dummy antes de la fecha limite.",
    ];
  }

  getStatusClasses(status: ContractStatus): string {
    return getContractStatusClasses(status);
  }

  openDetailDrawer(): void {
    this.isDetailDrawerOpen = true;
  }

  closeDetailDrawer(): void {
    this.isDetailDrawerOpen = false;
  }

  openSignDrawer(): void {
    if (this.contract.status === "Firmado") {
      return;
    }

    this.isSignDrawerOpen = true;
  }

  closeSignDrawer(): void {
    this.isSignDrawerOpen = false;
  }

  downloadContract(): void {
    const content = [
      "Contrato de servicio - Documento dummy",
      `Contrato: ${this.contract.name}`,
      `Cliente: ${this.contract.companyName}`,
      `Version: ${this.contract.version}`,
      `Estatus: ${this.contract.status}`,
      `Fecha emision: ${this.contract.issuedAt}`,
      `Fecha limite/firma: ${this.contract.status === "Firmado" ? this.contract.signedAt : this.contract.signingDueAt}`,
      `Firmante principal: ${this.contract.primarySigner.name} - ${this.contract.primarySigner.role}`,
      `Correo del firmante: ${this.contract.primarySigner.email}`,
      "",
      "Alcance del servicio:",
      ...this.contract.serviceScope.map((item) => `- ${item}`),
      "",
      `Observaciones: ${this.contract.observations}`,
    ].join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = this.contract.fileName.replace(".pdf", ".txt");
    anchor.click();
    window.URL.revokeObjectURL(url);

    this.showBanner("info", "Se descargo el contrato dummy para uso local.");
  }

  signContract(payload: ContractSignaturePayload): void {
    const now = new Date().toISOString();

    this.contract = {
      ...this.contract,
      status: "Firmado",
      signedAt: now,
      lastUpdatedAt: now,
      primarySigner: {
        name: payload.name,
        role: payload.role,
        email: payload.email,
      },
    };

    this.versions = this.versions.map((item) =>
      item.isCurrent
        ? {
            ...item,
            status: "Firmado",
            signedAt: now,
            observation: `Firmado digitalmente de forma dummy por ${payload.name}.`,
          }
        : item,
    );

    this.isSignDrawerOpen = false;
    this.showBanner(
      "success",
      "Contrato firmado digitalmente de forma dummy. El estatus visual ya fue actualizado.",
    );
  }

  private showBanner(tone: BannerTone, message: string): void {
    this.banner = { tone, message };

    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
    }

    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 5000);
  }

  private getFinalStepTitle(status: ContractStatus): string {
    switch (status) {
      case "Firmado":
        return "Contrato firmado";
      case "Rechazado":
        return "Contrato rechazado";
      case "Vencido":
        return "Firma vencida";
      case "Enviado":
        return "En espera de firma";
      case "Pendiente":
      default:
        return "Firma pendiente";
    }
  }

  private getFinalStepDescription(status: ContractStatus): string {
    switch (status) {
      case "Firmado":
        return "La firma dummy fue registrada y el contrato ya se considera vigente.";
      case "Rechazado":
        return "La version actual requiere ajustes antes de una nueva emision.";
      case "Vencido":
        return "La ventana de firma expiro y debe renovarse la emision.";
      case "Enviado":
        return "El documento fue enviado y esta listo para que el firmante lo acepte.";
      case "Pendiente":
      default:
        return "El firmante principal aun debe aceptar y firmar la version vigente.";
    }
  }

  private getFinalStepState(status: ContractStatus): ContractTimelineItem["state"] {
    if (status === "Firmado") {
      return "done";
    }

    if (status === "Rechazado" || status === "Vencido") {
      return "warning";
    }

    return "current";
  }
}

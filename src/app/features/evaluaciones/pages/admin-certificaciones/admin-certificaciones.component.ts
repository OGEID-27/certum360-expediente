import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  Award,
  Eye,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  Trash2,
  ShieldCheck,
  FlaskConical,
} from "lucide-angular";
import { ModalService } from "../../../../shared/services/modal.service";
import { ToastService } from "../../../../shared/services/toast.service";
import { Certification } from "../../models";
import { LocalStorageEvaluacionesRepository } from "../../services/local-storage-evaluaciones.repository";
import { WeightsStorageService } from "../../services/weights-storage.service";
import { WeightsValidator } from "../../services/weights-validator";

type CertificationStatus = "BORRADOR" | "LISTO" | "INFORMATIVA";

@Component({
  selector: "app-admin-certificaciones",
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: "./admin-certificaciones.component.html",
})
export class AdminCertificacionesComponent {
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  readonly Award = Award;
  readonly FlaskConical = FlaskConical;
  readonly ShieldCheck = ShieldCheck;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Eye = Eye;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;

  certifications: Certification[] = [];
  searchTerm = "";

  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  constructor(
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly weightsStorage: WeightsStorageService,
  ) {
    this.refreshData();
  }

  get processedCertifications(): Certification[] {
    let result = [...this.certifications];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((certification) => {
        const inName = certification.nombre.toLowerCase().includes(term);
        const inDescription =
          certification.descripcion?.toLowerCase().includes(term) ?? false;
        return inName || inDescription;
      });
    }

    return result.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
  }

  get paginatedCertifications(): Certification[] {
    const source = this.processedCertifications;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return source.slice(start, end);
  }

  get totalItems(): number {
    return this.processedCertifications.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get currentPage(): number {
    return Math.min(this.page, this.totalPages);
  }

  get pageStartItem(): number {
    if (this.totalItems === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  onSearchChange(): void {
    this.page = 1;
  }

  showCreateForm(): void {
    this.router.navigate(["/evaluaciones/admin/certificaciones/nueva"]);
  }

  editCertification(certification: Certification): void {
    this.router.navigate([
      "/evaluaciones/admin/certificaciones",
      certification.id,
      "editar",
    ]);
  }

  openPreview(certification: Certification): void {
    this.router.navigate([
      "/evaluaciones/admin/certificaciones",
      certification.id,
      "preview",
    ]);
  }

  async deleteCertification(certificationId: string): Promise<void> {
    const confirmed = await this.modalService.openConfirm({
      type: "delete",
      title: "Eliminar certificacion",
      message:
        "Esta accion eliminara la certificacion y su configuracion de pesos local.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    this.repository.deleteCertification(certificationId);
    this.weightsStorage.deleteCertificationWeight(certificationId);
    this.refreshData();

    this.toastService.show({
      type: "success",
      message: "Certificacion eliminada",
      durationMs: 3000,
    });
  }

  getQuestionnaireCount(certification: Certification): number {
    return certification.questionnaireIds.length;
  }

  getPassScore(certification: Certification): number {
    const weightEntry = this.weightsStorage.getCertificationWeight(
      certification.id,
    );
    if (weightEntry) {
      return weightEntry.passScore;
    }

    return certification.rules.minScore ?? 80;
  }

  getAssignedTotal(certificationId: string): number {
    const entry = this.weightsStorage.getCertificationWeight(certificationId);
    if (!entry?.isScored) {
      return 0;
    }

    return WeightsValidator.sumWeights(entry.questionnaires);
  }

  getStatus(certificationId: string): CertificationStatus {
    const entry = this.weightsStorage.getCertificationWeight(certificationId);

    if (entry && !entry.isScored) {
      return "INFORMATIVA";
    }

    if (
      entry &&
      WeightsValidator.hasExactTotal(this.getAssignedTotal(certificationId))
    ) {
      return "LISTO";
    }

    return "BORRADOR";
  }

  getStatusLabel(certificationId: string): string {
    const status = this.getStatus(certificationId);
    if (status === "LISTO") {
      return "Listo";
    }

    if (status === "INFORMATIVA") {
      return "Informativa";
    }

    return "Borrador";
  }

  getStatusClass(certificationId: string): string {
    const status = this.getStatus(certificationId);
    if (status === "LISTO") {
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    }

    if (status === "INFORMATIVA") {
      return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300";
    }

    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  goToPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.page = this.currentPage - 1;
  }

  goToNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.page = this.currentPage + 1;
  }

  onPageSizeChange(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize = parsed;
    this.page = 1;
  }

  private refreshData(): void {
    this.certifications = this.repository.getCertifications();
  }
}

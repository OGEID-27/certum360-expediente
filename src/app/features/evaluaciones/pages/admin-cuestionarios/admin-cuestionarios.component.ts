import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  File,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  Trash2,
  NotebookPen,
} from "lucide-angular";
import { ModalService } from "../../../../shared/services/modal.service";
import { ToastService } from "../../../../shared/services/toast.service";
import { Questionnaire } from "../../models";
import { LocalStorageEvaluacionesRepository } from "../../services/local-storage-evaluaciones.repository";
import { WeightsStorageService } from "../../services/weights-storage.service";
import { WeightsValidator } from "../../services/weights-validator";

type QuestionnaireStatus = "BORRADOR" | "LISTO" | "INFORMATIVA";

@Component({
  selector: "app-admin-cuestionarios",
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: "./admin-cuestionarios.component.html",
})
export class AdminCuestionariosComponent {
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  readonly File = File;
  readonly NotebookPen = NotebookPen;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;

  questionnaires: Questionnaire[] = [];
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

  get processedQuestionnaires(): Questionnaire[] {
    let result = [...this.questionnaires];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((questionnaire) => {
        const inName = questionnaire.nombre.toLowerCase().includes(term);
        const inDescription =
          questionnaire.descripcion?.toLowerCase().includes(term) ?? false;
        return inName || inDescription;
      });
    }

    return result.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
  }

  get paginatedQuestionnaires(): Questionnaire[] {
    const source = this.processedQuestionnaires;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return source.slice(start, end);
  }

  get totalItems(): number {
    return this.processedQuestionnaires.length;
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
    this.router.navigate(["/evaluaciones/admin/cuestionarios/nuevo"]);
  }

  editQuestionnaire(questionnaire: Questionnaire): void {
    this.router.navigate([
      "/evaluaciones/admin/cuestionarios",
      questionnaire.id,
      "editar",
    ]);
  }

  async deleteQuestionnaire(questionnaireId: string): Promise<void> {
    const confirmed = await this.modalService.openConfirm({
      type: "delete",
      title: "Eliminar cuestionario",
      message:
        "Esta accion eliminara el cuestionario y su configuracion de pesos local.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    this.repository.deleteQuestionnaire(questionnaireId);
    this.weightsStorage.deleteQuestionnaireWeight(questionnaireId);
    this.refreshData();

    this.toastService.show({
      type: "success",
      message: "Cuestionario eliminado",
      durationMs: 3000,
    });
  }

  getSectionCount(questionnaire: Questionnaire): number {
    return questionnaire.sectionIds.length;
  }

  getTimeLimitLabel(questionnaire: Questionnaire): string {
    if (!questionnaire.settings.timeLimitMinutes) {
      return "-";
    }

    return `${questionnaire.settings.timeLimitMinutes} min`;
  }

  getAssignedTotal(questionnaireId: string): number {
    const entry = this.weightsStorage.getQuestionnaireWeight(questionnaireId);
    if (!entry?.isScored) {
      return 0;
    }

    return WeightsValidator.sumWeights(entry.sections);
  }

  getStatus(questionnaireId: string): QuestionnaireStatus {
    const entry = this.weightsStorage.getQuestionnaireWeight(questionnaireId);

    if (entry && !entry.isScored) {
      return "INFORMATIVA";
    }

    if (
      entry &&
      WeightsValidator.hasExactTotal(this.getAssignedTotal(questionnaireId))
    ) {
      return "LISTO";
    }

    return "BORRADOR";
  }

  getStatusLabel(questionnaireId: string): string {
    const status = this.getStatus(questionnaireId);
    if (status === "LISTO") {
      return "Listo";
    }

    if (status === "INFORMATIVA") {
      return "Informativo";
    }

    return "Borrador";
  }

  getStatusClass(questionnaireId: string): string {
    const status = this.getStatus(questionnaireId);
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
    this.questionnaires = this.repository.getQuestionnaires();
  }
}

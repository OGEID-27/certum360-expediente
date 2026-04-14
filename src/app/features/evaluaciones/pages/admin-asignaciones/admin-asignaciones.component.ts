import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import {
  Check,
  List,
  LucideAngularModule,
  NotebookPen,
  Rocket,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-angular";
import {
  Cliente,
  UsuarioCliente,
} from "../../../../pages/alta-clientes/alta-clientes.models";
import { ClientsStoreService } from "../../../../pages/alta-clientes/clients-store.service";
import { ModalService } from "../../../../shared/services/modal.service";
import { ToastService } from "../../../../shared/services/toast.service";
import {
  AssignmentsStorageService,
  EvaluationAssignment,
} from "../../services/assignments-storage.service";
import {
  AdminAsignacionesUsersDrawerComponent,
  AssignmentDrawerQuestionnaire,
  AssignmentDrawerUser,
} from "../admin-asignaciones-users-drawer/admin-asignaciones-users-drawer.component";

@Component({
  selector: "app-admin-asignaciones",
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    AdminAsignacionesUsersDrawerComponent,
  ],
  templateUrl: "./admin-asignaciones.component.html",
})
export class AdminAsignacionesComponent {
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly NotebookPen = NotebookPen;
  readonly Rocket = Rocket;
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Users = Users;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly Check = Check;
  readonly X = X;
  readonly List = List;

  assignments: EvaluationAssignment[] = [];
  clientsById = new Map<string, Cliente>();
  searchTerm = "";

  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  editingPriceAssignmentId: string | null = null;
  isUsersDrawerOpen = false;
  drawerAssignment: EvaluationAssignment | null = null;
  drawerUsers: AssignmentDrawerUser[] = [];

  inlinePriceForm = this.fb.group({
    currency: ["MXN" as "MXN" | "USD", Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  constructor(
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly clientsStore: ClientsStoreService,
  ) {
    this.refreshData();
  }

  get processedAssignments(): EvaluationAssignment[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.assignments;
    }

    return this.assignments.filter((assignment) => {
      const status = assignment.paymentStatus.toLowerCase();
      const fields = [
        assignment.clientName,
        assignment.certificationName,
        assignment.currency,
        assignment.paymentStatus,
        status,
      ];

      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }

  get paginatedAssignments(): EvaluationAssignment[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.processedAssignments.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.processedAssignments.length;
  }

  get totalAssignments(): number {
    return this.assignments.length;
  }

  get filteredAssignmentsCount(): number {
    return this.processedAssignments.length;
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
    this.router.navigate(["/evaluaciones/asignaciones/nueva"]);
  }

  editAssignment(assignment: EvaluationAssignment): void {
    this.router.navigate([
      "/evaluaciones/asignaciones",
      assignment.id,
      "editar",
    ]);
  }

  openUsersDrawer(assignment: EvaluationAssignment): void {
    this.drawerAssignment = assignment;
    this.drawerUsers = this.buildDrawerUsers(assignment);
    this.isUsersDrawerOpen = true;
  }

  closeUsersDrawer(): void {
    this.isUsersDrawerOpen = false;
  }

  canDelete(assignment: EvaluationAssignment): boolean {
    return assignment.paymentStatus !== "PAID";
  }

  canEditInlinePrice(assignment: EvaluationAssignment): boolean {
    return assignment.paymentStatus !== "PAID";
  }

  startInlinePriceEdit(assignment: EvaluationAssignment): void {
    if (!this.canEditInlinePrice(assignment)) {
      this.toastService.show({
        type: "info",
        message: "No se puede editar el monto inline de una asignacion pagada.",
        durationMs: 2800,
      });
      return;
    }

    this.editingPriceAssignmentId = assignment.id;
    this.inlinePriceForm.reset({
      currency: assignment.currency,
      price: assignment.price,
    });
  }

  cancelInlinePriceEdit(): void {
    this.editingPriceAssignmentId = null;
    this.inlinePriceForm.reset({
      currency: "MXN",
      price: null,
    });
  }

  saveInlinePrice(assignment: EvaluationAssignment): void {
    if (this.inlinePriceForm.invalid) {
      this.inlinePriceForm.markAllAsTouched();
      return;
    }

    this.assignmentsStorage.update(assignment.id, {
      currency:
        this.inlinePriceForm.get("currency")?.value ?? assignment.currency,
      price: this.inlinePriceForm.get("price")?.value ?? assignment.price,
    });

    this.refreshData();
    this.cancelInlinePriceEdit();
    this.toastService.show({
      type: "success",
      message: "Monto actualizado",
      durationMs: 2200,
    });
  }

  async deleteAssignment(assignment: EvaluationAssignment): Promise<void> {
    if (!this.canDelete(assignment)) {
      return;
    }

    const confirmed = await this.modalService.openConfirm({
      type: "delete",
      title: "Eliminar asignacion",
      message: "Esta orden se eliminara del almacenamiento local.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    this.assignmentsStorage.delete(assignment.id);
    this.refreshData();
    this.toastService.show({
      type: "success",
      message: "Asignacion eliminada",
      durationMs: 2200,
    });
  }

  getPaymentStatusLabel(status: EvaluationAssignment["paymentStatus"]): string {
    if (status === "WAITING") {
      return "En validacion";
    }

    if (status === "PAID") {
      return "Pagado";
    }

    if (status === "CANCELED") {
      return "Cancelado";
    }

    return "Pendiente";
  }

  getPaymentStatusClass(status: EvaluationAssignment["paymentStatus"]): string {
    if (status === "WAITING") {
      return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    }

    if (status === "PAID") {
      return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
    }

    if (status === "CANCELED") {
      return "border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300";
    }

    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  formatPrice(assignment: EvaluationAssignment): string {
    const formatted = new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(assignment.price);

    return `${assignment.currency} $${formatted}`;
  }

  getClientImageUrl(assignment: EvaluationAssignment): string | null {
    const imageUrl = this.clientsById
      .get(assignment.clientId)
      ?.photoUrl?.trim();
    return imageUrl ? imageUrl : null;
  }

  getClientInitials(name: string): string {
    const clean = name.trim();
    if (!clean) {
      return "CL";
    }

    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
    const clients = this.clientsStore.listClients();
    this.clientsById = new Map(
      clients.map((client) => [String(client.id), client]),
    );
    this.assignments = this.assignmentsStorage.list();
    this.page = Math.min(this.page, this.totalPages);
  }

  private buildDrawerUsers(
    assignment: EvaluationAssignment,
  ): AssignmentDrawerUser[] {
    const users = this.clientsStore.listUsersByClient(
      Number(assignment.clientId),
    );
    const usersMap = new Map(users.map((user) => [String(user.id), user]));
    const assignedUsersById = new Map<string, EvaluationAssignment["users"]>();

    assignment.users.forEach((assignedUser) => {
      const current = assignedUsersById.get(assignedUser.userId) ?? [];
      current.push(assignedUser);
      assignedUsersById.set(assignedUser.userId, current);
    });

    return Array.from(assignedUsersById.entries()).map(([userId, entries]) => {
      const user = usersMap.get(userId);
      return this.mapDrawerUser(entries, user);
    });
  }

  private mapDrawerUser(
    assignedEntries: EvaluationAssignment["users"],
    user?: UsuarioCliente,
  ): AssignmentDrawerUser {
    const primaryEntry = assignedEntries[0];
    const questionnaires = assignedEntries.map<AssignmentDrawerQuestionnaire>(
      (assignedUser) => ({
        id:
          assignedUser.questionnaireId ||
          `${assignedUser.userId}_${assignedUser.questionnaireName}`,
        name: assignedUser.questionnaireName,
        area: assignedUser.questionnaireArea,
      }),
    );

    if (!user) {
      return {
        id: primaryEntry.userId,
        fullName: primaryEntry.userName || `Usuario #${primaryEntry.userId}`,
        userArea: primaryEntry.userArea,
        secondaryText: "No disponible en el cliente actualmente",
        missing: true,
        questionnaires,
      };
    }

    const fullName = `${user.nombres} ${user.apellidos}`.trim();
    return {
      id: primaryEntry.userId,
      fullName: fullName || primaryEntry.userName || `Usuario #${user.id}`,
      userArea: user.area || primaryEntry.userArea,
      email: user.email || undefined,
      secondaryText: user.telefono || `ID interno ${user.id}`,
      missing: false,
      statusLabel: user.estatus,
      questionnaires,
    };
  }
}

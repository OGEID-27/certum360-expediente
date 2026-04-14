import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  Building2,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Users,
  BookUser,
} from "lucide-angular";
import { PageBreadcrumbComponent } from "../../shared/components/common/page-breadcrumb/page-breadcrumb.component";
import { ClientUsersDrawerComponent } from "./client-users-drawer/client-users-drawer.component";
import {
  CLIENTE_TIPO_LABELS,
  Cliente,
  isFiscalCompleto,
} from "./alta-clientes.models";
import { ClientsStoreService } from "./clients-store.service";

@Component({
  selector: "app-alta-clientes",
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ClientUsersDrawerComponent,
  ],
  templateUrl: "./alta-clientes.component.html",
})
export class AltaClientesComponent {
  private readonly router = inject(Router);
  private readonly clientsStore = inject(ClientsStoreService);

  readonly Building2 = Building2;
  readonly BookUser = BookUser;
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Pencil = Pencil;
  readonly Users = Users;
  readonly ShieldCheck = ShieldCheck;

  searchTerm = "";
  clients: Cliente[] = [];
  userCounts: Record<number, number> = {};
  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  isUsersDrawerOpen = false;
  selectedClientId: number | null = null;
  selectedClientName = "";

  constructor() {
    this.reloadData();
  }

  get filteredClients(): Cliente[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.clients;
    }

    return this.clients.filter((client) => {
      const fields = [
        client.nombreCliente,
        client.rfc,
        client.contactoNombre,
        client.correoPrincipal,
      ];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }

  get totalClients(): number {
    return this.filteredClients.length;
  }

  get paginatedClients(): Cliente[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredClients.slice(start, end);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalClients / this.pageSize));
  }

  get currentPage(): number {
    return Math.min(this.page, this.totalPages);
  }

  get pageStartItem(): number {
    if (this.totalClients === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalClients);
  }

  onSearchChange(): void {
    this.page = 1;
  }

  onPageSizeChange(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize = parsed;
    this.page = 1;
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

  showCreateForm(): void {
    this.router.navigate(["/alta-clientes/nuevo"]);
  }

  editClient(client: Cliente): void {
    this.router.navigate(["/alta-clientes/editar", client.id]);
  }

  openClientEvaluations(client: Cliente): void {
    this.router.navigate(['/alta-clientes', client.id, 'evaluaciones']);
  }

  openUsersDrawer(client: Cliente): void {
    this.selectedClientId = client.id;
    this.selectedClientName = client.nombreCliente;
    this.isUsersDrawerOpen = true;
  }

  closeUsersDrawer(): void {
    this.isUsersDrawerOpen = false;
  }

  getClientImageUrl(client: Cliente): string | null {
    const imageUrl = client.photoUrl?.trim();
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

  onUsersChanged(): void {
    this.userCounts = this.clientsStore.getUserCountsMap();
  }

  getTipoLabel(tipo: Cliente["tipoCliente"]): string {
    return CLIENTE_TIPO_LABELS[tipo];
  }

  getUsersCount(clientId: number): number {
    return this.userCounts[clientId] ?? 0;
  }

  getStatusClass(status: Cliente["estatus"]): string {
    switch (status) {
      case "Activo":
        return "border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300";
      case "Prospecto":
        return "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300";
      case "Pendiente":
        return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300";
      default:
        return "border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300";
    }
  }

  isFiscalIncomplete(client: Cliente): boolean {
    return !isFiscalCompleto(client);
  }

  private reloadData(): void {
    this.clients = this.clientsStore.listClients();
    this.userCounts = this.clientsStore.getUserCountsMap();
  }
}

import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  Check,
  GripVertical,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-angular';
import {
  Cliente,
  UsuarioCliente,
} from '../../../../pages/alta-clientes/alta-clientes.models';
import { ClientsStoreService } from '../../../../pages/alta-clientes/clients-store.service';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { Certification, Questionnaire } from '../../models';
import {
  AssignmentsStorageService,
  EvaluationAssignment,
  EvaluationAssignmentUser,
} from '../../services/assignments-storage.service';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';

type AssignmentQuestionnaireOption = {
  id: string;
  nombre: string;
  area: string;
  passScore: number | null;
};

type AssignmentUserRow = {
  userId: string;
  fullName: string;
  email: string;
  status: UsuarioCliente['estatus'];
  phone: string;
  area: string;
  questionnaireIds: string[];
};

@Component({
  selector: 'app-admin-asignaciones-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragDropModule,
    ComponentCardComponent,
  ],
  templateUrl: './admin-asignaciones-form.component.html',
  styles: [
    `
      :host ::ng-deep .admin-drop-zone {
        transition:
          border-color 220ms ease,
          background-color 220ms ease,
          box-shadow 220ms ease;
      }

      :host ::ng-deep .admin-drop-zone.cdk-drop-list-receiving,
      :host ::ng-deep .admin-drop-zone.cdk-drop-list-dragging {
        border-color: rgba(59, 130, 246, 0.45);
        background-color: rgba(59, 130, 246, 0.07);
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
      }

      :host ::ng-deep .admin-dnd-item {
        transition:
          transform 220ms ease,
          border-color 220ms ease,
          box-shadow 220ms ease,
          background-color 220ms ease;
      }

      :host ::ng-deep .admin-dnd-item.cdk-drag-preview {
        border-color: rgba(59, 130, 246, 0.45);
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
        backdrop-filter: blur(6px);
      }

      :host-context(.dark) ::ng-deep .admin-dnd-item.cdk-drag-preview {
        background: rgba(17, 24, 39, 0.92);
        border-color: rgba(96, 165, 250, 0.55);
        box-shadow: 0 16px 36px rgba(2, 6, 23, 0.62);
      }

      :host ::ng-deep .admin-dnd-item.cdk-drag-animating {
        transition: transform 240ms cubic-bezier(0.2, 0, 0, 1);
      }

      :host ::ng-deep .admin-dnd-placeholder {
        min-height: 86px;
        border: 1px dashed rgba(148, 163, 184, 0.9);
        background: rgba(148, 163, 184, 0.16);
        border-radius: 0.75rem;
      }

      :host-context(.dark) ::ng-deep .admin-dnd-placeholder {
        border-color: rgba(100, 116, 139, 0.9);
        background: rgba(30, 41, 59, 0.5);
      }
    `,
  ],
})
export class AdminAsignacionesFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly BadgeDollarSign = BadgeDollarSign;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Search = Search;
  readonly Building2 = Building2;
  readonly ShieldCheck = ShieldCheck;
  readonly Users = Users;
  readonly GripVertical = GripVertical;
  readonly Trash2 = Trash2;
  readonly Check = Check;
  readonly X = X;

  readonly assignedDropListId = 'assignment-users-assigned-drop-list';
  readonly availableDropListId = 'assignment-users-available-drop-list';
  readonly paymentStatusOptions = [
    'PENDING',
    'WAITING',
    'PAID',
    'CANCELED',
  ] as const;

  editingAssignmentId: string | null = null;
  clients: Cliente[] = [];
  certifications: Certification[] = [];
  selectedClient: Cliente | null = null;
  selectedCertification: Certification | null = null;
  certificationQuestionnaires: AssignmentQuestionnaireOption[] = [];
  assignedRows: AssignmentUserRow[] = [];
  availableRows: AssignmentUserRow[] = [];
  clientSearchTerm = '';
  certificationSearchTerm = '';
  availableUsersSearchTerm = '';
  justAddedUserId: string | null = null;

  assignmentForm = this.fb.group({
    clientId: ['', Validators.required],
    certificationId: ['', Validators.required],
    assignedUserIds: this.fb.control<string[]>([], {
      validators: [this.requireArraySelection],
      nonNullable: true,
    }),
    currency: ['MXN' as 'MXN' | 'USD', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentStatus: [
      'PENDING' as 'PENDING' | 'WAITING' | 'PAID' | 'CANCELED',
      Validators.required,
    ],
  });

  constructor(
    private readonly assignmentsStorage: AssignmentsStorageService,
    private readonly clientsStore: ClientsStoreService,
    private readonly repository: LocalStorageEvaluacionesRepository,
  ) {
    this.loadSources();
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.editingAssignmentId ? 'Editar asignacion' : 'Nueva asignacion';
  }

  get filteredClients(): Cliente[] {
    const term = this.clientSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.clients;
    }

    return this.clients.filter((client) => {
      const inName = client.nombreCliente.toLowerCase().includes(term);
      const inSector = client.sector.toLowerCase().includes(term);
      const inEmail = client.correoPrincipal.toLowerCase().includes(term);
      return inName || inSector || inEmail;
    });
  }

  get filteredCertifications(): Certification[] {
    const term = this.certificationSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.certifications;
    }

    return this.certifications.filter((certification) => {
      const inName = certification.nombre.toLowerCase().includes(term);
      const inDescription =
        certification.descripcion?.toLowerCase().includes(term) ?? false;
      return inName || inDescription;
    });
  }

  get filteredAvailableRows(): AssignmentUserRow[] {
    const term = this.availableUsersSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.availableRows;
    }

    return this.availableRows.filter((row) => {
      const haystack = `${row.fullName} ${row.email} ${row.area}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  get selectedClientUserCount(): number {
    return this.assignedRows.length + this.availableRows.length;
  }

  get assignedCompletedCount(): number {
    return this.assignedRows.filter((row) => this.hasAssignedQuestionnaire(row)).length;
  }

  get hasIncompleteAssignments(): boolean {
    return this.assignedRows.length > 0 && this.assignedCompletedCount !== this.assignedRows.length;
  }

  get canAutoAssign(): boolean {
    return this.assignedRows.length > 0 && this.certificationQuestionnaires.length > 0;
  }

  get selectedUsersCount(): number {
    return this.assignedRows.length;
  }

  get availableUsersCount(): number {
    return this.availableRows.length;
  }

  get selectedQuestionnaireCount(): number {
    return this.assignedRows.reduce(
      (total, row) => total + this.getSelectedQuestionnairesForRow(row).length,
      0,
    );
  }

  get selectedQuestionnaireSummary(): AssignmentQuestionnaireOption[] {
    const selectedIds = new Set(
      this.assignedRows.flatMap((row) => row.questionnaireIds),
    );

    return this.certificationQuestionnaires.filter((questionnaire) =>
      selectedIds.has(questionnaire.id),
    );
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  selectClient(
    client: Cliente,
    options?: { preserveUsers?: EvaluationAssignmentUser[]; fromLoad?: boolean },
  ): void {
    this.selectedClient = client;
    this.assignmentForm.patchValue({
      clientId: String(client.id),
    });
    this.assignmentForm.get('clientId')?.markAsDirty();
    this.assignmentForm.get('clientId')?.markAsTouched();
    this.rebuildUserRows(client.id, options?.preserveUsers ?? []);

    if (!options?.fromLoad) {
      this.toastService.show({
        type: 'info',
        message: 'Se cargaron los usuarios del cliente seleccionado.',
        durationMs: 2200,
      });
    }
  }

  selectCertification(certification: Certification, fromLoad = false): void {
    this.selectedCertification = certification;
    this.assignmentForm.patchValue({ certificationId: certification.id });
    this.assignmentForm.get('certificationId')?.markAsDirty();
    this.assignmentForm.get('certificationId')?.markAsTouched();
    this.certificationQuestionnaires = this.buildCertificationQuestionnaires(certification);
    this.dropUnavailableQuestionnaires();

    if (!fromLoad) {
      this.assignmentForm.get('certificationId')?.updateValueAndValidity();
    }
  }

  addUserFromAvailable(row: AssignmentUserRow): void {
    this.addUserById(row.userId);
  }

  removeAssignedUser(row: AssignmentUserRow): void {
    const index = this.assignedRows.findIndex(
      (item) => item.userId === row.userId,
    );
    if (index < 0) {
      return;
    }

    const removed = this.assignedRows.splice(index, 1)[0];
    removed.questionnaireIds = [];
    this.availableRows.push(removed);
    this.sortAvailableRows();
    this.syncAssignedUserIdsControl();
  }

  dropAssignedUsers(event: CdkDragDrop<AssignmentUserRow[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        this.assignedRows,
        event.previousIndex,
        event.currentIndex,
      );
      this.syncAssignedUserIdsControl();
      return;
    }

    const dragged = event.item.data as AssignmentUserRow | undefined;
    if (!dragged) {
      return;
    }

    this.addUserById(dragged.userId, event.currentIndex);
  }

  dropAvailableUsers(event: CdkDragDrop<AssignmentUserRow[]>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const dragged = event.item.data as AssignmentUserRow | undefined;
    if (!dragged) {
      return;
    }

    this.removeAssignedUser(dragged);
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.assignmentForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  hasControlError(controlName: string, errorKey: string): boolean {
    const control = this.assignmentForm.get(controlName);
    return !!control && !!control.errors?.[errorKey] && control.touched;
  }

  getPaymentStatusLabel(
    status: 'PENDING' | 'WAITING' | 'PAID' | 'CANCELED',
  ): string {
    if (status === 'WAITING') {
      return 'En validacion';
    }

    if (status === 'PAID') {
      return 'Pagado';
    }

    if (status === 'CANCELED') {
      return 'Cancelado';
    }

    return 'Pendiente';
  }

  getAreaChipClass(area: string): string {
    const normalized = area.trim().toLowerCase();
    if (normalized === 'sistemas' || normalized === 'operaciones') {
      return 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300';
    }

    if (normalized === 'contaduria' || normalized === 'legal') {
      return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300';
    }

    if (normalized === 'rh' || normalized === 'ventas') {
      return 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-300';
    }

    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  }

  getEntityStatusClass(status: string | null | undefined): string {
    const normalized = String(status ?? '').trim().toLowerCase();

    if (
      normalized === 'activo' ||
      normalized === 'active' ||
      normalized === 'pagado' ||
      normalized === 'assigned' ||
      normalized === 'asignado'
    ) {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300';
    }

    if (
      normalized === 'pendiente' ||
      normalized === 'pending' ||
      normalized === 'waiting' ||
      normalized === 'en validacion'
    ) {
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
    }

    if (normalized === 'prospecto' || normalized === 'prospect') {
      return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
    }

    if (
      normalized === 'inactivo' ||
      normalized === 'inactive' ||
      normalized === 'bloqueado' ||
      normalized === 'blocked' ||
      normalized === 'cancelado'
    ) {
      return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300';
    }

    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  }

  getAssignmentStatusClass(row: AssignmentUserRow): string {
    return this.hasAssignedQuestionnaire(row)
      ? 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300'
      : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
  }

  getAssignmentStatusLabel(row: AssignmentUserRow): string {
    const selectedCount = this.getSelectedQuestionnairesForRow(row).length;
    if (selectedCount === 0) {
      return 'Sin cuestionarios';
    }

    return selectedCount === 1
      ? '1 cuestionario'
      : `${selectedCount} cuestionarios`;
  }

  getSelectedQuestionnairesForRow(
    row: AssignmentUserRow,
  ): AssignmentQuestionnaireOption[] {
    const selectedIds = new Set(row.questionnaireIds);
    return this.getQuestionnaireOptionsForRow(row).filter((questionnaire) =>
      selectedIds.has(questionnaire.id),
    );
  }

  getQuestionnaireOptionsForRow(
    row: AssignmentUserRow,
  ): AssignmentQuestionnaireOption[] {
    const normalizedArea = row.area.trim().toLowerCase();
    return [...this.certificationQuestionnaires].sort((a, b) => {
      const aMatches = a.area.trim().toLowerCase() === normalizedArea ? 0 : 1;
      const bMatches = b.area.trim().toLowerCase() === normalizedArea ? 0 : 1;
      if (aMatches !== bMatches) {
        return aMatches - bMatches;
      }

      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });
  }

  isAreaMismatch(row: AssignmentUserRow): boolean {
    return this.getSelectedQuestionnairesForRow(row).some(
      (questionnaire) =>
        questionnaire.area.trim().toLowerCase() !== row.area.trim().toLowerCase(),
    );
  }

  isQuestionnaireSelected(
    row: AssignmentUserRow,
    questionnaireId: string,
  ): boolean {
    return row.questionnaireIds.includes(questionnaireId);
  }

  toggleQuestionnaireSelection(
    row: AssignmentUserRow,
    questionnaireId: string,
  ): void {
    if (this.isQuestionnaireSelected(row, questionnaireId)) {
      row.questionnaireIds = row.questionnaireIds.filter((id) => id !== questionnaireId);
      return;
    }

    row.questionnaireIds = [...row.questionnaireIds, questionnaireId];
  }

  clearQuestionnaires(row: AssignmentUserRow): void {
    row.questionnaireIds = [];
  }

  selectAllQuestionnaires(row: AssignmentUserRow): void {
    row.questionnaireIds = this.getQuestionnaireOptionsForRow(row).map(
      (questionnaire) => questionnaire.id,
    );
  }

  getQuestionnaireSelectionClass(
    row: AssignmentUserRow,
    questionnaire: AssignmentQuestionnaireOption,
  ): string {
    if (this.isQuestionnaireSelected(row, questionnaire.id)) {
      return 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-300';
    }

    if (
      questionnaire.area.trim().toLowerCase() === row.area.trim().toLowerCase()
    ) {
      return 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300';
    }

    return 'border-gray-200 bg-white text-gray-700 hover:border-brand-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-500/30 dark:hover:bg-white/5';
  }

  autoAssignByArea(): void {
    if (!this.canAutoAssign) {
      return;
    }

    let assignedCount = 0;
    let missingCount = 0;

    this.assignedRows.forEach((row) => {
      const matches = this.certificationQuestionnaires.filter(
        (questionnaire) =>
          questionnaire.area.trim().toLowerCase() === row.area.trim().toLowerCase(),
      );

      if (matches.length > 0) {
        row.questionnaireIds = matches.map((questionnaire) => questionnaire.id);
        assignedCount += 1;
        return;
      }

      row.questionnaireIds = [];
      missingCount += 1;
    });

    this.toastService.show({
      type: missingCount > 0 ? 'warning' : 'success',
      message:
        missingCount > 0
          ? `Se prepararon cuestionarios para ${assignedCount} usuarios. ${missingCount} quedaron sin coincidencias por area.`
          : `Se prepararon cuestionarios para ${assignedCount} usuarios por area.`,
      durationMs: 3200,
    });
  }

  getQuestionnairePassScore(questionnaire: AssignmentQuestionnaireOption): string {
    return questionnaire.passScore === null ? 'Info' : `${questionnaire.passScore}%`;
  }

  saveAssignment(): void {
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    if (!this.selectedClient || !this.selectedCertification) {
      return;
    }

    if (this.hasIncompleteAssignments) {
      this.toastService.show({
        type: 'warning',
        message:
          'Todos los usuarios seleccionados deben tener un cuestionario asignado antes de guardar.',
        durationMs: 3200,
      });
      return;
    }

    const formValue = this.assignmentForm.getRawValue();
    const payload = {
      clientId: String(formValue.clientId ?? ''),
      clientName: this.selectedClient.nombreCliente,
      certificationId: String(formValue.certificationId ?? ''),
      certificationName: this.selectedCertification.nombre,
      users: this.assignedRows
        .flatMap((row) =>
          this.getSelectedQuestionnairesForRow(row).map((questionnaire) => ({
            userId: row.userId,
            userName: row.fullName,
            userArea: row.area,
            questionnaireId: questionnaire.id,
            questionnaireName: questionnaire.nombre,
            questionnaireArea: questionnaire.area,
          })),
        )
        .filter((row): row is EvaluationAssignmentUser => !!row),
      currency: (formValue.currency ?? 'MXN') as 'MXN' | 'USD',
      price: Number(formValue.price ?? 0),
      paymentStatus: (formValue.paymentStatus ?? 'PENDING') as
        | 'PENDING'
        | 'WAITING'
        | 'PAID'
        | 'CANCELED',
      paidAt:
        formValue.paymentStatus === 'PAID'
          ? new Date().toISOString()
          : undefined,
    };

    if (this.editingAssignmentId) {
      this.assignmentsStorage.update(this.editingAssignmentId, payload);
      this.toastService.show({
        type: 'success',
        message: 'Asignacion actualizada',
        durationMs: 2400,
      });
    } else {
      this.assignmentsStorage.create(payload);
      this.toastService.show({
        type: 'success',
        message: 'Asignacion creada',
        durationMs: 2400,
      });
    }

    this.goToList();
  }

  private initializeFromRoute(): void {
    this.route.paramMap.subscribe((params) => {
      const assignmentId = params.get('id');
      this.editingAssignmentId = assignmentId;

      if (!assignmentId) {
        this.resetForm();
        return;
      }

      const assignment = this.assignmentsStorage.getById(assignmentId);
      if (!assignment) {
        this.goToList();
        return;
      }

      this.loadAssignment(assignment);
    });
  }

  private loadSources(): void {
    this.clients = this.clientsStore.listClients().sort((a, b) =>
      a.nombreCliente.localeCompare(b.nombreCliente, 'es', {
        sensitivity: 'base',
      }),
    );

    this.certifications = this.repository
      .getCertifications()
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      );
  }

  private resetForm(): void {
    this.selectedClient = null;
    this.selectedCertification = null;
    this.certificationQuestionnaires = [];
    this.assignedRows = [];
    this.availableRows = [];
    this.clientSearchTerm = '';
    this.certificationSearchTerm = '';
    this.availableUsersSearchTerm = '';
    this.justAddedUserId = null;

    this.assignmentForm.reset({
      clientId: '',
      certificationId: '',
      assignedUserIds: [],
      currency: 'MXN',
      price: null,
      paymentStatus: 'PENDING',
    });
  }

  private loadAssignment(assignment: EvaluationAssignment): void {
    const client = this.clients.find(
      (candidate) => String(candidate.id) === assignment.clientId,
    );
    const certification = this.certifications.find(
      (candidate) => candidate.id === assignment.certificationId,
    );

    if (!client || !certification) {
      this.toastService.show({
        type: 'warning',
        message:
          'La asignacion ya no puede editarse porque el cliente o la certificacion no existen.',
        durationMs: 3600,
      });
      this.goToList();
      return;
    }

    this.assignmentForm.reset({
      clientId: assignment.clientId,
      certificationId: assignment.certificationId,
      assignedUserIds: Array.from(new Set(assignment.users.map((user) => user.userId))),
      currency: assignment.currency,
      price: assignment.price,
      paymentStatus: assignment.paymentStatus,
    });

    this.selectCertification(certification, true);
    this.selectClient(client, {
      preserveUsers: assignment.users,
      fromLoad: true,
    });
  }

  private rebuildUserRows(
    clientId: number,
    preservedUsers: EvaluationAssignmentUser[],
  ): void {
    const users = this.clientsStore.listUsersByClient(clientId);
    const preservedMap = preservedUsers.reduce<
      Map<string, EvaluationAssignmentUser[]>
    >((map, user) => {
      const current = map.get(user.userId) ?? [];
      current.push(user);
      map.set(user.userId, current);
      return map;
    }, new Map());
    const rows = users.map((user) =>
      this.mapUserRow(user, preservedMap.get(String(user.id))),
    );
    const assignedUserIds = Array.from(new Set(preservedUsers.map((user) => user.userId)));
    const assignedSet = new Set(assignedUserIds);

    this.assignedRows = assignedUserIds
      .map((userId) => rows.find((row) => row.userId === userId))
      .filter((row): row is AssignmentUserRow => !!row);

    this.availableRows = rows.filter((row) => !assignedSet.has(row.userId));
    this.sortAvailableRows();
    this.syncAssignedUserIdsControl();
  }

  private mapUserRow(
    user: UsuarioCliente,
    preservedUsers: EvaluationAssignmentUser[] = [],
  ): AssignmentUserRow {
    return {
      userId: String(user.id),
      fullName: `${user.nombres} ${user.apellidos}`.trim(),
      email: user.email,
      status: user.estatus,
      phone: user.telefono,
      area: user.area || 'Otro',
      questionnaireIds: Array.from(
        new Set(
          preservedUsers
            .map((preservedUser) => preservedUser.questionnaireId)
            .filter((questionnaireId) => questionnaireId.trim().length > 0),
        ),
      ),
    };
  }

  private addUserById(
    userId: string,
    targetIndex = this.assignedRows.length,
  ): void {
    if (this.assignedRows.some((row) => row.userId === userId)) {
      return;
    }

    const bankIndex = this.availableRows.findIndex(
      (row) => row.userId === userId,
    );
    if (bankIndex < 0) {
      return;
    }

    const row = this.availableRows.splice(bankIndex, 1)[0];
    this.assignedRows.splice(targetIndex, 0, row);
    this.syncAssignedUserIdsControl();
    this.markAsJustAdded(userId);
  }

  private syncAssignedUserIdsControl(): void {
    this.assignmentForm.patchValue({
      assignedUserIds: this.assignedRows.map((row) => row.userId),
    });
    this.assignmentForm.get('assignedUserIds')?.markAsDirty();
    this.assignmentForm.get('assignedUserIds')?.updateValueAndValidity();
  }

  private markAsJustAdded(userId: string): void {
    this.justAddedUserId = userId;
    globalThis.setTimeout(() => {
      if (this.justAddedUserId === userId) {
        this.justAddedUserId = null;
      }
    }, 650);
  }

  private sortAvailableRows(): void {
    this.availableRows.sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' }),
    );
  }

  private buildCertificationQuestionnaires(
    certification: Certification,
  ): AssignmentQuestionnaireOption[] {
    const questionnairesById = new Map(
      this.repository.getQuestionnaires().map((questionnaire) => [questionnaire.id, questionnaire]),
    );

    return certification.questionnaireIds
      .map((questionnaireId) => questionnairesById.get(questionnaireId))
      .filter((questionnaire): questionnaire is Questionnaire => !!questionnaire)
      .map((questionnaire) => ({
        id: questionnaire.id,
        nombre: questionnaire.nombre,
        area: questionnaire.area?.trim() || 'Otro',
        passScore:
          typeof questionnaire.settings.passScore === 'number'
            ? questionnaire.settings.passScore
            : certification.rules.minScore ?? null,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  private dropUnavailableQuestionnaires(): void {
    const validIds = new Set(
      this.certificationQuestionnaires.map((questionnaire) => questionnaire.id),
    );

    this.assignedRows.forEach((row) => {
      row.questionnaireIds = row.questionnaireIds.filter((questionnaireId) =>
        validIds.has(questionnaireId),
      );
    });
  }

  private hasAssignedQuestionnaire(row: AssignmentUserRow): boolean {
    return this.getSelectedQuestionnairesForRow(row).length > 0;
  }

  private requireArraySelection(
    control: AbstractControl,
  ): ValidationErrors | null {
    return Array.isArray(control.value) && control.value.length > 0
      ? null
      : { required: true };
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/asignaciones']);
  }
}

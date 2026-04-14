import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import {
  Blend,
  BrushCleaning,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Ellipsis,
  File,
  Funnel,
  List,
  LucideAngularModule,
  MessagesSquare,
  Plus,
  Pyramid,
  Search,
  SquarePen,
  MessageSquareText,
  Check,
  X,
} from "lucide-angular";
import {
  getQuestionTypeLabel,
  Question,
  QuestionType,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
} from "../../models";
import { LocalStorageEvaluacionesRepository } from "../../services/local-storage-evaluaciones.repository";
import { ModalService } from "../../../../shared/services/modal.service";
import { ToastService } from "../../../../shared/services/toast.service";

type RequiredFilter = "ALL" | "ONLY_REQUIRED" | "ONLY_OPTIONAL";
type SortKey = "titulo" | "createdAt";
type SortDirection = "asc" | "desc";
type TypePalette = {
  active: string;
  inactive: string;
};

@Component({
  selector: "app-admin-preguntas",
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: "./admin-preguntas.component.html",
})
export class AdminPreguntasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  readonly Search = Search;
  readonly Plus = Plus;
  readonly MessagesSquare = MessagesSquare;
  readonly BrushCleaning = BrushCleaning;
  readonly CircleDot = CircleDot;
  readonly SquarePen = SquarePen;
  readonly File = File;
  readonly Blend = Blend;
  readonly CircleSlash = CircleSlash;
  readonly CircleCheck = CircleCheck;
  readonly List = List;
  readonly Ellipsis = Ellipsis;
  readonly Pyramid = Pyramid;
  readonly Funnel = Funnel;
  readonly MessageSquareText = MessageSquareText;
  readonly Check = Check;
  readonly X = X;

  questions: Question[] = [];
  searchTerm = "";
  isFormVisible = false;
  editingQuestionId: string | null = null;
  selectedTypeFilters = new Set<QuestionType>();

  requiredFilter: RequiredFilter = "ALL";
  sortKey: SortKey = "createdAt";
  sortDirection: SortDirection = "desc";

  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  readonly questionTypes: QuestionType[] = [...QUESTION_TYPES];
  readonly questionTypeLabels = QUESTION_TYPE_LABELS;

  readonly defaultLikertLevels = [
    "Totalmente en desacuerdo",
    "En desacuerdo",
    "Ni de acuerdo ni en desacuerdo",
    "De acuerdo",
    "Totalmente de acuerdo",
  ];

  readonly defaultNominalLabels = [
    "Muchas veces",
    "A veces",
    "Casi nunca",
    "Nunca",
  ];

  questionForm = this.fb.group({
    titulo: ["", [Validators.required, Validators.maxLength(180)]],
    tipo: ["MULTIPLE" as QuestionType, Validators.required],
    obligatoria: [true],
    ayuda: [""],

    multiple: [false],
    textMin: [null as number | null],
    textMax: [null as number | null],
    textPlaceholder: [""],
    fileExtensions: ["pdf,jpg,png"],
    fileMaxSize: [10 as number | null],

    mixtaMultiple: [false],
    mixtaOtherLabel: ["Otros"],
    mixtaOtherPlaceholder: ["Especifica tu respuesta"],

    dicotomicaTrueLabel: ["Si", [Validators.maxLength(50)]],
    dicotomicaFalseLabel: ["No", [Validators.maxLength(50)]],

    numericMin: [1 as number | null],
    numericMax: [10 as number | null],
    numericStep: [1 as number | null],

    nominalOrientation: ["horizontal" as "horizontal" | "vertical"],

    opciones: this.fb.array([]),
    levels: this.fb.array([]),
    rules: this.fb.array([]),
  });

  constructor(private readonly repository: LocalStorageEvaluacionesRepository) {
    this.loadQuestions();
    this.initializeTypeDefaults(this.selectedType);
  }

  get opciones(): FormArray {
    return this.questionForm.get("opciones") as FormArray;
  }

  get levels(): FormArray {
    return this.questionForm.get("levels") as FormArray;
  }

  get rules(): FormArray {
    return this.questionForm.get("rules") as FormArray;
  }

  get selectedType(): QuestionType {
    return (this.questionForm.get("tipo")?.value as QuestionType) ?? "MULTIPLE";
  }

  get processedQuestions(): Question[] {
    let result = [...this.questions];
    result = this.applySearch(result);
    result = this.applyTypeFilter(result);
    result = this.applyRequiredFilter(result);
    result = this.applySort(result);
    return result;
  }

  get paginatedQuestions(): Question[] {
    const source = this.processedQuestions;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return source.slice(start, end);
  }

  get totalItems(): number {
    return this.processedQuestions.length;
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

  get availableRuleAnswerOptions(): { id: string; texto: string }[] {
    return this.opciones.controls
      .map((control) => ({
        id: String(control.get("id")?.value ?? ""),
        texto: String(control.get("texto")?.value ?? "").trim(),
      }))
      .filter((option) => option.id.length > 0);
  }

  showCreateForm(): void {
    this.router.navigate(["/evaluaciones/admin/preguntas/nueva"]);
  }

  editQuestion(question: Question): void {
    this.router.navigate([
      "/evaluaciones/admin/preguntas",
      question.id,
      "editar",
    ]);
  }

  onTypeChanged(): void {
    this.clearOptions();
    this.clearLevels();
    this.clearRules();
    this.initializeTypeDefaults(this.selectedType, true);
  }

  addOption(id?: string, texto = ""): void {
    this.opciones.push(
      this.fb.group({
        id: [id ?? this.generateOptionId()],
        texto: [texto, [Validators.required, Validators.maxLength(120)]],
      }),
    );

    if (this.selectedType === "FILTER") {
      this.syncRuleAnswerValues();
    }
  }

  removeOption(index: number): void {
    if (this.opciones.length <= 1) {
      return;
    }

    this.opciones.removeAt(index);
    if (this.selectedType === "FILTER") {
      this.syncRuleAnswerValues();
    }
  }

  addLevel(value = ""): void {
    this.levels.push(
      new FormControl(value, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120)],
      }),
    );
  }

  removeLevel(index: number): void {
    if (this.levels.length <= 2) {
      return;
    }

    this.levels.removeAt(index);
  }

  addRule(answerValue = "", goToQuestionId = "", endQuiz = false): void {
    this.rules.push(
      this.fb.group({
        answerValue: [answerValue, Validators.required],
        goToQuestionId: [goToQuestionId],
        endQuiz: [endQuiz],
      }),
    );
  }

  removeRule(index: number): void {
    if (this.rules.length <= 1) {
      return;
    }

    this.rules.removeAt(index);
  }

  onRuleEndQuizChange(index: number): void {
    const rule = this.rules.at(index);
    const endQuiz = !!rule.get("endQuiz")?.value;

    if (endQuiz) {
      rule.patchValue({ goToQuestionId: "" });
    }
  }

  toggleTypeFilter(type: QuestionType): void {
    if (this.selectedTypeFilters.has(type)) {
      this.selectedTypeFilters.delete(type);
    } else {
      this.selectedTypeFilters.add(type);
    }

    this.page = 1;
  }

  clearTypeFilters(): void {
    this.selectedTypeFilters.clear();
    this.page = 1;
  }

  setRequiredFilter(filter: RequiredFilter): void {
    this.requiredFilter = filter;
    this.page = 1;
  }

  onSearchChange(): void {
    this.page = 1;
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortKey = key;
      this.sortDirection = key === "createdAt" ? "desc" : "asc";
    }

    this.page = 1;
  }

  isSortedBy(key: SortKey): boolean {
    return this.sortKey === key;
  }

  isSortDirection(direction: SortDirection): boolean {
    return this.sortDirection === direction;
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

  cancelForm(): void {
    this.isFormVisible = false;
    this.editingQuestionId = null;
  }

  saveQuestion(): void {
    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      return;
    }

    const type = this.selectedType;
    let config: Question["config"];

    switch (type) {
      case "MULTIPLE": {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
          multiple: !!this.questionForm.get("multiple")?.value,
        };
        break;
      }
      case "MULTIPLE_SELECT": {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
        };
        break;
      }
      case "MIXTA": {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
          multiple: !!this.questionForm.get("mixtaMultiple")?.value,
          otherOptionValue: "__other__",
          otherLabel:
            this.questionForm.get("mixtaOtherLabel")?.value?.trim() || "Otros",
          otherPlaceholder:
            this.questionForm.get("mixtaOtherPlaceholder")?.value?.trim() ||
            "Especifica tu respuesta",
        };
        break;
      }
      case "DICOTOMICA": {
        config = {
          trueLabel:
            this.questionForm.get("dicotomicaTrueLabel")?.value?.trim() || "Si",
          falseLabel:
            this.questionForm.get("dicotomicaFalseLabel")?.value?.trim() ||
            "No",
        };
        break;
      }
      case "RANKING": {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
        };
        break;
      }
      case "LIKERT": {
        const levels = this.buildLevelsFromForm();
        if (levels.length < 2) {
          this.levels.markAllAsTouched();
          return;
        }

        config = {
          levels,
        };
        break;
      }
      case "NUMERIC_SCALE": {
        const min = this.questionForm.get("numericMin")?.value;
        const max = this.questionForm.get("numericMax")?.value;
        const step = this.questionForm.get("numericStep")?.value;

        if (typeof min !== "number" || typeof max !== "number") {
          return;
        }

        if (max < min) {
          return;
        }

        config = {
          min,
          max,
          step: typeof step === "number" && step > 0 ? step : 1,
        };
        break;
      }
      case "NOMINAL_SCALE": {
        const labels = this.buildLevelsFromForm();
        if (labels.length < 2) {
          this.levels.markAllAsTouched();
          return;
        }

        config = {
          labels,
          orientation:
            (this.questionForm.get("nominalOrientation")?.value as
              | "horizontal"
              | "vertical") ?? "horizontal",
        };
        break;
      }
      case "FILTER": {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        this.syncRuleAnswerValues();

        const rules = this.rules.controls
          .map((control) => ({
            answerValue: String(control.get("answerValue")?.value ?? "").trim(),
            goToQuestionId: String(
              control.get("goToQuestionId")?.value ?? "",
            ).trim(),
            endQuiz: !!control.get("endQuiz")?.value,
          }))
          .filter((rule) => rule.answerValue.length > 0)
          .map((rule) => ({
            answerValue: rule.answerValue,
            goToQuestionId: rule.endQuiz
              ? undefined
              : rule.goToQuestionId || undefined,
            endQuiz: rule.endQuiz || undefined,
          }));

        config = {
          opciones: options,
          rules,
        };
        break;
      }
      case "TEXT": {
        const minLength = this.questionForm.get("textMin")?.value ?? null;
        const maxLength = this.questionForm.get("textMax")?.value ?? null;
        config = {
          minLength: minLength ?? undefined,
          maxLength: maxLength ?? undefined,
          placeholder:
            this.questionForm.get("textPlaceholder")?.value?.trim() ||
            undefined,
        };
        break;
      }
      case "FILE":
      default: {
        const extensionsRaw =
          this.questionForm.get("fileExtensions")?.value ?? "";
        const extensions = extensionsRaw
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length > 0);
        const maxSize = this.questionForm.get("fileMaxSize")?.value ?? null;

        config = {
          allowedExtensions: extensions.length > 0 ? extensions : undefined,
          maxSizeMB: maxSize ?? undefined,
        };
        break;
      }
    }

    this.repository.saveQuestion({
      id: this.editingQuestionId ?? undefined,
      titulo: this.questionForm.get("titulo")?.value?.trim() ?? "",
      tipo: type,
      obligatoria: !!this.questionForm.get("obligatoria")?.value,
      ayuda: this.questionForm.get("ayuda")?.value?.trim() || undefined,
      config,
    });

    this.loadQuestions();
    this.cancelForm();
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const confirmed = await this.modalService.openConfirm({
      type: "delete",
      title: "Eliminar pregunta",
      message: "Esta accion eliminara la pregunta de forma permanente.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    this.repository.deleteQuestion(questionId);
    this.loadQuestions();
    this.toastService.show({
      type: "success",
      message: "Pregunta eliminada",
      durationMs: 3000,
    });
  }

  getTypeLabel(question: Question): string {
    return getQuestionTypeLabel(question);
  }

  getQuestionPercentage(question: Question): number {
    const seed = Array.from(question.id).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0,
    );
    return ((seed % 20) + 1) * 5;
  }

  getTypeIcon(type: QuestionType): typeof CircleDot {
    switch (type) {
      case "MULTIPLE":
        return this.CircleDot;
      case "TEXT":
        return this.SquarePen;
      case "FILE":
        return this.File;
      case "MIXTA":
        return this.Blend;
      case "DICOTOMICA":
        return this.CircleSlash;
      case "MULTIPLE_SELECT":
        return this.CircleCheck;
      case "RANKING":
        return this.List;
      case "LIKERT":
      case "NUMERIC_SCALE":
        return this.Ellipsis;
      case "NOMINAL_SCALE":
        return this.Pyramid;
      case "FILTER":
        return this.Funnel;
      default:
        return this.CircleDot;
    }
  }

  getTypeIconForQuestion(question: Question): typeof CircleDot {
    if (
      question.tipo === "MULTIPLE" &&
      typeof question.config === "object" &&
      question.config !== null &&
      "multiple" in question.config &&
      !!question.config.multiple
    ) {
      return this.CircleCheck;
    }

    return this.getTypeIcon(question.tipo);
  }

  isTypeFilterActive(type: QuestionType): boolean {
    return this.selectedTypeFilters.has(type);
  }

  isOptionBasedType(type: QuestionType): boolean {
    return [
      "MULTIPLE",
      "MULTIPLE_SELECT",
      "MIXTA",
      "RANKING",
      "FILTER",
    ].includes(type);
  }

  private loadQuestions(): void {
    this.questions = this.repository.getQuestions().map((question) => ({
      ...question,
      createdAt: question.createdAt ?? new Date().toISOString(),
    }));
  }

  private getEffectiveType(question: Question): QuestionType {
    if (
      question.tipo === "MULTIPLE" &&
      typeof question.config === "object" &&
      question.config !== null &&
      "multiple" in question.config &&
      !!question.config.multiple
    ) {
      return "MULTIPLE_SELECT";
    }

    return question.tipo;
  }

  private getTypePalette(type: QuestionType): TypePalette {
    void type;

    return {
      // Activo
      active: [
        "border-blue-600 bg-blue-600 text-white",
        "hover:bg-blue-700",
        "dark:border-blue-400 dark:bg-blue-500 dark:text-white",
        "dark:hover:bg-blue-600",
      ].join(" "),

      // Inactivo
      inactive: [
        "border-blue-300 bg-blue-50 text-blue-700",
        "hover:bg-blue-100",
        "dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
        "dark:hover:bg-blue-500/20",
      ].join(" "),
    };
  }

  getTypeBadgeClass(question: Question): string {
    const type = this.getEffectiveType(question); // ya lo tienes
    const p = this.getTypePalette(type);
    return p.inactive;
  }

  getTypeFilterChipClass(type: QuestionType): string {
    const p = this.getTypePalette(type);
    const isActive = this.selectedTypeFilters.has(type); // ✅ aquí
    return isActive ? p.active : p.inactive;
  }

  private initializeTypeDefaults(type: QuestionType, forceReset = false): void {
    if (
      this.isOptionBasedType(type) &&
      (forceReset || this.opciones.length === 0)
    ) {
      this.addOption(undefined, "Opcion 1");
      this.addOption(undefined, "Opcion 2");
    }

    if (type === "LIKERT" && (forceReset || this.levels.length === 0)) {
      this.defaultLikertLevels.forEach((level) => this.addLevel(level));
    }

    if (type === "NOMINAL_SCALE" && (forceReset || this.levels.length === 0)) {
      this.defaultNominalLabels.forEach((label) => this.addLevel(label));
    }

    if (type === "FILTER" && (forceReset || this.rules.length === 0)) {
      const firstOptionId = this.availableRuleAnswerOptions[0]?.id ?? "";
      this.addRule(firstOptionId);
      this.syncRuleAnswerValues();
    }
  }

  private buildOptionsFromForm(): { id: string; texto: string }[] {
    return this.opciones.controls
      .map((control) => ({
        id: String(control.get("id")?.value ?? ""),
        texto: String(control.get("texto")?.value ?? "").trim(),
      }))
      .filter((option) => option.id.length > 0 && option.texto.length > 0);
  }

  private buildLevelsFromForm(): string[] {
    return this.levels.controls
      .map((control) => String(control.value ?? "").trim())
      .filter((value) => value.length > 0);
  }

  private applySearch(source: Question[]): Question[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return source;
    }

    return source.filter((question) => {
      const inTitle = question.titulo.toLowerCase().includes(term);
      const inHelp = question.ayuda?.toLowerCase().includes(term) ?? false;
      const inType = this.getTypeLabel(question).toLowerCase().includes(term);
      return inTitle || inHelp || inType;
    });
  }

  private applyTypeFilter(source: Question[]): Question[] {
    if (this.selectedTypeFilters.size === 0) {
      return source;
    }

    return source.filter((question) =>
      this.selectedTypeFilters.has(question.tipo),
    );
  }

  private applyRequiredFilter(source: Question[]): Question[] {
    if (this.requiredFilter === "ONLY_REQUIRED") {
      return source.filter((question) => question.obligatoria);
    }

    if (this.requiredFilter === "ONLY_OPTIONAL") {
      return source.filter((question) => !question.obligatoria);
    }

    return source;
  }

  private applySort(source: Question[]): Question[] {
    return source.sort((a, b) => {
      if (this.sortKey === "titulo") {
        const result = a.titulo.localeCompare(b.titulo, "es", {
          sensitivity: "base",
        });
        return this.sortDirection === "asc" ? result : -result;
      }

      const aTime = Date.parse(a.createdAt || "");
      const bTime = Date.parse(b.createdAt || "");
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      const result = safeATime - safeBTime;
      return this.sortDirection === "asc" ? result : -result;
    });
  }

  private syncRuleAnswerValues(): void {
    const validIds = this.availableRuleAnswerOptions.map((option) => option.id);

    this.rules.controls.forEach((ruleControl) => {
      const answerValue = String(ruleControl.get("answerValue")?.value ?? "");
      if (!validIds.includes(answerValue)) {
        ruleControl.patchValue({ answerValue: validIds[0] ?? "" });
      }
    });
  }

  private clearOptions(): void {
    while (this.opciones.length > 0) {
      this.opciones.removeAt(0);
    }
  }

  private clearLevels(): void {
    while (this.levels.length > 0) {
      this.levels.removeAt(0);
    }
  }

  private clearRules(): void {
    while (this.rules.length > 0) {
      this.rules.removeAt(0);
    }
  }

  private generateOptionId(): string {
    const uid =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    return `op_${uid}`;
  }
}

import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { Subscription } from "rxjs";
import {
  BadgeCheck,
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Info,
  Landmark,
  LucideAngularModule,
  Pencil,
  Shield,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-angular";
import {
  AppRole,
  SessionRoleService,
} from "../../core/services/session-role.service";
import { ComponentCardComponent } from "../../shared/components/common/component-card/component-card.component";
import {
  CardBrand,
  PAYMENT_METHOD_TYPE_LABELS,
  PAYMENT_METHOD_TYPE_OPTIONS,
  PaymentMethod,
  PaymentMethodType,
  SettingsSection,
  SettingsUserProfile,
} from "./settings.models";
import { SettingsStoreService } from "./settings-store.service";

@Component({
  selector: "app-settings",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ComponentCardComponent,
  ],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sessionRoleService = inject(SessionRoleService);
  private readonly settingsStore = inject(SettingsStoreService);

  readonly UserRound = UserRound;
  readonly CreditCard = CreditCard;
  readonly Wallet = Wallet;
  readonly Landmark = Landmark;
  readonly BadgeDollarSign = BadgeDollarSign;
  readonly BadgeCheck = BadgeCheck;
  readonly CalendarDays = CalendarDays;
  readonly Shield = Shield;
  readonly Info = Info;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;

  readonly sections: Array<{
    id: SettingsSection;
    label: string;
    helper: string;
    icon: unknown;
  }> = [
    {
      id: "profile",
      label: "Informacion del usuario",
      helper: "Resumen del perfil activo y estatus local de la cuenta.",
      icon: UserRound,
    },
    {
      id: "payments",
      label: "Metodo de pago",
      helper: "Wallet visual para administrar metodos dummy por rol.",
      icon: CreditCard,
    },
  ];

  readonly paymentTypeOptions = PAYMENT_METHOD_TYPE_OPTIONS;
  readonly paypalAsset = this.settingsStore.getPaypalAsset();

  currentRole: "admin" | "user" = "admin";
  activeSection: SettingsSection = "profile";
  profile!: SettingsUserProfile;
  paymentMethods: PaymentMethod[] = [];
  editingMethodId: number | null = null;
  detectedCardBrand: CardBrand = null;

  readonly paymentForm = this.fb.group({
    type: ["card" as PaymentMethodType, [Validators.required]],
    holderName: ["", [Validators.required, Validators.minLength(3)]],
    reference: ["", [Validators.required, Validators.minLength(4)]],
    expiration: [""],
    cvv: [""],
    alias: ["", [Validators.required, Validators.minLength(3)]],
    bankName: [""],
    isDefault: [false],
    notes: [""],
  });

  private readonly subscription = new Subscription();

  constructor() {
    this.syncRole(this.sessionRoleService.getRole());
    this.setupFormBehavior();
    this.subscription.add(
      this.sessionRoleService.role$.subscribe((role) => this.syncRole(role)),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setActiveSection(section: SettingsSection): void {
    this.activeSection = section;
  }

  setPaymentType(type: PaymentMethodType): void {
    const control = this.paymentForm.get("type");
    control?.setValue(type);
    control?.markAsDirty();
    control?.markAsTouched();
  }

  submitPaymentMethod(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.settingsStore.savePaymentMethod(
      this.currentRole,
      {
        type:
          (this.paymentForm.get("type")?.value as PaymentMethodType) ?? "card",
        holderName: (this.paymentForm.get("holderName")?.value ?? "").trim(),
        reference: (this.paymentForm.get("reference")?.value ?? "").trim(),
        expiration: (this.paymentForm.get("expiration")?.value ?? "").trim(),
        cvv: (this.paymentForm.get("cvv")?.value ?? "").trim(),
        alias: (this.paymentForm.get("alias")?.value ?? "").trim(),
        bankName: (this.paymentForm.get("bankName")?.value ?? "").trim(),
        isDefault: !!this.paymentForm.get("isDefault")?.value,
        notes: (this.paymentForm.get("notes")?.value ?? "").trim(),
      },
      this.editingMethodId,
    );

    this.reloadPaymentMethods();
    this.resetPaymentForm();
  }

  editMethod(method: PaymentMethod): void {
    this.activeSection = "payments";
    this.editingMethodId = method.id;
    this.detectedCardBrand = method.brand;
    this.paymentForm.patchValue({
      type: method.type,
      holderName: method.holderName,
      reference: method.maskedValue,
      expiration: method.expiration,
      cvv: "",
      alias: method.alias,
      bankName: method.bankName,
      isDefault: method.isDefault,
      notes: method.notes,
    });
    this.applyTypeValidators();
  }

  removeMethod(methodId: number): void {
    this.settingsStore.deletePaymentMethod(this.currentRole, methodId);
    this.reloadPaymentMethods();

    if (this.editingMethodId === methodId) {
      this.resetPaymentForm();
    }
  }

  markAsDefault(methodId: number): void {
    this.settingsStore.setDefaultPaymentMethod(this.currentRole, methodId);
    this.reloadPaymentMethods();
  }

  cancelEdition(): void {
    this.resetPaymentForm();
  }

  get initials(): string {
    return this.profile.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  get defaultMethod(): PaymentMethod | undefined {
    return this.paymentMethods.find((method) => method.isDefault);
  }

  get showCardFields(): boolean {
    return this.paymentForm.get("type")?.value === "card";
  }

  get selectedPaymentType(): PaymentMethodType {
    return (this.paymentForm.get("type")?.value as PaymentMethodType) ?? "card";
  }

  get showBankNameField(): boolean {
    return this.selectedPaymentType !== "paypal";
  }

  get detectedBrandAsset(): string | null {
    return this.getCardBrandAsset(this.detectedCardBrand);
  }

  get activePaymentTypeLabel(): string {
    const type =
      (this.paymentForm.get("type")?.value as PaymentMethodType) ?? "card";
    return PAYMENT_METHOD_TYPE_LABELS[type];
  }

  get currentTypeHelper(): string {
    const type = this.selectedPaymentType;
    return (
      this.paymentTypeOptions.find((option) => option.value === type)?.helper ??
      ""
    );
  }

  get editingMode(): boolean {
    return this.editingMethodId !== null;
  }

  get previewMethodIcon(): unknown {
    const type = this.selectedPaymentType;
    if (type === "bank-transfer") {
      return Landmark;
    }
    if (type === "direct-debit") {
      return Wallet;
    }
    if (type === "bank-reference") {
      return BadgeDollarSign;
    }
    if (type === "paypal") {
      return Wallet;
    }

    return CreditCard;
  }

  get referenceFieldLabel(): string {
    switch (this.selectedPaymentType) {
      case "card":
        return "Numero de tarjeta";
      case "bank-transfer":
        return "CLABE o cuenta destino";
      case "direct-debit":
        return "Convenio o cuenta de cargo";
      case "bank-reference":
        return "Numero de referencia";
      case "paypal":
        return "Correo o cuenta PayPal";
      default:
        return "Referencia";
    }
  }

  get referenceFieldPlaceholder(): string {
    switch (this.selectedPaymentType) {
      case "card":
        return "4111 1111 1111 1111";
      case "bank-transfer":
        return "0123 4567 8901 2345 678";
      case "direct-debit":
        return "DOM-4582-9911";
      case "bank-reference":
        return "REF-2026-8842";
      case "paypal":
        return "cliente@paypal.demo";
      default:
        return "Dato de referencia";
    }
  }

  get bankFieldLabel(): string {
    switch (this.selectedPaymentType) {
      case "bank-transfer":
        return "Banco receptor";
      case "direct-debit":
        return "Banco de cargo";
      case "bank-reference":
        return "Banco de referencia";
      default:
        return "Banco emisor";
    }
  }

  get bankFieldPlaceholder(): string {
    switch (this.selectedPaymentType) {
      case "bank-transfer":
        return "Ej. BBVA, Banorte, Santander";
      case "direct-debit":
        return "Ej. Banco autorizante";
      case "bank-reference":
        return "Ej. Banco para pago en ventanilla";
      default:
        return "Ej. BBVA, Banorte, Santander";
    }
  }

  get previewReferenceValue(): string {
    const value = (this.paymentForm.get("reference")?.value ?? "").trim();
    if (value) {
      return value;
    }

    switch (this.selectedPaymentType) {
      case "card":
        return "**** **** **** ****";
      case "bank-transfer":
        return "CLABE **** 4821";
      case "direct-debit":
        return "DOM **** 1874";
      case "bank-reference":
        return "REF **** 3209";
      case "paypal":
        return "cliente@paypal.demo";
      default:
        return "Sin referencia";
    }
  }

  get previewStatusLabel(): string {
    const hasReference = !!(this.paymentForm.get("reference")?.value ?? "").trim();

    switch (this.selectedPaymentType) {
      case "paypal":
        return hasReference ? "Cuenta conectada" : "Pendiente de conexion";
      case "bank-transfer":
        return hasReference ? "Cuenta validada" : "Pendiente de alta";
      case "direct-debit":
        return hasReference ? "Autorizacion activa" : "Pendiente de autorizacion";
      case "bank-reference":
        return hasReference ? "Referencia lista" : "Referencia por generar";
      default:
        return hasReference ? "Lista para cobro" : "Completa los datos";
    }
  }

  get previewStatusClass(): string {
    switch (this.selectedPaymentType) {
      case "paypal":
        return "border-sky-300/30 bg-white/15 text-white";
      case "bank-transfer":
        return "border-emerald-300/30 bg-white/10 text-white/90";
      case "direct-debit":
        return "border-cyan-300/30 bg-white/10 text-white/90";
      case "bank-reference":
        return "border-amber-300/30 bg-white/10 text-white/90";
      default:
        return "border-white/15 bg-white/10 text-white/90";
    }
  }

  get previewBankName(): string {
    return (this.paymentForm.get("bankName")?.value ?? "").trim() || "Banco demo";
  }

  get summaryCards(): Array<{
    label: string;
    value: string;
    helper: string;
    icon: unknown;
  }> {
    return [
      {
        label: "Metodos registrados",
        value: String(this.paymentMethods.length),
        helper: "Wallet dummy local disponible para este rol.",
        icon: Wallet,
      },
      {
        label: "Metodo principal",
        value: this.defaultMethod?.alias ?? "Sin definir",
        helper: this.defaultMethod
          ? this.getMethodTypeLabel(this.defaultMethod.type)
          : "Agrega un metodo para establecer el principal.",
        icon: CreditCard,
      },
      {
        label: "Proxima renovacion",
        value: this.formatShortDate(this.profile.nextBillingDate),
        helper: "Fecha mock para futura integracion real.",
        icon: CalendarDays,
      },
      {
        label: "Estatus de pago",
        value: this.profile.paymentStatus,
        helper: "Indicador visual local sin backend.",
        icon: BadgeCheck,
      },
    ];
  }

  get accountBadges(): Array<{ label: string; tone: string }> {
    return [
      {
        label: this.profile.accountStatus,
        tone: "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-300",
      },
      {
        label: this.profile.roleLabel,
        tone: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300",
      },
      {
        label: `Seguridad ${this.profile.securityLevel.toLowerCase()}`,
        tone: "border-gray-200 bg-white/70 text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300",
      },
    ];
  }

  hasError(path: string, errorKey: string): boolean {
    const control = this.paymentForm.get(path);
    return !!control && !!control.errors?.[errorKey] && control.touched;
  }

  isInvalid(path: string): boolean {
    const control = this.paymentForm.get(path);
    return !!control && control.invalid && control.touched;
  }

  isPaymentTypeSelected(type: PaymentMethodType): boolean {
    return this.selectedPaymentType === type;
  }

  getMethodTypeLabel(type: PaymentMethodType): string {
    return PAYMENT_METHOD_TYPE_LABELS[type];
  }

  getPaymentTypeIcon(type: PaymentMethodType): unknown {
    switch (type) {
      case "bank-transfer":
        return Landmark;
      case "direct-debit":
        return Wallet;
      case "bank-reference":
        return BadgeDollarSign;
      case "paypal":
        return Wallet;
      default:
        return CreditCard;
    }
  }

  getPaymentTypeAsset(type: PaymentMethodType): string | null {
    return type === "paypal" ? this.paypalAsset : null;
  }

  getMethodIcon(method: PaymentMethod): unknown {
    switch (method.type) {
      case "bank-transfer":
        return Landmark;
      case "direct-debit":
        return Wallet;
      case "bank-reference":
        return BadgeDollarSign;
      case "paypal":
        return Wallet;
      default:
        return CreditCard;
    }
  }

  getMethodAsset(method: PaymentMethod): string | null {
    if (method.type === "paypal") {
      return this.paypalAsset;
    }

    return method.brand ? this.getCardBrandAsset(method.brand) : null;
  }

  getCardBrandAsset(brand: CardBrand): string | null {
    return this.settingsStore.getCardBrandAsset(brand);
  }

  getMethodBadgeClass(method: PaymentMethod): string {
    if (method.isDefault) {
      return "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300";
    }

    if (method.status === "Pendiente") {
      return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300";
    }

    return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-300";
  }

  getStatusBadgeClass(status: PaymentMethod["status"]): string {
    switch (status) {
      case "Pendiente":
        return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300";
      case "Verificado":
        return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-300";
      default:
        return "border-gray-200 bg-white/70 text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300";
    }
  }

  private setupFormBehavior(): void {
    const typeControl = this.paymentForm.get("type");
    const referenceControl = this.paymentForm.get("reference");

    if (!typeControl || !referenceControl) {
      return;
    }

    this.subscription.add(
      typeControl.valueChanges.subscribe((type) => {
        if (type !== "card") {
          this.detectedCardBrand = null;
        } else {
          this.syncDetectedBrand(referenceControl.value ?? "");
        }

        this.applyTypeValidators();
      }),
    );

    this.subscription.add(
      referenceControl.valueChanges.subscribe((reference) => {
        this.syncDetectedBrand(reference ?? "");
      }),
    );

    this.applyTypeValidators();
  }

  private syncRole(role: AppRole): void {
    this.currentRole = role === "user" ? "user" : "admin";
    this.profile = this.settingsStore.getUserProfile(this.currentRole);
    this.reloadPaymentMethods();
    this.resetPaymentForm();
  }

  private reloadPaymentMethods(): void {
    this.paymentMethods = this.settingsStore.listPaymentMethods(
      this.currentRole,
    );
  }

  private resetPaymentForm(): void {
    this.editingMethodId = null;
    this.detectedCardBrand = null;
    this.paymentForm.reset({
      type: "card",
      holderName: this.profile.fullName,
      reference: "",
      expiration: "",
      cvv: "",
      alias: "",
      bankName: "",
      isDefault: this.paymentMethods.length === 0,
      notes: "",
    });
    this.applyTypeValidators();
    this.paymentForm.markAsPristine();
    this.paymentForm.markAsUntouched();
  }

  private syncDetectedBrand(reference: string): void {
    if (!this.showCardFields) {
      this.detectedCardBrand = null;
      return;
    }

    this.detectedCardBrand = this.settingsStore.detectCardBrand(
      reference,
      this.editingMode ? this.detectedCardBrand : null,
    );
  }

  private applyTypeValidators(): void {
    const isCard = this.showCardFields;
    this.setValidators(
      "expiration",
      [Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
      isCard,
    );
    this.setValidators("cvv", [Validators.pattern(/^\d{3,4}$/)], isCard);
    this.paymentForm
      .get("expiration")
      ?.updateValueAndValidity({ emitEvent: false });
    this.paymentForm.get("cvv")?.updateValueAndValidity({ emitEvent: false });
  }

  private setValidators(
    path: string,
    extraValidators: ValidatorFn[],
    required: boolean,
  ): void {
    const control = this.paymentForm.get(path);
    if (!control) {
      return;
    }

    control.setValidators(
      required ? [Validators.required, ...extraValidators] : extraValidators,
    );
  }

  private formatShortDate(value: string): string {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }
}

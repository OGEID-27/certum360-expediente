import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  BadgeCheck,
  BriefcaseBusiness,
  LucideAngularModule,
  Mail,
  Signature,
  X,
} from "lucide-angular";
import {
  ContractData,
  ContractSignaturePayload,
} from "../firma-contrato.models";

@Component({
  selector: "app-contract-sign-drawer",
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: "./contract-sign-drawer.component.html",
})
export class ContractSignDrawerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() contract: ContractData | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() signed = new EventEmitter<ContractSignaturePayload>();

  readonly X = X;
  readonly Signature = Signature;
  readonly Mail = Mail;
  readonly BriefcaseBusiness = BriefcaseBusiness;
  readonly BadgeCheck = BadgeCheck;

  draft = {
    name: "",
    role: "",
    email: "",
    accepted: false,
  };

  isPanelVisible = false;
  isOverlayVisible = false;

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]) {
      if (this.isOpen) {
        this.syncDraft();
        this.playOpenAnimation();
      } else {
        this.clearTimers();
        this.isOverlayVisible = false;
        this.isPanelVisible = false;
      }
    }

    if (changes["contract"] && this.isOpen) {
      this.syncDraft();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  get canSubmit(): boolean {
    return (
      this.draft.name.trim().length >= 3 &&
      this.draft.role.trim().length >= 3 &&
      this.isValidEmail(this.draft.email) &&
      this.draft.accepted
    );
  }

  closeDrawer(): void {
    if (this.closeAnimationTimer) {
      return;
    }

    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.closeAnimationTimer = setTimeout(() => {
      this.closeAnimationTimer = null;
      this.closed.emit();
    }, 300);
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }

    this.signed.emit({
      name: this.draft.name.trim(),
      role: this.draft.role.trim(),
      email: this.draft.email.trim().toLowerCase(),
      accepted: this.draft.accepted,
    });
  }

  private syncDraft(): void {
    this.draft = {
      name: this.contract?.primarySigner.name ?? "",
      role: this.contract?.primarySigner.role ?? "",
      email: this.contract?.primarySigner.email ?? "",
      accepted: false,
    };
  }

  private playOpenAnimation(): void {
    this.clearTimers();
    this.isOverlayVisible = false;
    this.isPanelVisible = false;

    this.openAnimationTimer = setTimeout(() => {
      this.isOverlayVisible = true;
      this.isPanelVisible = true;
      this.openAnimationTimer = null;
    }, 10);
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private clearTimers(): void {
    if (this.openAnimationTimer) {
      clearTimeout(this.openAnimationTimer);
      this.openAnimationTimer = null;
    }

    if (this.closeAnimationTimer) {
      clearTimeout(this.closeAnimationTimer);
      this.closeAnimationTimer = null;
    }
  }
}

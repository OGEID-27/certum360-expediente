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
import {
  BriefcaseBusiness,
  CalendarClock,
  CircleUserRound,
  Download,
  FileText,
  LucideAngularModule,
  Mail,
  ScrollText,
  Signature,
  X,
} from "lucide-angular";
import {
  ContractData,
  ContractVersion,
  getContractStatusClasses,
} from "../firma-contrato.models";

@Component({
  selector: "app-contract-detail-drawer",
  imports: [CommonModule, LucideAngularModule],
  templateUrl: "./contract-detail-drawer.component.html",
})
export class ContractDetailDrawerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() contract: ContractData | null = null;
  @Input() versions: ContractVersion[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();
  @Output() signRequested = new EventEmitter<void>();

  readonly X = X;
  readonly FileText = FileText;
  readonly Download = Download;
  readonly Signature = Signature;
  readonly CalendarClock = CalendarClock;
  readonly CircleUserRound = CircleUserRound;
  readonly Mail = Mail;
  readonly BriefcaseBusiness = BriefcaseBusiness;
  readonly ScrollText = ScrollText;

  isPanelVisible = false;
  isOverlayVisible = false;

  private closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private openAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]) {
      if (this.isOpen) {
        this.playOpenAnimation();
      } else {
        this.clearTimers();
        this.isOverlayVisible = false;
        this.isPanelVisible = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  getStatusClasses(status: ContractData["status"]): string {
    return getContractStatusClasses(status);
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

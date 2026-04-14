import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LogOut, LucideAngularModule, Settings } from 'lucide-angular';
import { Subscription } from 'rxjs';
import {
  AppRole,
  AppSessionUser,
  SessionRoleService,
} from '../../../core/services/session-role.service';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { DropdownComponent } from '../../components/ui/dropdown/dropdown.component';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    DropdownComponent,
    LucideAngularModule,
  ],
  templateUrl: './app-header.component.html',
  styles: [
    `
      @keyframes appHeaderAvatarFlow {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      .app-header-avatar-liquid {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 52%, #2563eb 100%);
        background-size: 200% 200%;
        animation: appHeaderAvatarFlow 12s linear infinite;
        box-shadow:
          0 16px 30px -18px rgba(79, 70, 229, 0.75),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
      }
    `,
  ],
})
export class AppHeaderComponent {
  readonly Settings = Settings;
  readonly LogOut = LogOut;
  isApplicationMenuOpen = false;
  isUserMenuOpen = false;
  readonly isMobileOpen$;
  readonly isExpanded$;
  readonly isHovered$;
  currentRole: AppRole = 'admin';
  currentSession: AppSessionUser | null = null;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  private readonly roleSubscription: Subscription;

  constructor(
    public sidebarService: SidebarService,
    private readonly sessionRoleService: SessionRoleService,
    private readonly router: Router,
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.currentSession = this.sessionRoleService.getSession();
    this.currentRole = this.currentSession?.role ?? 'admin';
    this.roleSubscription = this.sessionRoleService.role$.subscribe((role) => {
      this.currentRole = role ?? 'admin';
      this.currentSession = this.sessionRoleService.getSession();
    });
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  navigateToSettings(): void {
    this.closeUserMenu();
    this.router.navigate(['/configuracion']);
  }

  logout(): void {
    const targetRoute = this.currentRole === 'user' ? '/login-user' : '/login-admin';
    this.sessionRoleService.clearRole();
    this.closeUserMenu();
    this.router.navigate([targetRoute]);
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.roleSubscription.unsubscribe();
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };

  get currentRoleLabel(): string {
    switch (this.currentRole) {
      case 'user':
        return 'Usuario';
      case 'expediente':
        return 'Admin Expediente';
      case 'admin':
      default:
        return 'Admin Evaluaciones';
    }
  }

  get currentUserName(): string {
    return this.currentSession?.name ?? 'Roberto Salazar';
  }

  get currentUserInitials(): string {
    const segments = this.currentUserName
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      return 'C3';
    }

    if (segments.length === 1) {
      return segments[0].slice(0, 2).toUpperCase();
    }

    return `${segments[0][0] ?? ''}${segments[1][0] ?? ''}`.toUpperCase();
  }

  get currentUserEmail(): string {
    return this.currentSession?.email ?? 'roberto@evaluaciones.com';
  }

  get homePath(): string {
    return this.sessionRoleService.getHomePath('/login-admin');
  }

  get showNotifications(): boolean {
    return this.currentRole !== 'expediente';
  }

  get showSettings(): boolean {
    return this.currentRole !== 'expediente';
  }
}

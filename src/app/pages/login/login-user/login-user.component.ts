import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Eye, EyeOff, Lock, LucideAngularModule, Mail } from 'lucide-angular';
import { SessionRoleService } from '../../../core/services/session-role.service';
import { ThemeToggleButtonComponent } from '../../../shared/components/common/theme-toggle/theme-toggle-button.component';
import { LoadingLoginComponent } from '../../../features/evaluaciones/components/loading-login/loading-login.component';
import { UserEvaluationsDemoSeedService } from '../../../features/evaluaciones/services/user-evaluations-demo-seed.service';

@Component({
  selector: 'app-login-user',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    ThemeToggleButtonComponent,
    LoadingLoginComponent,
  ],
  templateUrl: './login-user.component.html',
  styleUrl: './login-user.component.scss',
})
export class LoginUserComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionRoleService = inject(SessionRoleService);
  private readonly userEvaluationsDemoSeedService = inject(UserEvaluationsDemoSeedService);

  showPassword = false;
  isLoadingLogin = false;
  private loginRedirectTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmitLogin(): void {
    if (this.isLoadingLogin) {
      return;
    }

    this.loginForm.markAllAsTouched();
    this.sessionRoleService.setRole('user');
    this.isLoadingLogin = true;
    this.loginRedirectTimeout = setTimeout(() => {
      this.userEvaluationsDemoSeedService.seedUserEvaluationsDemoIfNeeded();
      this.isLoadingLogin = false;
      this.router.navigateByUrl('/evaluaciones/usuario/mis-evaluaciones');
      this.loginRedirectTimeout = null;
    }, 2500);
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  ngOnDestroy(): void {
    if (this.loginRedirectTimeout) {
      clearTimeout(this.loginRedirectTimeout);
      this.loginRedirectTimeout = null;
    }
  }
}

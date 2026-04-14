import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  Eye,
  EyeOff,
  Lock,
  LucideAngularModule,
  Mail,
  User,
} from 'lucide-angular';
import { SessionRoleService } from '../../../core/services/session-role.service';
import { LoadingLoginComponent } from '../../../features/evaluaciones/components/loading-login/loading-login.component';
import { ThemeToggleButtonComponent } from '../../../shared/components/common/theme-toggle/theme-toggle-button.component';

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value as string | undefined;
  const confirmPassword = control.get('confirmPassword')?.value as string | undefined;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-login-admin',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    ThemeToggleButtonComponent,
    LoadingLoginComponent,
  ],
  templateUrl: './login-admin.component.html',
  styleUrl: './login-admin.component.scss',
})
export class LoginAdminComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionRoleService = inject(SessionRoleService);

  isRegister = false;
  showPassword = false;
  showConfirmPassword = false;
  registerNotice = '';
  isLoadingLogin = false;
  private loginRedirectTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly User = User;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
  });

  readonly registerForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    },
  );

  ngOnInit(): void {
    if (this.sessionRoleService.getRole() !== null) {
      this.router.navigateByUrl(this.sessionRoleService.getHomePath());
    }
  }

  toggleMode(): void {
    this.isRegister = !this.isRegister;
    this.showPassword = false;
    this.showConfirmPassword = false;

    if (this.isRegister) {
      this.registerNotice = '';
    } else {
      this.loginForm.controls.password.setErrors(null);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmitLogin(): void {
    if (this.isLoadingLogin) {
      return;
    }

    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    const session = this.sessionRoleService.authenticateAdminCredentials(
      email,
      password,
    );

    if (!session) {
      this.loginForm.controls.password.setErrors({ invalidCredentials: true });
      return;
    }

    this.isLoadingLogin = true;
    this.loginRedirectTimeout = setTimeout(() => {
      this.isLoadingLogin = false;
      this.router.navigateByUrl(session.homePath);
      this.loginRedirectTimeout = null;
    }, 1400);
  }

  onSubmitRegister(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      return;
    }

    const { email } = this.registerForm.getRawValue();
    this.isRegister = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.registerNotice = 'Cuenta de administrador creada (demo). Ahora inicia sesión.';
    this.loginForm.patchValue({ email, password: '' });
    this.registerForm.reset({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get hasPasswordMismatch(): boolean {
    const confirmPassword = this.registerForm.controls.confirmPassword;
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (confirmPassword.touched || confirmPassword.dirty)
    );
  }

  get hasInvalidCredentials(): boolean {
    const passwordControl = this.loginForm.controls.password;
    return !!passwordControl.errors?.['invalidCredentials'] &&
      (passwordControl.touched || passwordControl.dirty);
  }

  ngOnDestroy(): void {
    if (this.loginRedirectTimeout) {
      clearTimeout(this.loginRedirectTimeout);
      this.loginRedirectTimeout = null;
    }
  }
}

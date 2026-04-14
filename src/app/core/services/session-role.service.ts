import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type AppRole = 'admin' | 'user' | 'expediente' | null;
export type AppModule = 'evaluaciones' | 'expediente';

export interface AppSessionUser {
  email: string;
  name: string;
  role: Exclude<AppRole, null>;
  module: AppModule;
  homePath: string;
}

type DemoAccount = AppSessionUser & {
  password: string;
};

const DEMO_ACCOUNTS: Record<Exclude<AppRole, null>, DemoAccount> = {
  admin: {
    email: 'roberto@evaluaciones.com',
    name: 'Roberto Salazar',
    role: 'admin',
    module: 'evaluaciones',
    homePath: '/dashboard',
    password: '12345',
  },
  user: {
    email: 'adrian@moontest.mx',
    name: 'Adrian Molina',
    role: 'user',
    module: 'evaluaciones',
    homePath: '/evaluaciones/usuario/mis-evaluaciones',
    password: '12345',
  },
  expediente: {
    email: 'diego@expediente.com',
    name: 'Diego Herrera',
    role: 'expediente',
    module: 'expediente',
    homePath: '/expediente/dashboard',
    password: '12345',
  },
};

@Injectable({ providedIn: 'root' })
export class SessionRoleService {
  private readonly roleStorageKey = 'app_role';
  private readonly sessionStorageKey = 'app_session';
  private readonly sessionSubject = new BehaviorSubject<AppSessionUser | null>(
    this.readSessionFromStorage(),
  );
  private readonly roleSubject = new BehaviorSubject<AppRole>(
    this.sessionSubject.value?.role ?? null,
  );

  readonly role$: Observable<AppRole> = this.roleSubject.asObservable();
  readonly session$: Observable<AppSessionUser | null> =
    this.sessionSubject.asObservable();

  getRole(): AppRole {
    return this.roleSubject.value;
  }

  getSession(): AppSessionUser | null {
    return this.sessionSubject.value;
  }

  getHomePath(fallbackPath = '/login-admin'): string {
    return this.sessionSubject.value?.homePath ?? fallbackPath;
  }

  setRole(role: AppRole): void {
    if (role === null) {
      this.clearRole();
      return;
    }

    this.setSession(this.createSessionFromRole(role));
  }

  setSession(session: AppSessionUser | null): void {
    if (session === null) {
      localStorage.removeItem(this.sessionStorageKey);
      localStorage.removeItem(this.roleStorageKey);
      this.sessionSubject.next(null);
      this.roleSubject.next(null);
      return;
    }

    localStorage.setItem(this.sessionStorageKey, JSON.stringify(session));
    localStorage.setItem(this.roleStorageKey, session.role);
    this.sessionSubject.next(session);
    this.roleSubject.next(session.role);
  }

  authenticateAdminCredentials(
    email: string,
    password: string,
  ): AppSessionUser | null {
    const normalizedEmail = email.trim().toLowerCase();

    const account = Object.values(DEMO_ACCOUNTS).find(
      (item) =>
        item.role !== 'user' &&
        item.email === normalizedEmail &&
        item.password === password,
    );

    if (!account) {
      return null;
    }

    const session = this.toSession(account);
    this.setSession(session);
    return session;
  }

  clearRole(): void {
    this.setSession(null);
  }

  private readSessionFromStorage(): AppSessionUser | null {
    const rawSession = localStorage.getItem(this.sessionStorageKey);

    if (rawSession) {
      try {
        const parsedSession = JSON.parse(rawSession) as Partial<AppSessionUser>;
        if (
          parsedSession.role === 'admin' ||
          parsedSession.role === 'user' ||
          parsedSession.role === 'expediente'
        ) {
          return this.createSessionFromRole(parsedSession.role);
        }
      } catch {
        localStorage.removeItem(this.sessionStorageKey);
      }
    }

    const legacyRole = this.readRoleFromStorage();
    return legacyRole ? this.createSessionFromRole(legacyRole) : null;
  }

  private readRoleFromStorage(): AppRole {
    const rawRole = localStorage.getItem(this.roleStorageKey);
    if (
      rawRole === 'admin' ||
      rawRole === 'user' ||
      rawRole === 'expediente'
    ) {
      return rawRole;
    }

    return null;
  }

  private createSessionFromRole(role: Exclude<AppRole, null>): AppSessionUser {
    return this.toSession(DEMO_ACCOUNTS[role]);
  }

  private toSession(account: DemoAccount): AppSessionUser {
    return {
      email: account.email,
      name: account.name,
      role: account.role,
      module: account.module,
      homePath: account.homePath,
    };
  }
}

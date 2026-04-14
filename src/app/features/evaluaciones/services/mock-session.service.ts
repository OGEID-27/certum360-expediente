import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DemoRole = 'ADMIN' | 'USUARIO';

interface SessionState {
  currentUserId: string;
  role: DemoRole;
}

@Injectable({ providedIn: 'root' })
export class MockSessionService {
  private readonly storageKey = 'dynEval.session.v1';
  private readonly defaultState: SessionState = {
    currentUserId: 'user1',
    role: 'ADMIN',
  };

  readonly users = ['user1', 'user2'] as const;
  private readonly stateSubject = new BehaviorSubject<SessionState>(this.readStateFromStorage());
  readonly sessionState$ = this.stateSubject.asObservable();

  get role(): DemoRole {
    return this.stateSubject.value.role;
  }

  get currentUserId(): string {
    return this.stateSubject.value.currentUserId;
  }

  setRole(role: DemoRole): void {
    this.updateState({ role });
  }

  setCurrentUserId(userId: string): void {
    const safeUserId = this.users.includes(userId as (typeof this.users)[number])
      ? userId
      : this.defaultState.currentUserId;

    this.updateState({ currentUserId: safeUserId });
  }

  private updateState(partial: Partial<SessionState>): void {
    const nextState: SessionState = {
      ...this.stateSubject.value,
      ...partial,
    };

    this.writeState(nextState);
    this.stateSubject.next(nextState);
  }

  private readStateFromStorage(): SessionState {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.writeState(this.defaultState);
      return this.defaultState;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SessionState>;
      const role = parsed.role === 'USUARIO' ? 'USUARIO' : 'ADMIN';
      const currentUserId =
        typeof parsed.currentUserId === 'string' &&
        this.users.includes(parsed.currentUserId as (typeof this.users)[number])
          ? parsed.currentUserId
          : this.defaultState.currentUserId;

      const safeState: SessionState = { role, currentUserId };
      this.writeState(safeState);
      return safeState;
    } catch {
      this.writeState(this.defaultState);
      return this.defaultState;
    }
  }

  private writeState(state: SessionState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}


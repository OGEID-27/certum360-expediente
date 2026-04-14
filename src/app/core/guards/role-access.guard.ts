import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';
import { AppRole, SessionRoleService } from '../services/session-role.service';

function getAllowedRoles(
  route: ActivatedRouteSnapshot,
): Array<Exclude<AppRole, null>> {
  return (route.data?.['roles'] as Array<Exclude<AppRole, null>> | undefined) ?? [];
}

function resolveHomeTree(): UrlTree {
  const router = inject(Router);
  const sessionRoleService = inject(SessionRoleService);

  return router.parseUrl(sessionRoleService.getHomePath());
}

export const roleAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const router = inject(Router);
  const sessionRoleService = inject(SessionRoleService);
  const currentRole = sessionRoleService.getRole();
  const allowedRoles = getAllowedRoles(route);

  if (currentRole === null) {
    return router.createUrlTree(['/login-admin']);
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(currentRole)) {
    return true;
  }

  return resolveHomeTree();
};

export const loginRedirectGuard: CanActivateFn = () => {
  const sessionRoleService = inject(SessionRoleService);

  if (sessionRoleService.getRole() === null) {
    return true;
  }

  return resolveHomeTree();
};

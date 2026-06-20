import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../common/decorators';
import { Role } from '../common/enums';

export const PERMISSIONS_KEY = 'requiredPermissions';
/** Require one or more permission keys on a route. */
export const RequirePermissions = (...keys: string[]) =>
  SetMetadata(PERMISSIONS_KEY, keys);

/**
 * Enforces @RequirePermissions() against the permissions resolved onto
 * req.user by JwtStrategy. Super admins always pass.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as
      | (AuthUser & { permissions?: string[] })
      | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.role === Role.SUPER_ADMIN) return true;

    const granted = new Set(user.permissions ?? []);
    const missing = required.filter((k) => !granted.has(k));
    if (missing.length) {
      throw new ForbiddenException(
        `Missing permission: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}

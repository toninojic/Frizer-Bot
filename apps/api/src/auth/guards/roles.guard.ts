import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.getRequiredRoles(context);

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private getRequiredRoles(context: ExecutionContext): UserRole[] {
    const reflector = Reflect as typeof Reflect & {
      getMetadata?: (key: string, target: object) => UserRole[] | undefined;
    };

    const handlerRoles =
      reflector.getMetadata?.(ROLES_KEY, context.getHandler()) ?? [];
    const classRoles =
      reflector.getMetadata?.(ROLES_KEY, context.getClass()) ?? [];

    return [...classRoles, ...handlerRoles];
  }
}

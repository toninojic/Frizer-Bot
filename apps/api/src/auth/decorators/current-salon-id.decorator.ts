import {
  ForbiddenException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth.types';

export const CurrentSalonId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
    }>();

    if (!request.user.salonId) {
      throw new ForbiddenException('Salon access required');
    }

    return request.user.salonId;
  },
);

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        email: true,
        role: true,
        salonId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const roleConfigurationIsInvalid =
      (user.role === UserRole.PLATFORM_ADMIN && user.salonId !== null) ||
      (user.role === UserRole.SALON_OWNER && user.salonId === null);

    if (
      roleConfigurationIsInvalid ||
      user.role !== payload.role ||
      user.salonId !== payload.salonId
    ) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

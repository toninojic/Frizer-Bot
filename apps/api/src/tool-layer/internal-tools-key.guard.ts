import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalToolsKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expectedKey = this.configService.get<string>('internalTools.apiKey');

    if (!expectedKey) {
      throw new UnauthorizedException('INTERNAL_TOOLS_API_KEY_NOT_CONFIGURED');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const providedKey = request.headers['x-internal-tools-key'];
    const value = Array.isArray(providedKey) ? providedKey[0] : providedKey;

    if (!value || value !== expectedKey) {
      throw new UnauthorizedException('INVALID_INTERNAL_TOOLS_KEY');
    }

    return true;
  }
}

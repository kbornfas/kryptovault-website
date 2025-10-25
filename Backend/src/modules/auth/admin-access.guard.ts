import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user || !user.email) {
      return false;
    }

    const allowedEmail = (this.configService.get<string>('ADMIN_EMAIL') || 'admin@kryptovault.local').toLowerCase();

    return user.email.toLowerCase() === allowedEmail;
  }
}

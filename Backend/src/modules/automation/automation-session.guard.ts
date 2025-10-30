import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { AutomationService } from './automation.service';

@Injectable()
export class AutomationSessionOwnerGuard implements CanActivate {
  constructor(private readonly automationService: AutomationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const sessionId = request.body?.sessionId ?? request.params?.sessionId ?? request.query?.sessionId;

    if (!sessionId) {
      return true;
    }

    const session = await this.automationService.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Automation session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this automation session');
    }

    return true;
  }
}
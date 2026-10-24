import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class BusinessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.businessId || !['owner', 'staff'].includes(user.role)) {
      throw new ForbiddenException('Restaurant staff access required');
    }
    return true;
  }
}

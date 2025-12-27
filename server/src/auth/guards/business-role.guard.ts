import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { BusinessesService } from '../../businesses/businesses.service';
import { Reflector } from '@nestjs/core';

export const BUSINESS_ROLES_KEY = 'business_roles';
export const RequireBusinessRoles = (...roles: Array<'owner' | 'member' | 'accountant'>) => {
  return SetMetadata(BUSINESS_ROLES_KEY, roles);
};

@Injectable()
export class BusinessRoleGuard implements CanActivate {
  constructor(
    private businessesService: BusinessesService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    const businessId = req.params?.businessId || req.params?.id;

    if (!userId || !businessId) {
      throw new ForbiddenException('Missing business scope');
    }

    const required = (this.reflector.getAllAndOverride(BUSINESS_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || []) as Array<'owner' | 'member' | 'accountant'>;

    const role = await this.businessesService.getMemberRole(businessId, userId);
    if (!role) {
      throw new ForbiddenException('You do not have access to this business');
    }

    req.businessRole = role;

    if (required.length === 0) return true;
    if (required.includes(role)) return true;

    throw new ForbiddenException('Insufficient role for this action');
  }
}



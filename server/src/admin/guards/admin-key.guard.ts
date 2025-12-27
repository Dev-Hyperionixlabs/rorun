import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminService } from '../admin.service';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];

    if (!adminKey || typeof adminKey !== 'string' || !this.adminService.validateAdminKey(adminKey)) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}



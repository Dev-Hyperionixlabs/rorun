import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlansService } from '../plans.service';
import { PlanFeatureKey } from '../plan.types';

export const FEATURE_KEY_METADATA = 'featureKey';

export const RequireFeature = (featureKey: PlanFeatureKey) =>
  SetMetadata(FEATURE_KEY_METADATA, featureKey);

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly plansService: PlansService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const businessId = request.params.businessId || request.params.id;
    
    const featureKey = this.reflector.get<PlanFeatureKey>(
      FEATURE_KEY_METADATA,
      context.getHandler(),
    );

    if (!featureKey) {
      // No feature requirement, allow access
      return true;
    }

    if (!user || !businessId) {
      throw new ForbiddenException('Authentication required');
    }

    const hasFeature = await this.plansService.hasFeature(
      user.id,
      businessId,
      featureKey,
    );

    if (!hasFeature) {
      const effectivePlan = await this.plansService.getEffectivePlan(
        user.id,
        businessId,
      );
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        message: `Feature '${featureKey}' is not available in your current plan`,
        featureKey,
        requiredPlan: effectivePlan?.planId || null,
      });
    }

    return true;
  }
}


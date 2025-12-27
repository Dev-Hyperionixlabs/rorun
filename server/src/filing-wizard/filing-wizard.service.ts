import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PlansService } from '../plans/plans.service';
import { FilingPacksService } from '../filing-packs/filing-packs.service';
import {
  FilingWizardCompute,
  FilingRunAnswers,
  FilingRunComputed,
} from './filing-wizard.compute';

const STEP_SEQUENCE = [
  'confirm_business',
  'income',
  'expenses',
  'evidence',
  'review',
] as const;

type Step = typeof STEP_SEQUENCE[number];

@Injectable()
export class FilingWizardService {
  private compute: FilingWizardCompute;

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly plansService: PlansService,
    private readonly filingPacksService: FilingPacksService,
  ) {
    this.compute = new FilingWizardCompute(this.prisma);
  }

  async startRun(
    businessId: string,
    userId: string,
    taxYear: number,
    kind: string = 'annual_return_prep',
  ) {
    await this.businessesService.findOne(businessId, userId);

    // Check plan feature
    const hasFeature = await this.plansService.hasFeature(
      userId,
      businessId,
      'yearEndFilingPack',
    );

    if (!hasFeature) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Filing wizard requires Basic plan or higher',
        featureKey: 'yearEndFilingPack',
      });
    }

    // Check if run exists and is resumable
    const existing = await this.prisma.filingRun.findUnique({
      where: {
        businessId_taxYear_kind: {
          businessId,
          taxYear,
          kind,
        },
      },
    });

    if (existing && (existing.status === 'in_progress' || existing.status === 'ready')) {
      // Recompute and return existing run
      const computed = await this.compute.compute(
        businessId,
        taxYear,
        existing.answersJson as FilingRunAnswers,
      );
      return {
        ...existing,
        computedJson: computed,
      };
    }

    // Create new run
    const run = await this.prisma.filingRun.create({
      data: {
        businessId,
        taxYear,
        kind,
        status: 'in_progress',
        currentStep: 'confirm_business',
        answersJson: {},
        createdByUserId: userId,
      },
    });

    const computed = await this.compute.compute(businessId, taxYear, {});

    return {
      ...run,
      computedJson: computed,
    };
  }

  async getRun(
    businessId: string,
    userId: string,
    taxYear: number,
    kind: string = 'annual_return_prep',
  ) {
    await this.businessesService.findOne(businessId, userId);

    const run = await this.prisma.filingRun.findUnique({
      where: {
        businessId_taxYear_kind: {
          businessId,
          taxYear,
          kind,
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Filing run not found');
    }

    const computed = await this.compute.compute(
      businessId,
      taxYear,
      run.answersJson as FilingRunAnswers,
    );

    // Update lastViewedAt
    await this.prisma.filingRun.update({
      where: { id: run.id },
      data: { lastViewedAt: new Date() },
    });

    return {
      ...run,
      computedJson: computed,
    };
  }

  async updateStep(
    businessId: string,
    userId: string,
    taxYear: number,
    kind: string,
    step: string,
    answersPatch: Partial<FilingRunAnswers>,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const run = await this.prisma.filingRun.findUnique({
      where: {
        businessId_taxYear_kind: {
          businessId,
          taxYear,
          kind,
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Filing run not found');
    }

    // Validate step sequence
    const currentStepIndex = STEP_SEQUENCE.indexOf(run.currentStep as Step);
    const requestedStepIndex = STEP_SEQUENCE.indexOf(step as Step);

    if (requestedStepIndex === -1) {
      throw new BadRequestException(`Invalid step: ${step}`);
    }

    if (requestedStepIndex < currentStepIndex) {
      // Allow going back
    } else if (requestedStepIndex > currentStepIndex + 1) {
      throw new BadRequestException('Cannot skip steps');
    }

    // Deep merge answers
    const currentAnswers = (run.answersJson || {}) as FilingRunAnswers;
    const updatedAnswers: FilingRunAnswers = {
      ...currentAnswers,
      ...answersPatch,
    };

    // Recompute
    const computed = await this.compute.compute(businessId, taxYear, updatedAnswers);

    // Determine next step
    let nextStep = run.currentStep;
    if (requestedStepIndex >= currentStepIndex) {
      // If moving forward, advance to next step
      const nextStepIndex = Math.min(requestedStepIndex + 1, STEP_SEQUENCE.length - 1);
      nextStep = STEP_SEQUENCE[nextStepIndex];
    } else {
      // If going back, update to requested step
      nextStep = step;
    }

    // Update run
    const updated = await this.prisma.filingRun.update({
      where: { id: run.id },
      data: {
        currentStep: nextStep,
        answersJson: updatedAnswers as any,
        computedJson: computed as any,
        lastViewedAt: new Date(),
      },
    });

    return {
      ...updated,
      computedJson: computed,
    };
  }

  async completeRun(
    businessId: string,
    userId: string,
    taxYear: number,
    kind: string = 'annual_return_prep',
  ) {
    await this.businessesService.findOne(businessId, userId);

    const run = await this.prisma.filingRun.findUnique({
      where: {
        businessId_taxYear_kind: {
          businessId,
          taxYear,
          kind,
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Filing run not found');
    }

    // Validate all steps are complete
    if (run.currentStep !== 'review') {
      throw new BadRequestException('All steps must be completed before marking as ready');
    }

    // Update status to ready
    const updated = await this.prisma.filingRun.update({
      where: { id: run.id },
      data: {
        status: 'ready',
        lastViewedAt: new Date(),
      },
    });

    // Trigger filing pack generation
    try {
      await this.filingPacksService.generatePack(businessId, userId, taxYear);
    } catch (error) {
      // Log error but don't fail the completion
      console.error('Failed to trigger filing pack generation:', error);
    }

    const computed = await this.compute.compute(
      businessId,
      taxYear,
      updated.answersJson as FilingRunAnswers,
    );

    return {
      run: {
        ...updated,
        computedJson: computed,
      },
      filingPackQueued: true,
    };
  }
}


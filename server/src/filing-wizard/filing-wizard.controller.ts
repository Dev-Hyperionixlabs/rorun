import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilingWizardService } from './filing-wizard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard, RequireFeature } from '../plans/guards/plan-feature.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import {
  StartFilingWizardDto,
  GetFilingRunDto,
  UpdateStepDto,
  CompleteFilingRunDto,
} from './dto/filing-wizard.dto';

@ApiTags('filing-wizard')
@Controller('businesses/:businessId/filing-wizard')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequireFeature('yearEndFilingPack')
@ApiBearerAuth()
export class FilingWizardController {
  constructor(private readonly filingWizardService: FilingWizardService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start or resume a filing wizard run' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async start(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: StartFilingWizardDto,
  ) {
    return this.filingWizardService.startRun(
      businessId,
      req.user.id,
      dto.taxYear,
      dto.kind || 'annual_return_prep',
    );
  }

  @Get('run')
  @ApiOperation({ summary: 'Get current filing wizard run' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async getRun(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query() query: GetFilingRunDto,
  ) {
    const taxYear = query.taxYear || new Date().getFullYear();
    return this.filingWizardService.getRun(
      businessId,
      req.user.id,
      taxYear,
      query.kind || 'annual_return_prep',
    );
  }

  @Post('step')
  @ApiOperation({ summary: 'Update wizard step and answers' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async updateStep(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: UpdateStepDto,
  ) {
    return this.filingWizardService.updateStep(
      businessId,
      req.user.id,
      dto.taxYear,
      dto.kind,
      dto.step,
      dto.answersPatch || {},
    );
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete wizard and trigger filing pack generation' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async complete(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CompleteFilingRunDto,
  ) {
    return this.filingWizardService.completeRun(
      businessId,
      req.user.id,
      dto.taxYear,
      dto.kind || 'annual_return_prep',
    );
  }
}


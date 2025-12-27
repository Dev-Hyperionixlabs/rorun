import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { TaxRulesService } from './tax-rules.service';
import { AdminKeyGuard } from '../admin/guards/admin-key.guard';
import {
  CreateTaxRuleSetDto,
  UpdateTaxRuleSetDto,
  CreateTaxRuleDto,
  CreateDeadlineTemplateDto,
  TestEvaluationDto,
} from './dto/tax-rules.dto';

@ApiTags('admin-tax-rules')
@Controller('admin/tax-rules')
@UseGuards(AdminKeyGuard)
@ApiHeader({ name: 'x-admin-key', required: true })
export class TaxRulesAdminController {
  constructor(private readonly taxRulesService: TaxRulesService) {}

  @Get('rule-sets')
  @ApiOperation({ summary: 'List all tax rule sets' })
  async getAllRuleSets() {
    return this.taxRulesService.getAllRuleSets();
  }

  @Get('rule-sets/:id')
  @ApiOperation({ summary: 'Get tax rule set with rules and templates' })
  async getRuleSet(@Param('id') id: string) {
    return this.taxRulesService.getRuleSet(id);
  }

  @Post('rule-sets')
  @ApiOperation({ summary: 'Create new tax rule set' })
  async createRuleSet(@Body() dto: CreateTaxRuleSetDto) {
    return this.taxRulesService.createRuleSet({
      ...dto,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });
  }

  @Put('rule-sets/:id')
  @ApiOperation({ summary: 'Update tax rule set' })
  async updateRuleSet(
    @Param('id') id: string,
    @Body() dto: UpdateTaxRuleSetDto,
  ) {
    return this.taxRulesService.updateRuleSet(id, {
      ...dto,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });
  }

  @Post('rule-sets/:ruleSetId/rules')
  @ApiOperation({ summary: 'Create tax rule' })
  async createRule(
    @Param('ruleSetId') ruleSetId: string,
    @Body() dto: CreateTaxRuleDto,
  ) {
    return this.taxRulesService.createRule(ruleSetId, dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update tax rule' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaxRuleDto>,
  ) {
    return this.taxRulesService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete tax rule' })
  async deleteRule(@Param('id') id: string) {
    return this.taxRulesService.deleteRule(id);
  }

  @Post('rule-sets/:ruleSetId/deadline-templates')
  @ApiOperation({ summary: 'Create deadline template' })
  async createDeadlineTemplate(
    @Param('ruleSetId') ruleSetId: string,
    @Body() dto: CreateDeadlineTemplateDto,
  ) {
    return this.taxRulesService.createDeadlineTemplate(ruleSetId, dto);
  }

  @Put('deadline-templates/:id')
  @ApiOperation({ summary: 'Update deadline template' })
  async updateDeadlineTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDeadlineTemplateDto>,
  ) {
    return this.taxRulesService.updateDeadlineTemplate(id, dto);
  }

  @Delete('deadline-templates/:id')
  @ApiOperation({ summary: 'Delete deadline template' })
  async deleteDeadlineTemplate(@Param('id') id: string) {
    return this.taxRulesService.deleteDeadlineTemplate(id);
  }

  @Post('rule-sets/:ruleSetId/test')
  @ApiOperation({ summary: 'Test evaluation with sample business profile' })
  async testEvaluation(
    @Param('ruleSetId') ruleSetId: string,
    @Body() dto: TestEvaluationDto,
  ) {
    return this.taxRulesService.testEvaluation(
      ruleSetId,
      dto.businessProfile,
      dto.taxYear,
    );
  }
}


import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ComplianceTasksService } from './compliance-tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskQueryDto, AddEvidenceDto } from './dto/compliance-task.dto';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('compliance-tasks')
@Controller('businesses/:businessId/compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceTasksController {
  constructor(private readonly complianceTasksService: ComplianceTasksService) {}

  @Get('tasks')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Get compliance tasks for a business' })
  async getTasks(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query() query: TaskQueryDto,
  ) {
    return this.complianceTasksService.findAll(businessId, req.user.id, query);
  }

  @Get('tasks/:taskId')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiOperation({ summary: 'Get a specific compliance task' })
  async getTask(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Request() req,
  ) {
    return this.complianceTasksService.findOne(taskId, businessId, req.user.id);
  }

  @Post('tasks/:taskId/start')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiOperation({ summary: 'Start a compliance task' })
  async startTask(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complianceTasksService.startTask(taskId, businessId, req.user.id, ip, userAgent);
  }

  @Post('tasks/:taskId/complete')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiOperation({ summary: 'Complete a compliance task' })
  async completeTask(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complianceTasksService.completeTask(taskId, businessId, req.user.id, ip, userAgent);
  }

  @Post('tasks/:taskId/dismiss')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiOperation({ summary: 'Dismiss a compliance task' })
  async dismissTask(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complianceTasksService.dismissTask(taskId, businessId, req.user.id, ip, userAgent);
  }

  @Post('tasks/:taskId/evidence')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiOperation({ summary: 'Add evidence document to a task' })
  async addEvidence(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Request() req,
    @Body() dto: AddEvidenceDto,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complianceTasksService.addEvidence(taskId, businessId, req.user.id, dto, ip, userAgent);
  }

  @Delete('tasks/:taskId/evidence/:linkId')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'linkId', description: 'Evidence link ID' })
  @ApiOperation({ summary: 'Remove evidence document from a task' })
  async removeEvidence(
    @Param('businessId') businessId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complianceTasksService.removeEvidence(taskId, linkId, businessId, req.user.id, ip, userAgent);
  }

  @Post('regenerate')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Regenerate compliance tasks for a business' })
  async regenerateTasks(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('taxYear') taxYear?: number,
  ) {
    return this.complianceTasksService.regenerateTasks(businessId, req.user.id, taxYear);
  }
}


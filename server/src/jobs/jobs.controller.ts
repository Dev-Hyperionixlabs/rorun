import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@ApiTags('jobs')
@Controller('businesses/:businessId/jobs')
@UseGuards(JwtAuthGuard, BusinessRoleGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'Create a job' })
  async create(@Param('businessId') businessId: string, @Request() req: any, @Body() dto: CreateJobDto) {
    return this.jobsService.create(businessId, req.user.id, dto);
  }

  @Get()
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'List jobs' })
  async list(@Param('businessId') businessId: string, @Request() req: any) {
    return this.jobsService.list(businessId, req.user.id);
  }

  @Get(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiOperation({ summary: 'Get job' })
  async get(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any) {
    return this.jobsService.get(businessId, req.user.id, id);
  }

  @Put(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiOperation({ summary: 'Update job' })
  async update(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(businessId, req.user.id, id, dto);
  }

  @Delete(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiOperation({ summary: 'Delete job' })
  async remove(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any) {
    return this.jobsService.remove(businessId, req.user.id, id);
  }
}



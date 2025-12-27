import {
  Controller,
  Get,
  Post,
  Param,
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
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateImportDto, ApproveImportDto } from './dto/import.dto';

@ApiTags('imports')
@Controller('businesses/:businessId/imports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Create a new import batch' })
  async create(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CreateImportDto,
  ) {
    return this.importsService.createImport(businessId, req.user.id, dto);
  }

  @Post(':id/parse')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiOperation({ summary: 'Parse import batch (enqueues job if needed)' })
  async parse(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.importsService.parseImport(id, businessId, req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiOperation({ summary: 'Get import batch with lines' })
  async findOne(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.importsService.getImport(id, businessId, req.user.id);
  }

  @Post(':id/approve')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiOperation({ summary: 'Approve import and create transactions' })
  async approve(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ApproveImportDto,
  ) {
    return this.importsService.approveImport(id, businessId, req.user.id, dto);
  }

  @Post(':id/rollback')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiOperation({ summary: 'Rollback import batch and delete transactions' })
  async rollback(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.importsService.rollbackImport(id, businessId, req.user.id);
  }
}


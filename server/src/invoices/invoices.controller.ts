import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

@ApiTags('invoices')
@Controller('businesses/:businessId/invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(businessId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices for a business' })
  async findAll(@Param('businessId') businessId: string, @Request() req) {
    return this.invoicesService.findAll(businessId, req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.invoicesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Update invoice' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, req.user.id, dto);
  }
}


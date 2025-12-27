import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard, RequireFeature } from '../plans/guards/plan-feature.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

@ApiTags('transactions')
@Controller('businesses/:businessId/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  async create(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(businessId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for a business' })
  async findAll(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(businessId, req.user.id, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List transaction categories' })
  async listCategories(@Param('businessId') businessId: string, @Request() req) {
    return this.transactionsService.listCategories(businessId, req.user.id);
  }

  @Get('export')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @UseGuards(PlanFeatureGuard)
  @RequireFeature('exportTransactions')
  @ApiOperation({ summary: 'Export transactions as CSV' })
  async export(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query() query: TransactionQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.transactionsService.exportTransactions(
      businessId,
      req.user.id,
      query,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transactions-${businessId}-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(result.csv);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiOperation({ summary: 'Update transaction' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiOperation({ summary: 'Delete transaction' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.transactionsService.remove(id, req.user.id);
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewService } from './review.service';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('review')
@Controller('businesses/:businessId/review')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('issues')
  @ApiOperation({ summary: 'List review issues' })
  async list(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('taxYear') taxYear?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const year = taxYear ? parseInt(taxYear, 10) : new Date().getFullYear();
    return this.reviewService.listIssues(businessId, req.user.id, year, { status, type });
  }

  @Get('issues/:id')
  @ApiOperation({ summary: 'Get issue with details' })
  async getOne(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req) {
    return this.reviewService.getIssueWithDetails(businessId, req.user.id, id);
  }

  @Post('issues/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss an issue' })
  async dismiss(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req) {
    return this.reviewService.dismissIssue(businessId, req.user.id, id);
  }

  @Post('rescan')
  @ApiOperation({ summary: 'Re-scan issues for a tax year' })
  async rescan(@Param('businessId') businessId: string, @Request() req, @Query('taxYear') taxYear?: string) {
    const year = taxYear ? parseInt(taxYear, 10) : new Date().getFullYear();
    return this.reviewService.rescan(businessId, req.user.id, year);
  }

  @Post('transactions/bulk-classify')
  @ApiOperation({ summary: 'Bulk classify transactions (business/personal/unknown)' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async bulkClassify(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body: { transactionIds: string[]; classification: 'business' | 'personal' | 'unknown' },
  ) {
    return this.reviewService.bulkClassify(businessId, req.user.id, body.transactionIds || [], body.classification);
  }

  @Post('transactions/bulk-categorize')
  @ApiOperation({ summary: 'Bulk categorize transactions' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async bulkCategorize(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body: { transactionIds: string[]; categoryId: string | null },
  ) {
    return this.reviewService.bulkCategorize(businessId, req.user.id, body.transactionIds || [], body.categoryId ?? null);
  }

  @Post('transactions/:id/override')
  @ApiOperation({ summary: 'Override a single transaction' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  async override(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
    @Body() body: { classification?: 'business' | 'personal' | 'unknown'; categoryId?: string | null; note?: string | null },
  ) {
    return this.reviewService.upsertOverrideAndMaterialize(businessId, req.user.id, id, body);
  }
}



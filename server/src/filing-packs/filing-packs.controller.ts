import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilingPacksService } from './filing-packs.service';
import { StorageService } from '../storage/storage.service';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('filing-packs')
@Controller('businesses/:businessId/filing-pack')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilingPacksController {
  constructor(
    private readonly filingPacksService: FilingPacksService,
    private readonly storageService: StorageService,
  ) {}

  @Get('status')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiQuery({ name: 'taxYear', required: false, type: Number })
  @ApiOperation({ summary: 'Get latest filing pack status for a tax year' })
  async getStatus(
    @Param('businessId') businessId: string,
    @Query('taxYear') taxYear: string,
    @Request() req,
  ) {
    const year = taxYear ? parseInt(taxYear, 10) : new Date().getFullYear();
    const pack = await this.filingPacksService.getStatus(businessId, req.user.id, year);

    if (!pack) {
      return { pack: null };
    }

    // Generate signed URLs
    const result: any = {
      ...pack,
      pdfUrl: pack.pdfDocument
        ? await this.storageService.getSignedDownloadUrl(pack.pdfDocument.storageUrl, 3600)
        : null,
      csvUrl: pack.csvDocument
        ? await this.storageService.getSignedDownloadUrl(pack.csvDocument.storageUrl, 3600)
        : null,
      zipUrl: pack.zipDocument
        ? await this.storageService.getSignedDownloadUrl(pack.zipDocument.storageUrl, 3600)
        : null,
    };

    return { pack: result };
  }

  @Get('history')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiQuery({ name: 'taxYear', required: false, type: Number })
  @ApiOperation({ summary: 'Get filing pack history for a tax year' })
  async getHistory(
    @Param('businessId') businessId: string,
    @Query('taxYear') taxYear: string,
    @Request() req,
  ) {
    const year = taxYear ? parseInt(taxYear, 10) : new Date().getFullYear();
    const packs = await this.filingPacksService.getHistory(businessId, req.user.id, year);

    // Generate signed URLs for each pack
    const packsWithUrls = await Promise.all(
      packs.map(async (pack) => ({
        ...pack,
        pdfUrl: pack.pdfDocument
          ? await this.storageService.getSignedDownloadUrl(pack.pdfDocument.storageUrl, 3600)
          : null,
        csvUrl: pack.csvDocument
          ? await this.storageService.getSignedDownloadUrl(pack.csvDocument.storageUrl, 3600)
          : null,
        zipUrl: pack.zipDocument
          ? await this.storageService.getSignedDownloadUrl(pack.zipDocument.storageUrl, 3600)
          : null,
      })),
    );

    return { packs: packsWithUrls };
  }

  @Post('generate')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Generate a new filing pack' })
  async generate(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body: { taxYear?: number },
  ) {
    const taxYear = body.taxYear || new Date().getFullYear();
    const pack = await this.filingPacksService.generatePack(businessId, req.user.id, taxYear);
    return { packId: pack.id, status: pack.status };
  }

  @Post(':id/regenerate')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Filing Pack ID' })
  @ApiOperation({ summary: 'Regenerate a filing pack (creates new version)' })
  async regenerate(
    @Param('businessId') businessId: string,
    @Param('id') packId: string,
    @Request() req,
  ) {
    const pack = await this.filingPacksService.regeneratePack(packId, businessId, req.user.id);
    return { packId: pack.id, status: pack.status };
  }

  @Get(':id/download/:type')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'id', description: 'Filing Pack ID' })
  @ApiParam({ name: 'type', description: 'Document type: pdf, csv, or zip' })
  @ApiOperation({ summary: 'Get download URL for a filing pack document' })
  async download(
    @Param('businessId') businessId: string,
    @Param('id') packId: string,
    @Param('type') type: 'pdf' | 'csv' | 'zip',
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.filingPacksService.getDownloadUrl(
      businessId,
      req.user.id,
      packId,
      type,
    );

    const signedUrl = await this.storageService.getSignedDownloadUrl(result.url, 3600);
    res.redirect(signedUrl);
  }
}

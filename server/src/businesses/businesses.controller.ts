import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import { Response } from 'express';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  async create(@Request() req, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all businesses for current user' })
  async findAll(@Request() req) {
    return this.businessesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get business by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.businessesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Update business' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(id, req.user.id, dto);
  }

  @Post(':id/invoice-logo/upload-url')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get signed upload URL for invoice logo (PNG/JPG)' })
  async getInvoiceLogoUploadUrl(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { mimeType: string },
  ) {
    return this.businessesService.createInvoiceLogoUploadUrl(id, req.user.id, body?.mimeType);
  }

  @Post(':id/invoice-logo/upload')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Upload invoice logo via API (CORS-safe fallback)' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoiceLogo(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.businessesService.uploadInvoiceLogoViaApi(id, req.user.id, file);
  }

  @Get(':id/invoice-logo-url')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Resolve invoice logo URL (signed if stored as storage key)' })
  async getInvoiceLogoUrl(@Param('id') id: string, @Request() req) {
    return this.businessesService.getResolvedInvoiceLogoUrl(id, req.user.id);
  }

  @Get(':id/invoice-logo')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Fetch invoice logo bytes (authenticated, CORS-safe)' })
  async getInvoiceLogo(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const business: any = await this.businessesService.findOne(id, req.user.id);
    const stored = (business?.invoiceLogoUrl || '').toString().trim();
    if (!stored || !stored.startsWith('businesses/')) {
      throw new NotFoundException('Invoice logo not found');
    }
    const obj = await this.storageService.getObjectBuffer(stored);
    if (!obj.buffer || obj.buffer.length === 0) {
      throw new NotFoundException('Invoice logo not found');
    }
    res.setHeader('Content-Type', obj.contentType || 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(obj.buffer);
  }
}

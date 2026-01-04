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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('documents')
@Controller('businesses/:businessId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'Get signed URL for document upload' })
  async getUploadUrl(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body: { filename: string; mimeType: string },
  ) {
    return this.documentsService.createUploadUrl(
      businessId,
      req.user.id,
      body.filename,
      body.mimeType,
    );
  }

  @Post()
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'Register uploaded document' })
  async create(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(businessId, req.user.id, dto);
  }

  @Post('upload')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOperation({
    summary:
      'Upload a document via API (fallback when direct-to-storage signed upload is blocked by CORS/content filters)',
  })
  async uploadViaApi(
    @Param('businessId') businessId: string,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { relatedTransactionId?: string; type?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException({ code: 'UPLOAD_MISSING_FILE', message: 'Missing file' });
    }
    const mimeType = file.mimetype;
    const filename = file.originalname || 'upload';
    const relatedTransactionId = body?.relatedTransactionId || undefined;
    const type = body?.type || undefined;
    return this.documentsService.uploadViaApi(businessId, req.user.id, {
      filename,
      mimeType,
      size: file.size,
      buffer: file.buffer,
      relatedTransactionId,
      type,
    });
  }

  @Get()
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiQuery({ name: 'transactionId', required: false })
  @ApiOperation({ summary: 'Get all documents for a business' })
  async findAll(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('transactionId') transactionId?: string,
  ) {
    return this.documentsService.findAll(businessId, req.user.id, transactionId);
  }

  @Get(':id')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOperation({ summary: 'Update document (e.g., link to transaction)' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOperation({ summary: 'Delete document' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id);
  }
}

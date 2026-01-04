import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import * as crypto from 'crypto';
import { scanUploadedObject } from '../security/scan';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private storageService: StorageService,
    private aiService: AiService,
  ) {}

  private readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

  private extForMime(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'pdf';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      default:
        return 'bin';
    }
  }

  private verifyMagicBytes(mimeType: string, header: Buffer): boolean {
    if (mimeType === 'application/pdf') {
      return header.subarray(0, 4).toString('utf8') === '%PDF';
    }
    if (mimeType === 'image/png') {
      const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return header.subarray(0, 8).equals(sig);
    }
    if (mimeType === 'image/jpeg') {
      // JPEG starts with FF D8 FF
      return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    return false;
  }

  async createUploadUrl(businessId: string, userId: string, filename: string, mimeType: string) {
    await this.businessesService.findOne(businessId, userId);

    if (!this.ALLOWED_MIME.has(mimeType)) {
      throw new BadRequestException({
        code: 'UPLOAD_TYPE_NOT_ALLOWED',
        message: 'File type not allowed. Allowed: PDF, JPG, PNG',
      });
    }

    // Prevent path traversal and arbitrary filenames: store as UUID
    const ext = this.extForMime(mimeType);
    const safeId = crypto.randomUUID();
    const key = `businesses/${businessId}/documents/${safeId}.${ext}`;
    const uploadUrl = await this.storageService.getSignedUploadUrl(key, mimeType);

    return {
      uploadUrl,
      key,
    };
  }

  async uploadViaApi(
    businessId: string,
    userId: string,
    input: {
      filename: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
      relatedTransactionId?: string;
      type?: string;
    },
  ) {
    await this.businessesService.findOne(businessId, userId);

    if (!this.ALLOWED_MIME.has(input.mimeType)) {
      throw new BadRequestException({
        code: 'UPLOAD_TYPE_NOT_ALLOWED',
        message: 'File type not allowed. Allowed: PDF, JPG, PNG',
      });
    }
    if (input.size > this.MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'UPLOAD_TOO_LARGE',
        message: `File too large. Max size is ${this.MAX_UPLOAD_BYTES} bytes`,
      });
    }

    const header = input.buffer.subarray(0, 16);
    if (!this.verifyMagicBytes(input.mimeType, header)) {
      throw new BadRequestException({
        code: 'UPLOAD_TYPE_NOT_ALLOWED',
        message: 'File signature does not match allowed types',
      });
    }

    const ext = this.extForMime(input.mimeType);
    const safeId = crypto.randomUUID();
    const key = `businesses/${businessId}/documents/${safeId}.${ext}`;

    // Upload to storage from server side (no browser CORS involved)
    await this.storageService.uploadFile(input.buffer, key, input.mimeType);

    const scan = await scanUploadedObject(key);
    if (!scan.ok) {
      // Best effort cleanup
      await this.storageService.deleteFile(key).catch(() => {});
      throw new BadRequestException({
        code: 'UPLOAD_REJECTED',
        message: ('reason' in scan ? scan.reason : undefined) || 'Upload rejected',
      });
    }

    const docType = input.type || (input.mimeType === 'application/pdf' ? 'bank_statement' : 'receipt');

    const document = await this.prisma.document.create({
      data: {
        businessId,
        type: docType,
        storageUrl: key,
        mimeType: input.mimeType,
        size: input.size,
        relatedTransactionId: input.relatedTransactionId || null,
      } as any,
    });

    // Enqueue OCR job if it's an image
    if (input.mimeType?.startsWith('image/')) {
      this.aiService.processDocument(document.id).catch(console.error);
    }

    return document;
  }

  async create(businessId: string, userId: string, data: CreateDocumentDto) {
    await this.businessesService.findOne(businessId, userId);

    if (!this.ALLOWED_MIME.has(data.mimeType)) {
      throw new BadRequestException({
        code: 'UPLOAD_TYPE_NOT_ALLOWED',
        message: 'File type not allowed. Allowed: PDF, JPG, PNG',
      });
    }

    if (data.size > this.MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'UPLOAD_TOO_LARGE',
        message: `File too large. Max size is ${this.MAX_UPLOAD_BYTES} bytes`,
      });
    }

    // Storage path safety: must match expected prefix
    const prefix = `businesses/${businessId}/documents/`;
    if (!data.storageUrl || !data.storageUrl.startsWith(prefix) || data.storageUrl.includes('..')) {
      throw new BadRequestException({
        code: 'UPLOAD_PATH_INVALID',
        message: 'Invalid storage key',
      });
    }

    // Verify uploaded object exists, size, and magic bytes (deterministic)
    const head = await this.storageService.headObject(data.storageUrl);
    if (!head.contentLength || head.contentLength <= 0) {
      throw new BadRequestException({ code: 'UPLOAD_NOT_FOUND', message: 'Uploaded file not found' });
    }
    if (head.contentLength > this.MAX_UPLOAD_BYTES) {
      throw new BadRequestException({ code: 'UPLOAD_TOO_LARGE', message: 'File too large' });
    }
    const header = await this.storageService.getObjectRange(data.storageUrl, 16);
    if (!this.verifyMagicBytes(data.mimeType, header)) {
      throw new BadRequestException({
        code: 'UPLOAD_TYPE_NOT_ALLOWED',
        message: 'File signature does not match allowed types',
      });
    }

    const scan = await scanUploadedObject(data.storageUrl);
    if (!scan.ok) {
      throw new BadRequestException({
        code: 'UPLOAD_REJECTED',
        message: ('reason' in scan ? scan.reason : undefined) || 'Upload rejected',
      });
    }

    const document = await this.prisma.document.create({
      data: {
        ...data,
        businessId,
      },
    });

    // Enqueue OCR job if it's an image
    if (data.mimeType?.startsWith('image/')) {
      this.aiService.processDocument(document.id).catch(console.error);
    }

    return document;
  }

  async findAll(businessId: string, userId: string, transactionId?: string) {
    await this.businessesService.findOne(businessId, userId);

    const where: any = { businessId };
    if (transactionId) {
      where.relatedTransactionId = transactionId;
    }

    const documents = await this.prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate signed URLs for viewing
    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        viewUrl: await this.storageService.getSignedDownloadUrl(doc.storageUrl),
      })),
    );
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Membership-aware access check (owner/member/accountant)
    await this.businessesService.findOne(document.business.id, userId);

    const viewUrl = await this.storageService.getSignedDownloadUrl(document.storageUrl);

    const { business, ...result } = document;
    void business;
    return { ...result, viewUrl };
  }

  async update(id: string, userId: string, data: UpdateDocumentDto) {
    await this.findOne(id, userId);

    return this.prisma.document.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id, userId);

    // Delete from storage
    await this.storageService.deleteFile(document.storageUrl);

    return this.prisma.document.delete({
      where: { id },
    });
  }
}

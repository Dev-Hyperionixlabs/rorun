import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private storageService: StorageService,
    private aiService: AiService,
  ) {}

  async createUploadUrl(businessId: string, userId: string, filename: string, mimeType: string) {
    await this.businessesService.findOne(businessId, userId);

    const key = `businesses/${businessId}/documents/${Date.now()}-${filename}`;
    const uploadUrl = await this.storageService.getSignedUploadUrl(key, mimeType);

    return {
      uploadUrl,
      key,
    };
  }

  async create(businessId: string, userId: string, data: CreateDocumentDto) {
    await this.businessesService.findOne(businessId, userId);

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
            ownerUserId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.business.ownerUserId !== userId) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const viewUrl = await this.storageService.getSignedDownloadUrl(document.storageUrl);

    const { business, ...result } = document;
    return {
      ...result,
      viewUrl,
    };
  }

  async update(id: string, userId: string, data: UpdateDocumentDto) {
    const document = await this.findOne(id, userId);

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


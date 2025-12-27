import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PlansService } from '../plans/plans.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class FilingPacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly plansService: PlansService,
    @InjectQueue('filing-pack') private filingPackQueue: Queue,
  ) {}

  async getStatus(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);

    const pack = await this.prisma.filingPack.findFirst({
      where: { businessId, taxYear },
      orderBy: { version: 'desc' },
      include: {
        pdfDocument: {
          select: {
            id: true,
            storageUrl: true,
            mimeType: true,
            size: true,
          },
        },
        csvDocument: {
          select: {
            id: true,
            storageUrl: true,
            mimeType: true,
            size: true,
          },
        },
        zipDocument: {
          select: {
            id: true,
            storageUrl: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    if (!pack) {
      return null;
    }

    // Generate signed URLs if documents exist
    const result: any = {
      ...pack,
      pdfUrl: null,
      csvUrl: null,
      zipUrl: null,
    };

    // Note: In production, you'd generate signed URLs here using StorageService
    // For now, return the storage URLs directly (they'll need to be signed on the client or via a download endpoint)

    return result;
  }

  async getLatestFilingPack(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);
    return this.prisma.filingPack.findFirst({
      where: { businessId, taxYear, status: 'ready' },
      orderBy: [{ version: 'desc' }, { requestedAt: 'desc' }],
    });
  }

  async getHistory(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);

    return this.prisma.filingPack.findMany({
      where: { businessId, taxYear },
      orderBy: { version: 'desc' },
      include: {
        pdfDocument: {
          select: {
            id: true,
            storageUrl: true,
          },
        },
        csvDocument: {
          select: {
            id: true,
            storageUrl: true,
          },
        },
        zipDocument: {
          select: {
            id: true,
            storageUrl: true,
          },
        },
      },
    });
  }

  async generatePack(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);

    // Check plan feature
    const hasFeature = await this.plansService.hasFeature(
      userId,
      businessId,
      'yearEndFilingPack',
    );

    if (!hasFeature) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Filing pack generation requires Basic plan or higher',
        featureKey: 'yearEndFilingPack',
      });
    }

    // Determine next version
    const existingPacks = await this.prisma.filingPack.findMany({
      where: { businessId, taxYear },
      select: { version: true },
    });

    const nextVersion = existingPacks.length > 0
      ? Math.max(...existingPacks.map((p) => p.version)) + 1
      : 1;

    // Create pack record
    const pack = await this.prisma.filingPack.create({
      data: {
        businessId,
        taxYear,
        version: nextVersion,
        status: 'queued',
        requestedByUserId: userId,
      },
    });

    // Enqueue job
    await this.filingPackQueue.add('generate', {
      filingPackId: pack.id,
      businessId,
      taxYear,
      userId,
    });

    return pack;
  }

  async regeneratePack(packId: string, businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const existingPack = await this.prisma.filingPack.findUnique({
      where: { id: packId },
    });

    if (!existingPack) {
      throw new NotFoundException('Filing pack not found');
    }

    if (existingPack.businessId !== businessId) {
      throw new ForbiddenException('Pack does not belong to this business');
    }

    // Check plan feature
    const hasFeature = await this.plansService.hasFeature(
      userId,
      businessId,
      'yearEndFilingPack',
    );

    if (!hasFeature) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Filing pack generation requires Basic plan or higher',
        featureKey: 'yearEndFilingPack',
      });
    }

    // Determine next version
    const existingPacks = await this.prisma.filingPack.findMany({
      where: { businessId, taxYear: existingPack.taxYear },
      select: { version: true },
    });

    const nextVersion = Math.max(...existingPacks.map((p) => p.version)) + 1;

    // Create new pack record
    const pack = await this.prisma.filingPack.create({
      data: {
        businessId,
        taxYear: existingPack.taxYear,
        version: nextVersion,
        status: 'queued',
        requestedByUserId: userId,
      },
    });

    // Enqueue job
    await this.filingPackQueue.add('generate', {
      filingPackId: pack.id,
      businessId,
      taxYear: existingPack.taxYear,
      userId,
    });

    return pack;
  }

  async getDownloadUrl(
    businessId: string,
    userId: string,
    packId: string,
    type: 'pdf' | 'csv' | 'zip',
  ) {
    await this.businessesService.findOne(businessId, userId);

    const pack = await this.prisma.filingPack.findUnique({
      where: { id: packId },
      include: {
        pdfDocument: type === 'pdf',
        csvDocument: type === 'csv',
        zipDocument: type === 'zip',
      },
    });

    if (!pack || pack.businessId !== businessId) {
      throw new NotFoundException('Filing pack not found');
    }

    if (pack.status !== 'ready') {
      throw new BadRequestException('Filing pack is not ready yet');
    }

    const document =
      type === 'pdf'
        ? pack.pdfDocument
        : type === 'csv'
          ? pack.csvDocument
          : pack.zipDocument;

    if (!document) {
      throw new NotFoundException(`${type.toUpperCase()} document not found`);
    }

    // Return storage URL - in production, generate signed URL here
    return { url: document.storageUrl, filename: `${type}-${pack.taxYear}-v${pack.version}.${type === 'pdf' ? 'pdf' : type === 'csv' ? 'csv' : 'zip'}` };
  }
}

import { Injectable, NotFoundException, ForbiddenException, Optional, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { StorageService } from '../storage/storage.service';
import * as crypto from 'crypto';
import { scanUploadedObject } from '../security/scan';

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @Optional()
    @Inject(forwardRef(() => 'ComplianceTasksGenerator'))
    private complianceTasksGenerator?: any,
  ) {}

  private readonly MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB

  private verifyLogoMagicBytes(mimeType: string, header: Buffer): boolean {
    if (mimeType === 'image/png') {
      const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return header.subarray(0, 8).equals(sig);
    }
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    return false;
  }

  async createInvoiceLogoUploadUrl(businessId: string, userId: string, mimeType: string) {
    await this.findOne(businessId, userId);

    const mt = (mimeType || '').toLowerCase();
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(mt)) {
      throw new BadRequestException({
        code: 'LOGO_TYPE_NOT_ALLOWED',
        message: 'Logo must be PNG or JPG',
      });
    }

    const ext = mt.includes('png') ? 'png' : 'jpg';
    const key = `businesses/${businessId}/invoice-logo/${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await this.storageService.getSignedUploadUrl(key, mt);
    return { uploadUrl, key };
  }

  async uploadInvoiceLogoViaApi(
    businessId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string }> {
    await this.findOne(businessId, userId);

    if (!file) {
      throw new BadRequestException({ code: 'LOGO_MISSING', message: 'No logo file uploaded' });
    }

    const mt = (file.mimetype || '').toLowerCase();
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(mt)) {
      throw new BadRequestException({ code: 'LOGO_TYPE_NOT_ALLOWED', message: 'Logo must be PNG or JPG' });
    }

    if (file.size > this.MAX_LOGO_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'LOGO_TOO_LARGE',
        message: `Logo too large. Max size is ${this.MAX_LOGO_UPLOAD_BYTES} bytes`,
      });
    }

    const header = (file.buffer || Buffer.alloc(0)).subarray(0, 16);
    if (!this.verifyLogoMagicBytes(mt, header)) {
      throw new BadRequestException({
        code: 'LOGO_TYPE_NOT_ALLOWED',
        message: 'Logo file signature does not match PNG/JPG',
      });
    }

    const ext = mt.includes('png') ? 'png' : 'jpg';
    const key = `businesses/${businessId}/invoice-logo/${crypto.randomUUID()}.${ext}`;

    await this.storageService.uploadFile(file.buffer, key, mt);

    const scan = await scanUploadedObject(key);
    if (!scan.ok) {
      await this.storageService.deleteFile(key).catch(() => {});
      throw new BadRequestException({
        code: 'LOGO_REJECTED',
        message: ('reason' in scan ? scan.reason : undefined) || 'Upload rejected',
      });
    }

    // Persist immediately on the business record so refresh shows the logo
    await this.prisma.business.update({
      where: { id: businessId },
      data: { invoiceLogoUrl: key } as any,
    });

    return { key };
  }

  async getResolvedInvoiceLogoUrl(businessId: string, userId: string): Promise<{ url: string | null }> {
    const business: any = await this.findOne(businessId, userId);
    const stored = (business?.invoiceLogoUrl || '').toString().trim();
    if (!stored) return { url: null };
    if (stored.startsWith('businesses/')) {
      const url = await this.storageService.getSignedDownloadUrl(stored, 600);
      return { url };
    }
    return { url: stored };
  }

  async create(userId: string, data: CreateBusinessDto) {
    const business = await this.prisma.business.create({
      data: {
        ...data,
        ownerUserId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // Generate compliance tasks asynchronously (don't block creation)
    if (this.complianceTasksGenerator) {
      this.complianceTasksGenerator
        .generateTasksForBusiness(business.id)
        .catch((error: any) => {
          console.error(`Failed to generate tasks for business ${business.id}:`, error);
        });
    }

    return business;
  }

  async findAll(userId: string) {
    try {
      // Attempt full query with subscriptions (ideal path)
      return await this.prisma.business.findMany({
        where: {
          OR: [
            { ownerUserId: userId },
            { members: { some: { userId } } },
          ],
        },
        include: {
          subscriptions: {
            include: {
              plan: true,
            },
          },
        },
      });
    } catch (err: any) {
      // If subscriptions/plan relation fails (schema drift), fall back to basic query
      console.error('[BusinessesService.findAll] Full query failed, falling back:', err?.message);
      return this.prisma.business.findMany({
        where: {
          OR: [
            { ownerUserId: userId },
            { members: { some: { userId } } },
          ],
        },
      });
    }
  }

  async findOne(id: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    if (business.ownerUserId !== userId) {
      try {
        const member = await this.prisma.businessMember.findUnique({
          where: { businessId_userId: { businessId: id, userId } },
        });
        if (!member) {
          throw new ForbiddenException('You do not have access to this business');
        }
      } catch (err: any) {
        // If businessMember table/constraint is missing (schema drift), avoid 500.
        console.error('[BusinessesService.findOne] membership check failed:', err?.message);
        throw new ForbiddenException({
          code: 'BUSINESS_MEMBERS_UNAVAILABLE',
          message:
            'Workspace access could not be verified (membership data unavailable). If you are the owner, please re-login or contact support.',
        } as any);
      }
    }

    return business;
  }

  async getMemberRole(businessId: string, userId: string): Promise<'owner' | 'member' | 'accountant' | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerUserId: true },
    });
    if (!business) return null;
    if (business.ownerUserId === userId) return 'owner';
    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { role: true },
    });
    return (member?.role as any) || null;
  }

  async update(id: string, userId: string, data: UpdateBusinessDto) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.business.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.business.delete({
      where: { id },
    });
  }
}

import { Injectable, NotFoundException, ForbiddenException, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => 'ComplianceTasksGenerator'))
    private complianceTasksGenerator?: any,
  ) {}

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
    return this.prisma.business.findMany({
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
      const member = await this.prisma.businessMember.findUnique({
        where: { businessId_userId: { businessId: id, userId } },
      });
      if (!member) {
        throw new ForbiddenException('You do not have access to this business');
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

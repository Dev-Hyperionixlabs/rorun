import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  async create(businessId: string, userId: string, dto: CreateJobDto) {
    await this.businessesService.findOne(businessId, userId);
    return (this.prisma as any).job.create({
      data: {
        businessId,
        clientId: dto.clientId || null,
        title: dto.title.trim(),
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async list(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);
    return (this.prisma as any).job.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(businessId: string, userId: string, id: string) {
    await this.businessesService.findOne(businessId, userId);
    const job = await (this.prisma as any).job.findUnique({ where: { id } });
    if (!job || job.businessId !== businessId) throw new NotFoundException('Job not found');
    return job;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateJobDto) {
    await this.get(businessId, userId, id);
    return (this.prisma as any).job.update({
      where: { id },
      data: {
        clientId: dto.clientId === undefined ? undefined : dto.clientId || null,
        title: dto.title?.trim(),
        notes: dto.notes?.trim() || undefined,
      },
    });
  }

  async remove(businessId: string, userId: string, id: string) {
    await this.get(businessId, userId, id);
    return (this.prisma as any).job.delete({ where: { id } });
  }
}



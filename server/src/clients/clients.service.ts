import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  async create(businessId: string, userId: string, dto: CreateClientDto) {
    await this.businessesService.findOne(businessId, userId);
    return (this.prisma as any).client.create({
      data: {
        businessId,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async list(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);
    return (this.prisma as any).client.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(businessId: string, userId: string, id: string) {
    await this.businessesService.findOne(businessId, userId);
    const client = await (this.prisma as any).client.findUnique({ where: { id } });
    if (!client || client.businessId !== businessId) throw new NotFoundException('Client not found');
    return client;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateClientDto) {
    await this.get(businessId, userId, id);
    return (this.prisma as any).client.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        notes: dto.notes?.trim() || undefined,
      },
    });
  }

  async remove(businessId: string, userId: string, id: string) {
    await this.get(businessId, userId, id);
    return (this.prisma as any).client.delete({ where: { id } });
  }
}



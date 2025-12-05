import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateBusinessDto) {
    return this.prisma.business.create({
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
  }

  async findAll(userId: string) {
    return this.prisma.business.findMany({
      where: {
        ownerUserId: userId,
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
      throw new ForbiddenException('You do not have access to this business');
    }

    return business;
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


import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async register(userId: string, data: CreateDeviceDto) {
    // Check if device already exists
    const existing = await this.prisma.device.findFirst({
      where: {
        userId,
        platform: data.platform,
        pushToken: data.pushToken,
      },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
        },
      });
    }

    return this.prisma.device.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async remove(deviceId: string, userId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device || device.userId !== userId) {
      throw new Error('Device not found');
    }

    return this.prisma.device.delete({
      where: { id: deviceId },
    });
  }

  async getUserDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
    });
  }
}

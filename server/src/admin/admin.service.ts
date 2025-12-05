import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  validateAdminKey(key: string): boolean {
    const adminKey = this.configService.get<string>('ADMIN_SECRET_KEY');
    return key === adminKey;
  }

  async getBusinesses() {
    return this.prisma.business.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async getTaxRules() {
    return this.prisma.taxRule.findMany({
      orderBy: [
        { year: 'desc' },
        { taxType: 'asc' },
      ],
    });
  }

  async createTaxRule(data: any) {
    return this.prisma.taxRule.create({
      data,
    });
  }

  async updateTaxRule(id: string, data: any) {
    return this.prisma.taxRule.update({
      where: { id },
      data,
    });
  }

  async getKnowledgeArticles() {
    return this.prisma.knowledgeArticle.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createKnowledgeArticle(data: any) {
    return this.prisma.knowledgeArticle.create({
      data,
    });
  }

  async updateKnowledgeArticle(id: string, data: any) {
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data,
    });
  }
}


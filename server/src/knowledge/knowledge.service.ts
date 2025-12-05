import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async findAll(language?: string, tags?: string[]) {
    const where: any = {
      isActive: true,
    };

    if (language) {
      where.language = language;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    return this.prisma.knowledgeArticle.findMany({
      where,
      orderBy: {
        publishedAt: 'desc',
      },
      select: {
        id: true,
        slug: true,
        language: true,
        title: true,
        tags: true,
        publishedAt: true,
      },
    });
  }

  async findOne(slug: string, language: string = 'en') {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: {
        slug_language: {
          slug,
          language,
        },
      },
    });

    if (!article || !article.isActive) {
      throw new NotFoundException(`Article not found: ${slug} (${language})`);
    }

    return article;
  }
}


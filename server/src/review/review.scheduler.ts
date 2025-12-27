import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewService } from './review.service';

@Injectable()
export class ReviewScheduler {
  constructor(
    private prisma: PrismaService,
    private reviewService: ReviewService,
  ) {}

  // Nightly rescan (Africa/Lagos)
  @Cron('0 2 * * *', { timeZone: 'Africa/Lagos' })
  async nightlyRescan() {
    const taxYear = new Date().getFullYear();
    const businesses = await this.prisma.business.findMany({ select: { id: true } });
    for (const b of businesses) {
      try {
        await this.reviewService.rescanInternal(b.id, taxYear);
      } catch (e) {
        // keep going
        console.error(`[ReviewScheduler] Failed rescan for business ${b.id}:`, e);
      }
    }
  }
}



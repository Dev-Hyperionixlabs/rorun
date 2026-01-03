import { Test } from '@nestjs/testing';
import { FeedbackService } from '../src/feedback/feedback.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('FeedbackService', () => {
  it('creates feedback (minimal)', async () => {
    const prismaMock = {
      feedback: {
        create: jest.fn().mockResolvedValue({ id: 'fb1', status: 'open', createdAt: new Date() }),
      },
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    const svc = moduleRef.get(FeedbackService);
    const res = await svc.create({ message: 'Hello feedback', email: 'a@b.com' });
    expect(res.id).toBe('fb1');
    expect(prismaMock.feedback.create).toHaveBeenCalled();
  });

  it('lists feedback with paging', async () => {
    const prismaMock = {
      feedback: {
        findMany: jest.fn().mockResolvedValue([{ id: 'fb1' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    const svc = moduleRef.get(FeedbackService);
    const res = await svc.list({ status: 'open', limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(prismaMock.feedback.findMany).toHaveBeenCalled();
  });
});



import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ComplianceTasksController } from '../src/compliance-tasks/compliance-tasks.controller';
import { ComplianceTasksService } from '../src/compliance-tasks/compliance-tasks.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { BusinessRoleGuard } from '../src/auth/guards/business-role.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { BusinessesService } from '../src/businesses/businesses.service';
import { AuditService } from '../src/audit/audit.service';
import { ComplianceTasksGenerator } from '../src/compliance-tasks/compliance-tasks.generator';

class AllowAllGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user_test_1' };
    return true;
  }
}

describe('ComplianceTasks (e2e) - actions', () => {
  let app: INestApplication;
  let state: any;

  beforeAll(async () => {
    state = {
      task: {
        id: 'task_1',
        businessId: 'biz_1',
        taxYear: 2025,
        taskKey: 'records_month_2025_01',
        title: 'Keep records updated',
        description: 'Test',
        category: 'records',
        frequency: 'monthly',
        dueDate: new Date(Date.now() + 7 * 86400000),
        status: 'open',
        priority: 10,
        evidenceRequired: true,
        evidenceSpecJson: { requiredTypes: ['receipt'] },
        sourceRuleSet: '2026.1',
        createdBy: 'system',
        completedAt: null,
        dismissedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        evidenceLinks: [] as any[],
      },
      docsById: new Map<string, any>(),
      evidenceLinks: [] as any[],
    };

    const prismaMock: Partial<PrismaService> = {
      complianceTask: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id !== state.task.id) return null;
          return state.task;
        }),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          state.task = { ...state.task, ...data };
          return state.task;
        }),
        findMany: jest.fn().mockResolvedValue([state.task]),
      } as any,
      document: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          const d = state.docsById.get(where?.id);
          if (!d) return null;
          if (d.businessId !== where?.businessId) return null;
          return { id: d.id };
        }),
      } as any,
      taskEvidenceLink: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          return state.evidenceLinks.find((l) => l.taskId === where.taskId && l.documentId === where.documentId) || null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const link = {
            id: `link_${state.evidenceLinks.length + 1}`,
            taskId: data.taskId,
            documentId: data.documentId,
            note: data.note || null,
            createdAt: new Date(),
            document: { id: data.documentId, type: 'receipt', storageUrl: 'x', createdAt: new Date() },
          };
          state.evidenceLinks.unshift(link);
          state.task.evidenceLinks = state.evidenceLinks;
          return link;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          return state.evidenceLinks.find((l) => l.id === where.id) || null;
        }),
        delete: jest.fn().mockImplementation(async ({ where }: any) => {
          state.evidenceLinks = state.evidenceLinks.filter((l) => l.id !== where.id);
          state.task.evidenceLinks = state.evidenceLinks;
          return { ok: true };
        }),
      } as any,
      transactionCategory: { findMany: jest.fn().mockResolvedValue([]) } as any,
    };

    const businessesServiceMock = { findOne: jest.fn().mockResolvedValue({ id: 'biz_1' }) };
    const auditServiceMock = { createAuditEvent: jest.fn().mockResolvedValue({ ok: true }) };
    const generatorMock = { generateTasksForBusiness: jest.fn().mockResolvedValue(0) };

    const moduleRef = await Test.createTestingModule({
      controllers: [ComplianceTasksController],
      providers: [
        ComplianceTasksService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BusinessesService, useValue: businessesServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: ComplianceTasksGenerator, useValue: generatorMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(BusinessRoleGuard)
      .useClass(AllowAllGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('Start open task -> 200 and status becomes in_progress', async () => {
    state.task.status = 'open';
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/start')
      .send({});
    expect(res.status).toBe(201); // Nest default for POST
    expect(res.body.status).toBe('in_progress');
  });

  it('Start again -> 200/201 (idempotent) remains in_progress', async () => {
    state.task.status = 'in_progress';
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/start')
      .send({});
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('in_progress');
  });

  it('Complete from open without evidence -> 400 evidence required', async () => {
    state.task.status = 'open';
    state.task.evidenceLinks = [];
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/complete')
      .send({});
    expect(res.status).toBe(400);
    const msg = Array.isArray(res.body?.message) ? res.body.message.join(' ') : String(res.body?.message || '');
    expect(msg.toLowerCase()).toContain('evidence');
  });

  it('Add evidence invalid documentId -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/evidence')
      .send({ documentId: 'doc_missing' });
    expect(res.status).toBe(400);
  });

  it('Add evidence twice same doc -> 200/201 and no duplicate rows', async () => {
    // Create a doc in the same business
    state.docsById.set('doc_1', { id: 'doc_1', businessId: 'biz_1' });
    state.evidenceLinks = [];
    state.task.evidenceLinks = [];

    const first = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/evidence')
      .send({ documentId: 'doc_1' });
    expect([200, 201]).toContain(first.status);

    const second = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/evidence')
      .send({ documentId: 'doc_1' });
    expect([200, 201]).toContain(second.status);

    // Still only one link
    expect(state.evidenceLinks.length).toBe(1);
  });

  it('Complete after evidence -> 200/201 done, complete again idempotent', async () => {
    state.task.status = 'open';
    state.task.evidenceLinks = state.evidenceLinks;

    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/complete')
      .send({});
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('done');

    const again = await request(app.getHttpServer())
      .post('/businesses/biz_1/compliance/tasks/task_1/complete')
      .send({});
    expect([200, 201]).toContain(again.status);
    expect(again.body.status).toBe('done');
  });
});



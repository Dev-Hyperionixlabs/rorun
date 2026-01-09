import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ImportsController } from '../src/imports/imports.controller';
import { ImportsService } from '../src/imports/imports.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

class AllowAllJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'user_test_1' };
    return true;
  }
}

describe('Imports (e2e) - approve validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const importsServiceMock = {
      approveImport: jest.fn().mockResolvedValue({ ok: true }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [{ provide: ImportsService, useValue: importsServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAllJwtGuard)
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

  it('accepts { lineIds } (strict whitelist enabled)', async () => {
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/imports/imp_1/approve')
      .send({
        lineIds: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects unknown fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/businesses/biz_1/imports/imp_1/approve')
      .send({
        lineIds: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
        bogusField: 1,
      });

    expect(res.status).toBe(400);
    const msg = Array.isArray(res.body?.message) ? res.body.message.join(' ') : String(res.body?.message || '');
    expect(msg).toContain('bogusField');
    expect(msg).toContain('should not exist');
  });
});



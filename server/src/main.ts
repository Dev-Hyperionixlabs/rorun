import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Capture raw request body for webhook signature verification (e.g. Paystack)
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Enable CORS
  // NOTE: Render runs on Linux and CORS must explicitly allow the production web origin(s).
  // Also, if ALLOWED_ORIGINS is set, we *append* defaults instead of replacing them so
  // production domains don't get accidentally dropped.
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    // Production web domains
    'https://rorun.ng',
    'https://www.rorun.ng',
    // Common Vercel production domain (if used)
    'https://rorun.vercel.app',
  ];

  const extra = [
    process.env.WEB_BASE_URL,
    process.env.ADMIN_BASE_URL,
  ].filter(Boolean) as string[];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...extra, ...envOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      logger.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter for Prisma errors - prevents raw stack traces from leaking to clients
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Swagger API documentation (disabled in production)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Rorun API')
      .setDescription('Rorun MVP API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Diagnostic endpoint - helps identify configuration issues
  app.getHttpAdapter().get('/health/diag', async (req, res) => {
    const checks: Record<string, string> = {};
    
    // Check critical env vars (don't reveal values, just presence)
    checks.DATABASE_URL = process.env.DATABASE_URL ? '✅ set' : '❌ MISSING';
    checks.JWT_SECRET = process.env.JWT_SECRET ? '✅ set' : '❌ MISSING';
    checks.NODE_ENV = process.env.NODE_ENV || 'not set (defaults to development)';
    
    // Check optional but important env vars
    checks.WEB_BASE_URL = process.env.WEB_BASE_URL || 'not set';
    checks.ALLOW_DIRECT_PASSWORD_RESET = process.env.ALLOW_DIRECT_PASSWORD_RESET || 'not set';
    
    // Try a simple Prisma query to check DB connection
    try {
      // Get PrismaService from the app's IoC container
      const { PrismaService } = await import('./prisma/prisma.service');
      const prismaService = app.get(PrismaService);
      await prismaService.$queryRaw`SELECT 1`;
      checks.database_connection = '✅ connected';

      // Schema drift checks (common production failure mode)
      try {
        const rows: any[] =
          await prismaService.$queryRaw`SELECT 1 as ok FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'passwordHash' LIMIT 1`;
        checks.user_passwordHash_column = rows?.length ? '✅ present' : '❌ MISSING (run prisma migrations)';
      } catch (schemaErr: any) {
        checks.user_passwordHash_column =
          `⚠️ could not verify (information_schema): ${schemaErr?.message?.slice(0, 80) || 'unknown error'}`;
      }

      try {
        const migrations: any[] =
          await prismaService.$queryRaw`SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations'`;
        checks.prisma_migrations_table = migrations?.[0]?.count ? '✅ present' : '⚠️ not found';
      } catch (mErr: any) {
        checks.prisma_migrations_table =
          `⚠️ could not verify (_prisma_migrations): ${mErr?.message?.slice(0, 80) || 'unknown error'}`;
      }
    } catch (dbErr: any) {
      checks.database_connection = `❌ failed: ${dbErr.message?.slice(0, 100) || 'unknown error'}`;
    }
    
    const allGood = checks.DATABASE_URL?.includes('✅') && 
                    checks.JWT_SECRET?.includes('✅') && 
                    checks.database_connection?.includes('✅');
    
    res.status(allGood ? 200 : 503).json({
      status: allGood ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Root endpoint
  app.getHttpAdapter().get('/', (req, res) => {
    res.status(200).json({
      name: 'Rorun API',
      version: '1.0.0',
      status: 'running',
      docs: isProduction ? undefined : '/api',
    });
  });

  const port = process.env.PORT || 3001;
  const host = isProduction ? '0.0.0.0' : 'localhost';

  await app.listen(port, host);

  logger.log(`🚀 Application running on: http://${host}:${port}`);
  if (!isProduction) {
    logger.log(`📚 Swagger docs: http://${host}:${port}/api`);
  }
  logger.log(`❤️  Health check: http://${host}:${port}/health`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();

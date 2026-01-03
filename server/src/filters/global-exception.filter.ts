import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Catch-all filter to ensure:
 * - no raw stack traces leak to clients
 * - every error response contains requestId
 * - we log a structured error server-side with requestId
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = req.requestId || req.headers['x-request-id']?.toString() || uuidv4();

    // If it's an HttpException, use its status and message (already safe/user-facing)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse() as any;

      const message =
        typeof responseBody === 'string'
          ? responseBody
          : responseBody?.message || exception.message || 'Request failed.';
      const code =
        typeof responseBody === 'object' && responseBody?.code
          ? responseBody.code
          : typeof responseBody === 'object' && responseBody?.error
            ? responseBody.error
            : 'REQUEST_FAILED';

      // minimal structured log
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          level: 'error',
          kind: 'HttpException',
          requestId,
          status,
          code,
          message,
          method: req.method,
          path: (req as any).originalUrl || req.url,
          timestamp: new Date().toISOString(),
        }),
      );

      return res.status(status).json({
        statusCode: status,
        code,
        message,
        requestId,
      });
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const safeMessage = 'An internal server error occurred. Please try again.';
    const error = exception as any;

    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: 'error',
        kind: 'UnhandledException',
        requestId,
        status,
        message: error?.message || String(exception),
        name: error?.name,
        method: req.method,
        path: (req as any).originalUrl || req.url,
        timestamp: new Date().toISOString(),
      }),
    );

    return res.status(status).json({
      statusCode: status,
      code: 'INTERNAL_SERVER_ERROR',
      message: safeMessage,
      requestId,
    });
  }
}



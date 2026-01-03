import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global exception filter for Prisma errors.
 * Catches Prisma-specific exceptions and returns safe, user-friendly messages
 * while logging the full error server-side.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId =
      request?.requestId ||
      request?.headers?.['x-request-id']?.toString() ||
      uuidv4().split('-')[0];

    // Generate a unique error ID for tracking
    const errorId = uuidv4().split('-')[0]; // Short ID like "a3f8b2c1"

    // Log the full error server-side for debugging
    console.error(`[PrismaError:${errorId}]`, {
      requestId,
      name: exception.name,
      message: exception.message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // Determine user-friendly message and status code based on error type
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let userMessage = 'A database error occurred. Please try again.';
    let code = 'DATABASE_ERROR';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          // Unique constraint violation
          status = HttpStatus.CONFLICT;
          userMessage = 'This record already exists.';
          code = 'DUPLICATE_RECORD';
          break;
        case 'P2003':
          // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          userMessage = 'Referenced record not found.';
          code = 'INVALID_REFERENCE';
          break;
        case 'P2021':
          // Table does not exist
          status = HttpStatus.SERVICE_UNAVAILABLE;
          userMessage = 'Database schema is being updated. Please try again shortly.';
          code = 'SCHEMA_UPDATING';
          break;
        case 'P2022':
          // Column does not exist
          status = HttpStatus.SERVICE_UNAVAILABLE;
          userMessage = 'Database schema is being updated. Please try again shortly.';
          code = 'SCHEMA_UPDATING';
          break;
        case 'P2025':
          // Record not found
          status = HttpStatus.NOT_FOUND;
          userMessage = 'Record not found.';
          code = 'NOT_FOUND';
          break;
        default:
          // Other known Prisma errors
          status = HttpStatus.BAD_REQUEST;
          userMessage = 'Invalid database operation.';
          code = 'DATABASE_OPERATION_FAILED';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      userMessage = 'Invalid data format.';
      code = 'VALIDATION_ERROR';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      userMessage = 'Database is temporarily unavailable.';
      code = 'DATABASE_UNAVAILABLE';
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      userMessage = 'An unexpected database error occurred.';
      code = 'DATABASE_PANIC';
    }

    // Also check for specific column missing errors in the message
    if (exception.message?.includes('does not exist in the current database')) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      userMessage = 'Database schema is being updated. Please try again shortly.';
      code = 'SCHEMA_UPDATING';
    }

    response.status(status).json({
      statusCode: status,
      error: code,
      message: userMessage,
      errorId: errorId,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}


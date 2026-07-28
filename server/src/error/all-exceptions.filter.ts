import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RecordNotFoundException } from './record-not-found.exception';

// Prisma types - will be properly typed after prisma generate
let Prisma: any;
try {
  Prisma = require('@prisma/client').Prisma;
} catch {
  Prisma = {
    PrismaClientKnownRequestError: class {},
    PrismaClientValidationError: class {},
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const context = `${request.method} ${request.url}`;

    let status: number;
    let message: string | object;

    if (exception instanceof RecordNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (
      Prisma &&
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      status = this.handlePrismaError(exception);
      message = this.formatPrismaError(exception);
    } else if (
      Prisma &&
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message =
        exception instanceof Error
          ? exception.message.replaceAll(/\n/g, ' ')
          : String(exception);
    } else if (exception instanceof InternalServerErrorException) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      context,
    };

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(JSON.stringify(errorResponse), stack);
    response.status(status).json(errorResponse);
  }

  handlePrismaError(error: any): number {
    switch (error.code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      case 'P2003':
        return HttpStatus.FORBIDDEN;
      case 'P2001':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  formatPrismaError(error: any): string {
    switch (error.code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Foreign key constraint violation';
      case 'P2001':
        return 'Invalid input data';
      default:
        return 'Internal server error';
    }
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string;
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else {
        const obj = r as Record<string, unknown>;
        message = (obj['message'] as string) ?? exception.message;
        code = (obj['code'] as string) ?? code;
        details = obj['details'];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Unexpected error';
    }

    if (status >= 500) {
      this.log.error(`${req.method} ${req.url} -> ${status}: ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    res.status(status).json({
      ok: false,
      error: { code, message, ...(details ? { details } : {}) },
    });
  }
}

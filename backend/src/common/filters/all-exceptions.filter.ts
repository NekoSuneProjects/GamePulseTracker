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
      // HttpException messages are explicitly thrown by our code — safe to
      // surface verbatim because we control them.
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else {
        const obj = r as Record<string, unknown>;
        message = (obj['message'] as string) ?? exception.message;
        code = (obj['code'] as string) ?? code;
        details = obj['details'];
      }
    } else {
      // Any other thrown value is something internal we didn't explicitly
      // surface — Prisma errors, undici errors, etc. They can include SQL
      // constraint names, file paths, or DB column lists. Log the full
      // detail server-side, send a generic message to the client.
      message = 'Internal server error. Check server logs for details.';
    }

    if (status >= 500) {
      const internalMessage = exception instanceof Error ? exception.message : String(exception);
      this.log.error(`${req.method} ${req.url} -> ${status}: ${internalMessage}`, exception instanceof Error ? exception.stack : undefined);
    }

    res.status(status).json({
      ok: false,
      error: { code, message, ...(details ? { details } : {}) },
    });
  }
}

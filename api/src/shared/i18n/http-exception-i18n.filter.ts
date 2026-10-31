import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolveLanguage } from './language.utils';
import { translateErrorBody } from './translate.utils';

/**
 * Global filter that answers every HttpException in the language of the `Accept-Language` header.
 * English responses are sent unchanged; Greek ones go through the dictionary in `el-messages.ts`.
 */
@Catch(HttpException)
export class HttpExceptionI18nFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const body = typeof raw === 'string' ? { statusCode: status, message: raw } : raw;
    res.status(status).json(resolveLanguage(req.headers['accept-language']) === 'el' ? translateErrorBody(body) : body);
  }
}

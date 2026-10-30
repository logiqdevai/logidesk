/**
 * Unit-test shim for @nestjs/common (ESM-only in v12, which Jest's CommonJS runtime cannot load
 * on Node < 24.9). Provides the few symbols pure-logic units import; decorators are no-ops.
 */
export class HttpException extends Error {
  constructor(
    public readonly response: unknown,
    public readonly status: number,
  ) {
    super(typeof response === 'string' ? response : ((response as any)?.message ?? 'Error'));
  }
}
export class BadRequestException extends HttpException {
  constructor(response?: unknown) {
    super(response ?? 'Bad Request', 400);
  }
}
export class NotFoundException extends HttpException {
  constructor(response?: unknown) {
    super(response ?? 'Not Found', 404);
  }
}
export class Logger {
  log() {}
  warn() {}
  error() {}
  debug() {}
}
export const Injectable = () => () => undefined;

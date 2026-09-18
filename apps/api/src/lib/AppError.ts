import { ErrorCode } from '@grovia/shared';

/**
 * The only error type controllers and services are allowed to throw for
 * expected failures. Anything else reaching the error handler is a bug and is
 * reported to the client as a generic INTERNAL.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, ErrorCode.VALIDATION_FAILED, message, details);
  }
  static unauthenticated(message = 'Sign in to continue.') {
    return new AppError(401, ErrorCode.UNAUTHENTICATED, message);
  }
  static forbidden(message = 'You do not have access to this.') {
    return new AppError(403, ErrorCode.FORBIDDEN, message);
  }
  static notFound(message = 'Not found.') {
    return new AppError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }
}

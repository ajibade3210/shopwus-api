import { DomainErrorCode } from "../config/constants/errors";

export { DomainErrorCode };

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Domain-specific errors for business logic violations.
 * Translates technical constraints into user-friendly business explanations.
 */
export class DomainError extends AppError {
  constructor(
    message: string,
    code: string = DomainErrorCode.RULE_VIOLATION,
    data?: unknown,
  ) {
    super(message, 400, code, data);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    code: string = DomainErrorCode.NOT_FOUND,
    data?: unknown,
  ) {
    super(message, 404, code, data);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    code: string = DomainErrorCode.CONFLICT,
    data?: unknown,
  ) {
    super(message, 409, code, data);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    code: string = DomainErrorCode.VALIDATION_ERROR,
    data?: unknown,
  ) {
    super(message, 400, code, data);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = "Invalid or missing access token",
    code: string = DomainErrorCode.UNAUTHORIZED,
    data?: unknown,
  ) {
    super(message, 401, code, data);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "You do not have permission to access this resource",
    code: string = DomainErrorCode.FORBIDDEN,
    data?: unknown,
  ) {
    super(message, 403, code, data);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(
    message = "Request entity too large",
    code: string = DomainErrorCode.FILE_TOO_LARGE,
    data?: unknown,
  ) {
    super(message, 413, code, data);
  }
}

/**
 * Specifically for financial/payment logic failures.
 */
export class PaymentError extends DomainError {
  constructor(
    message: string,
    code: string = DomainErrorCode.PAYMENT_FAILED,
    data?: unknown,
  ) {
    super(message, code, data);
  }
}

/**
 * Specifically for business rule violations (e.g., "Cannot cancel a paid invoice").
 */
export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    code: string = DomainErrorCode.RULE_VIOLATION,
    data?: unknown,
  ) {
    super(message, code, data);
  }
}

/**
 * Specifically for technical/system failures (e.g., 3rd party API down, unexpected DB state).
 */
export class TechnicalError extends AppError {
  constructor(
    message: string,
    code: string = DomainErrorCode.SYSTEM_ERROR,
    data?: unknown,
  ) {
    super(message, 500, code, data);
  }
}

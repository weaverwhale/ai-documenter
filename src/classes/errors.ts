/**
 * Custom error classes for AI Documenter
 */

export class DocumenterError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends DocumenterError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}

export class FileOperationError extends DocumenterError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly operation: 'read' | 'write' | 'list' | 'stat',
    context?: Record<string, unknown>
  ) {
    super(message, 'FILE_OPERATION_ERROR', { ...context, filePath, operation });
  }
}

export class ProviderError extends DocumenterError {
  constructor(
    message: string,
    public readonly provider: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'PROVIDER_ERROR', { ...context, provider });
  }
}

export class ValidationError extends DocumenterError {
  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { ...context, field });
  }
}

export class ToolError extends DocumenterError {
  constructor(
    message: string,
    public readonly toolName: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'TOOL_ERROR', { ...context, toolName });
  }
}

/**
 * Type guard to check if an error is a known DocumenterError
 */
export function isDocumenterError(error: unknown): error is DocumenterError {
  return error instanceof DocumenterError;
}

/**
 * Utility function to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Utility function to safely extract error details for logging
 */
export function getErrorDetails(error: unknown): {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  stack?: string;
} {
  if (error instanceof DocumenterError) {
    const result: {
      message: string;
      code?: string;
      context?: Record<string, unknown>;
      stack?: string;
    } = {
      message: error.message,
    };

    if (error.code) {
      result.code = error.code;
    }
    if (error.context) {
      result.context = error.context;
    }
    if (error.stack) {
      result.stack = error.stack;
    }

    return result;
  }

  if (error instanceof Error) {
    const result: {
      message: string;
      code?: string;
      context?: Record<string, unknown>;
      stack?: string;
    } = {
      message: error.message,
    };

    if (error.stack) {
      result.stack = error.stack;
    }

    return result;
  }

  return {
    message: String(error),
  };
}

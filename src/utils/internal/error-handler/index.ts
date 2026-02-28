/**
 * @fileoverview Barrel exports for the error handler utilities.
 * Enhanced with new 2025 patterns including Result types, cause chain extraction,
 * and compiled error patterns for performance.
 * @module src/utils/internal/error-handler/index
 */

export { ErrorHandler } from './errorHandler.js';
export {
  type ErrorCauseNode,
  extractErrorCauseChain,
  serializeErrorCauseChain,
} from './helpers.js';
export {
  COMPILED_ERROR_PATTERNS,
  COMPILED_PROVIDER_PATTERNS,
  getCompiledPattern,
  PROVIDER_ERROR_PATTERNS,
} from './mappings.js';
export {
  type BaseErrorMapping,
  type EnhancedErrorContext,
  type ErrorBreadcrumb,
  type ErrorContext,
  type ErrorHandlerOptions,
  type ErrorMapping,
  type ErrorMetadata,
  type ErrorRecoveryStrategy,
  ErrorSeverity,
  type Result,
} from './types.js';

/**
 * @fileoverview Shared error classification constants used by the error handler.
 * @module src/utils/internal/error-handler/mappings
 */

import { JsonRpcErrorCode } from '@/types-global/errors.js';
import type { BaseErrorMapping } from './types.js';

/**
 * Maps standard JavaScript error constructor names to `JsonRpcErrorCode` values.
 */
export const ERROR_TYPE_MAPPINGS: Readonly<Record<string, JsonRpcErrorCode>> = {
  SyntaxError: JsonRpcErrorCode.ValidationError,
  TypeError: JsonRpcErrorCode.ValidationError,
  ReferenceError: JsonRpcErrorCode.InternalError,
  RangeError: JsonRpcErrorCode.ValidationError,
  URIError: JsonRpcErrorCode.ValidationError,
  EvalError: JsonRpcErrorCode.InternalError,
  AggregateError: JsonRpcErrorCode.InternalError,
};

/**
 * Array of `BaseErrorMapping` rules to classify errors by message/name patterns.
 * Order matters: more specific patterns should precede generic ones.
 */
export const COMMON_ERROR_PATTERNS: ReadonlyArray<Readonly<BaseErrorMapping>> =
  [
    {
      pattern:
        /auth|unauthorized|unauthenticated|not.*logged.*in|invalid.*token|expired.*token/i,
      errorCode: JsonRpcErrorCode.Unauthorized,
    },
    {
      pattern: /permission|forbidden|access.*denied|not.*allowed/i,
      errorCode: JsonRpcErrorCode.Forbidden,
    },
    {
      pattern: /not found|missing|no such|doesn't exist|couldn't find/i,
      errorCode: JsonRpcErrorCode.NotFound,
    },
    {
      pattern:
        /invalid|validation|malformed|bad request|wrong format|missing required/i,
      errorCode: JsonRpcErrorCode.ValidationError,
    },
    {
      pattern: /conflict|already exists|duplicate|unique constraint/i,
      errorCode: JsonRpcErrorCode.Conflict,
    },
    {
      pattern: /rate limit|too many requests|throttled/i,
      errorCode: JsonRpcErrorCode.RateLimited,
    },
    {
      pattern: /timeout|timed out|deadline exceeded/i,
      errorCode: JsonRpcErrorCode.Timeout,
    },
    {
      pattern: /abort(ed)?|cancell?ed/i,
      errorCode: JsonRpcErrorCode.Timeout,
    },
    {
      pattern:
        /service unavailable|bad gateway|gateway timeout|upstream error/i,
      errorCode: JsonRpcErrorCode.ServiceUnavailable,
    },
    {
      pattern: /zod|zoderror|schema validation/i,
      errorCode: JsonRpcErrorCode.ValidationError,
    },
  ];

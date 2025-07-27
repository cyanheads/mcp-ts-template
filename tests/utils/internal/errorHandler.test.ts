import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '../../../src/utils/internal/errorHandler';
import { logger } from '../../../src/utils/internal/logger';
import { McpError, BaseErrorCode } from '../../../src/types-global/errors';

// Mock the logger module
vi.mock('../../../src/utils/internal/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('determineErrorCode', () => {
    it('should return the code from an McpError instance', () => {
      const err = new McpError(BaseErrorCode.FORBIDDEN, 'test');
      expect(ErrorHandler.determineErrorCode(err)).toBe(BaseErrorCode.FORBIDDEN);
    });

    it('should return VALIDATION_ERROR for a TypeError', () => {
      const err = new TypeError('test');
      expect(ErrorHandler.determineErrorCode(err)).toBe(BaseErrorCode.VALIDATION_ERROR);
    });

    it('should return NOT_FOUND for an error message containing "not found"', () => {
      const err = new Error('Item not found');
      expect(ErrorHandler.determineErrorCode(err)).toBe(BaseErrorCode.NOT_FOUND);
    });

    it('should default to INTERNAL_ERROR for an unknown error', () => {
      const err = new Error('Something weird happened');
      expect(ErrorHandler.determineErrorCode(err)).toBe(BaseErrorCode.INTERNAL_ERROR);
    });
  });

  describe('handleError', () => {
    it('should call logger.error with a structured payload', () => {
      const error = new Error('Something went wrong');
      const options = {
        operation: 'testOperation',
        input: { password: 'test' },
      };

      ErrorHandler.handleError(error, options);

      expect(logger.error).toHaveBeenCalledOnce();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [logMessage, logPayload] = (logger.error as any).mock.calls[0];
      
      expect(logMessage).toContain('Error in testOperation: Something went wrong');
      expect(logPayload).toHaveProperty('operation', 'testOperation');
      expect(logPayload.input.password).toBe('[REDACTED]'); // Verify sanitization
      expect(logPayload).toHaveProperty('errorCode');
    });

    it('should return a new McpError instance', () => {
        const error = new Error('generic error');
        const handledError = ErrorHandler.handleError(error, { operation: 'test' });
        expect(handledError).toBeInstanceOf(McpError);
    });

    it('should include sanitized input in the log payload', () => {
        const error = new Error('test');
        ErrorHandler.handleError(error, { operation: 'op', input: { apiKey: '123' } });
        expect(logger.error).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [, logPayload] = (logger.error as any).mock.calls[0];
        expect(logPayload.input.apiKey).toBe('[REDACTED]');
    });
  });

  describe('tryCatch', () => {
    it('should return the result of the function on success', async () => {
      const successFn = async () => 'success';
      const result = await ErrorHandler.tryCatch(successFn, { operation: 'test' });
      expect(result).toBe('success');
    });

    it('should re-throw the handled error on failure', async () => {
      const error = new Error('failure');
      const failFn = async () => { throw error; };
      
      await expect(ErrorHandler.tryCatch(failFn, { operation: 'test' })).rejects.toThrow(McpError);
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });
});

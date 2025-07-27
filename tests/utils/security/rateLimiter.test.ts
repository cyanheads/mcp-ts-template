import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../../../src/utils/security/rateLimiter';
import { McpError, BaseErrorCode } from '../../../src/types-global/errors';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the configured limit', () => {
    const rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
    const key = 'test-user';

    expect(() => rateLimiter.check(key)).not.toThrow();
    expect(() => rateLimiter.check(key)).not.toThrow();
  });

  it('should throw an McpError when the rate limit is exceeded', () => {
    const rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
    const key = 'test-user';

    rateLimiter.check(key); // 1st request
    rateLimiter.check(key); // 2nd request

    expect(() => {
      rateLimiter.check(key); // 3rd request, should fail
    }).toThrow(McpError);

    expect(() => {
      rateLimiter.check(key);
    }).toThrow(expect.objectContaining({ code: BaseErrorCode.RATE_LIMITED }));
  });

  it('should reset the limit after the time window passes', () => {
    const rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const key = 'test-user';

    rateLimiter.check(key); // This one passes

    // This one should fail
    expect(() => rateLimiter.check(key)).toThrow(McpError);

    // Advance time past the window
    vi.advanceTimersByTime(1001);

    // Now it should pass again
    expect(() => {
      rateLimiter.check(key);
    }).not.toThrow();
  });

  it('should format the error message with the correct wait time', () => {
    const rateLimiter = new RateLimiter({ windowMs: 5000, maxRequests: 1 });
    const key = 'test-user';

    rateLimiter.check(key);

    try {
      rateLimiter.check(key);
    } catch (error) {
      if (error instanceof McpError) {
        expect(error.message).toContain('Please try again in 5 seconds');
      }
    }
  });

  it('should correctly reset all limits when reset() is called', () => {
    const rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const key = 'test-user';

    rateLimiter.check(key);
    expect(() => rateLimiter.check(key)).toThrow(McpError);

    rateLimiter.reset();

    expect(() => rateLimiter.check(key)).not.toThrow();
  });
});

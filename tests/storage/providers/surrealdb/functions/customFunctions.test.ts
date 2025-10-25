/**
 * @fileoverview Test suite for SurrealDB custom functions.
 * @module tests/storage/providers/surrealdb/functions/customFunctions.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CustomFunctions,
  type CustomFunctionConfig,
} from '@/storage/providers/surrealdb/functions/customFunctions.js';
import { requestContextService } from '@/utils/index.js';

describe('CustomFunctions', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let customFunctions: CustomFunctions;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customFunctions = new CustomFunctions(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('define', () => {
    it('should define a basic function', async () => {
      const config: CustomFunctionConfig = {
        name: 'calculate_total',
        parameters: [{ name: 'price', type: 'decimal' }],
        body: 'RETURN $price * 1.1;',
      };

      mockClient.query.mockResolvedValue(undefined);

      const result = await customFunctions.define(config, context);

      expect(result).toEqual({
        name: 'calculate_total',
        success: true,
      });
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should define function with multiple parameters', async () => {
      const config: CustomFunctionConfig = {
        name: 'calculate_discount',
        parameters: [
          { name: 'price', type: 'decimal' },
          { name: 'percent', type: 'int' },
        ],
        body: 'RETURN $price * (1 - $percent / 100);',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('$price: decimal');
      expect(query).toContain('$percent: int');
    });

    it('should define function with parameter defaults', async () => {
      const config: CustomFunctionConfig = {
        name: 'greet',
        parameters: [{ name: 'name', type: 'string', default: 'World' }],
        body: 'RETURN "Hello, " + $name;',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('$name: string = "World"');
    });

    it('should define function with return type', async () => {
      const config: CustomFunctionConfig = {
        name: 'get_count',
        parameters: [],
        returnType: 'int',
        body: 'RETURN 42;',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('-> int');
    });

    it('should define function without return type', async () => {
      const config: CustomFunctionConfig = {
        name: 'do_something',
        parameters: [],
        body: 'RETURN NONE;',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).not.toContain('->');
    });

    it('should include comment in query', async () => {
      const config: CustomFunctionConfig = {
        name: 'test_func',
        parameters: [],
        body: 'RETURN 1;',
        comment: 'Test function description',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('COMMENT "Test function description"');
    });

    it('should include PERMISSIONS FULL by default', async () => {
      const config: CustomFunctionConfig = {
        name: 'test_func',
        parameters: [],
        body: 'RETURN 1;',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('PERMISSIONS FULL');
    });

    it('should exclude PERMISSIONS when explicitly disabled', async () => {
      const config: CustomFunctionConfig = {
        name: 'test_func',
        parameters: [],
        body: 'RETURN 1;',
        permissions: false,
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).not.toContain('PERMISSIONS');
    });

    it('should handle function with no parameters', async () => {
      const config: CustomFunctionConfig = {
        name: 'get_timestamp',
        parameters: [],
        returnType: 'datetime',
        body: 'RETURN time::now();',
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('fn::get_timestamp(');
      expect(query).toContain('-> datetime');
    });

    it('should handle complex function body', async () => {
      const config: CustomFunctionConfig = {
        name: 'complex_calc',
        parameters: [{ name: 'x', type: 'int' }],
        returnType: 'int',
        body: `
          LET $result = $x * 2;
          RETURN $result + 10;
        `,
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('LET $result');
    });
  });

  describe('remove', () => {
    it('should remove a function', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const result = await customFunctions.remove('calculate_total', context);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'REMOVE FUNCTION fn::calculate_total',
      );
    });

    it('should return true on successful removal', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const result = await customFunctions.remove('test_func', context);

      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true when function exists', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            functions: {
              'fn::calculate_total': { params: '...', body: '...' },
            },
          },
        },
      ]);

      const exists = await customFunctions.exists('calculate_total', context);

      expect(exists).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('INFO FOR DATABASE');
    });

    it('should return false when function does not exist', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            functions: {
              'fn::other_function': { params: '...', body: '...' },
            },
          },
        },
      ]);

      const exists = await customFunctions.exists('missing_func', context);

      expect(exists).toBe(false);
    });

    it('should return false when functions object is empty', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            functions: {},
          },
        },
      ]);

      const exists = await customFunctions.exists('test_func', context);

      expect(exists).toBe(false);
    });

    it('should handle missing functions object gracefully', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {},
        },
      ]);

      const exists = await customFunctions.exists('test_func', context);

      expect(exists).toBe(false);
    });

    it('should handle empty result array', async () => {
      mockClient.query.mockResolvedValue([]);

      const exists = await customFunctions.exists('test_func', context);

      expect(exists).toBe(false);
    });
  });

  describe('Query building', () => {
    it('should build complete query with all features', async () => {
      const config: CustomFunctionConfig = {
        name: 'full_featured',
        parameters: [
          { name: 'a', type: 'int', default: 0 },
          { name: 'b', type: 'string' },
        ],
        returnType: 'string',
        body: 'RETURN $a + " " + $b;',
        comment: 'Full featured function',
        permissions: true,
      };

      mockClient.query.mockResolvedValue(undefined);

      await customFunctions.define(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE FUNCTION fn::full_featured(');
      expect(query).toContain('$a: int = 0');
      expect(query).toContain('$b: string');
      expect(query).toContain('-> string');
      expect(query).toContain('RETURN $a + " " + $b;');
      expect(query).toContain('COMMENT "Full featured function"');
      expect(query).toContain('PERMISSIONS FULL');
    });
  });
});

/**
 * @fileoverview Test suite for SurrealDB permission helpers.
 * @module tests/storage/providers/surrealdb/auth/permissionHelpers.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  PermissionHelper,
  PermissionBuilder,
  type TablePermissions,
} from '@/storage/providers/surrealdb/auth/permissionHelpers.js';
import { requestContextService } from '@/utils/index.js';

describe('PermissionHelper', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let permissionHelper: PermissionHelper;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    permissionHelper = new PermissionHelper(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test-permission-helper',
    });
  });

  describe('applyPermissions', () => {
    it('should apply permissions with WHERE clauses', async () => {
      const permissions: TablePermissions = {
        table: 'kv_store',
        rules: [
          { operation: 'select', where: 'tenant_id = $token.tid' },
          { operation: 'create', where: 'tenant_id = $token.tid' },
          { operation: 'update', where: 'tenant_id = $token.tid' },
          { operation: 'delete', where: 'tenant_id = $token.tid' },
        ],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE TABLE kv_store SCHEMAFULL');
      expect(query).toContain('PERMISSIONS');
      expect(query).toContain('FOR select WHERE tenant_id = $token.tid');
      expect(query).toContain('FOR create WHERE tenant_id = $token.tid');
      expect(query).toContain('FOR update WHERE tenant_id = $token.tid');
      expect(query).toContain('FOR delete WHERE tenant_id = $token.tid');
    });

    it('should apply FULL permissions', async () => {
      const permissions: TablePermissions = {
        table: 'public_data',
        rules: [
          { operation: 'select', full: true },
          { operation: 'create', full: true },
          { operation: 'update', full: true },
          { operation: 'delete', full: true },
        ],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('FOR select FULL');
      expect(query).toContain('FOR create FULL');
      expect(query).toContain('FOR update FULL');
      expect(query).toContain('FOR delete FULL');
    });

    it('should apply NONE permissions', async () => {
      const permissions: TablePermissions = {
        table: 'restricted',
        rules: [
          { operation: 'select', none: true },
          { operation: 'create', none: true },
          { operation: 'update', none: true },
          { operation: 'delete', none: true },
        ],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('FOR select NONE');
      expect(query).toContain('FOR create NONE');
      expect(query).toContain('FOR update NONE');
      expect(query).toContain('FOR delete NONE');
    });

    it('should handle mixed permission types', async () => {
      const permissions: TablePermissions = {
        table: 'mixed',
        rules: [
          { operation: 'select', full: true },
          { operation: 'create', where: '$token != NONE' },
          { operation: 'update', where: 'owner = $token.sub' },
          { operation: 'delete', none: true },
        ],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('FOR select FULL');
      expect(query).toContain('FOR create WHERE $token != NONE');
      expect(query).toContain('FOR update WHERE owner = $token.sub');
      expect(query).toContain('FOR delete NONE');
    });

    it('should handle empty rules array', async () => {
      const permissions: TablePermissions = {
        table: 'no_permissions',
        rules: [],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE TABLE no_permissions SCHEMAFULL');
      expect(query).not.toContain('PERMISSIONS');
    });

    it('should handle subset of operations', async () => {
      const permissions: TablePermissions = {
        table: 'partial',
        rules: [
          { operation: 'select', full: true },
          { operation: 'create', where: '$token != NONE' },
        ],
      };

      mockClient.query.mockResolvedValue(undefined);

      await permissionHelper.applyPermissions(permissions, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('FOR select FULL');
      expect(query).toContain('FOR create WHERE $token != NONE');
      expect(query).not.toContain('FOR update');
      expect(query).not.toContain('FOR delete');
    });
  });

  describe('builder static method', () => {
    it('should create a permission builder instance', () => {
      const builder = PermissionHelper.builder('test_table');

      expect(builder).toBeInstanceOf(PermissionBuilder);
    });

    it('should pass table name to builder', () => {
      const builder = PermissionHelper.builder('my_table');
      const permissions = builder.select().build();

      expect(permissions.table).toBe('my_table');
    });
  });

  describe('Static helper methods', () => {
    it('should create tenant-scoped permissions with defaults', () => {
      const permissions = PermissionHelper.tenantScoped('kv_store');

      expect(permissions.table).toBe('kv_store');
      expect(permissions.rules).toHaveLength(4);

      const expectedWhere = 'tenant_id = $token.tid';
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        where: expectedWhere,
      });
      expect(permissions.rules[1]).toEqual({
        operation: 'create',
        where: expectedWhere,
      });
      expect(permissions.rules[2]).toEqual({
        operation: 'update',
        where: expectedWhere,
      });
      expect(permissions.rules[3]).toEqual({
        operation: 'delete',
        where: expectedWhere,
      });
    });

    it('should create tenant-scoped permissions with custom field', () => {
      const permissions = PermissionHelper.tenantScoped(
        'kv_store',
        'org_id',
        '$token',
      );

      const expectedWhere = 'org_id = $token.tid';
      expect(permissions.rules[0]?.where).toBe(expectedWhere);
    });

    it('should create tenant-scoped permissions with custom token variable', () => {
      const permissions = PermissionHelper.tenantScoped(
        'kv_store',
        'tenant_id',
        '$auth',
      );

      const expectedWhere = 'tenant_id = $auth.tid';
      expect(permissions.rules[0]?.where).toBe(expectedWhere);
    });

    it('should create owner-only permissions with defaults', () => {
      const permissions = PermissionHelper.ownerOnly('user_posts');

      expect(permissions.table).toBe('user_posts');
      expect(permissions.rules).toHaveLength(4);

      const expectedWhere = 'owner = $token.sub';
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        where: expectedWhere,
      });
      expect(permissions.rules[1]).toEqual({
        operation: 'create',
        full: true,
      });
      expect(permissions.rules[2]).toEqual({
        operation: 'update',
        where: expectedWhere,
      });
      expect(permissions.rules[3]).toEqual({
        operation: 'delete',
        where: expectedWhere,
      });
    });

    it('should create owner-only permissions with custom owner field', () => {
      const permissions = PermissionHelper.ownerOnly(
        'posts',
        'author',
        '$token',
      );

      const expectedWhere = 'author = $token.sub';
      expect(permissions.rules[0]?.where).toBe(expectedWhere);
      expect(permissions.rules[2]?.where).toBe(expectedWhere);
    });

    it('should create public read permissions', () => {
      const permissions = PermissionHelper.publicRead('articles');

      expect(permissions.table).toBe('articles');
      expect(permissions.rules).toHaveLength(4);

      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        full: true,
      });
      expect(permissions.rules[1]).toEqual({
        operation: 'create',
        where: '$token != NONE',
      });
      expect(permissions.rules[2]).toEqual({
        operation: 'update',
        where: '$token != NONE',
      });
      expect(permissions.rules[3]).toEqual({
        operation: 'delete',
        where: '$token != NONE',
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from query execution', async () => {
      const permissions: TablePermissions = {
        table: 'test',
        rules: [{ operation: 'select', full: true }],
      };

      const testError = new Error('Database error');
      mockClient.query.mockRejectedValue(testError);

      await expect(
        permissionHelper.applyPermissions(permissions, context),
      ).rejects.toThrow();
    });
  });
});

describe('PermissionBuilder', () => {
  let builder: PermissionBuilder;

  beforeEach(() => {
    builder = new PermissionBuilder('test_table');
  });

  describe('Fluent API - Building permissions', () => {
    it('should add SELECT permission with WHERE clause', () => {
      const permissions = builder.select('tenant_id = $token.tid').build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        where: 'tenant_id = $token.tid',
      });
    });

    it('should add SELECT permission without WHERE (FULL)', () => {
      const permissions = builder.select().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        full: true,
      });
    });

    it('should add CREATE permission with WHERE clause', () => {
      const permissions = builder.create('tenant_id = $token.tid').build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'create',
        where: 'tenant_id = $token.tid',
      });
    });

    it('should add CREATE permission without WHERE (FULL)', () => {
      const permissions = builder.create().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'create',
        full: true,
      });
    });

    it('should add UPDATE permission with WHERE clause', () => {
      const permissions = builder.update('owner = $token.sub').build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'update',
        where: 'owner = $token.sub',
      });
    });

    it('should add UPDATE permission without WHERE (FULL)', () => {
      const permissions = builder.update().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'update',
        full: true,
      });
    });

    it('should add DELETE permission with WHERE clause', () => {
      const permissions = builder.delete('owner = $token.sub').build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'delete',
        where: 'owner = $token.sub',
      });
    });

    it('should add DELETE permission without WHERE (FULL)', () => {
      const permissions = builder.delete().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'delete',
        full: true,
      });
    });
  });

  describe('Fluent API - Deny operations', () => {
    it('should deny SELECT operation', () => {
      const permissions = builder.denySelect().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        none: true,
      });
    });

    it('should deny CREATE operation', () => {
      const permissions = builder.denyCreate().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'create',
        none: true,
      });
    });

    it('should deny UPDATE operation', () => {
      const permissions = builder.denyUpdate().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'update',
        none: true,
      });
    });

    it('should deny DELETE operation', () => {
      const permissions = builder.denyDelete().build();

      expect(permissions.rules).toHaveLength(1);
      expect(permissions.rules[0]).toEqual({
        operation: 'delete',
        none: true,
      });
    });
  });

  describe('Fluent API - Chaining', () => {
    it('should chain multiple permission rules', () => {
      const permissions = builder
        .select('tenant_id = $token.tid')
        .create('tenant_id = $token.tid')
        .update('tenant_id = $token.tid')
        .delete('tenant_id = $token.tid')
        .build();

      expect(permissions.rules).toHaveLength(4);
      expect(permissions.rules[0]?.operation).toBe('select');
      expect(permissions.rules[1]?.operation).toBe('create');
      expect(permissions.rules[2]?.operation).toBe('update');
      expect(permissions.rules[3]?.operation).toBe('delete');
    });

    it('should support mixed permission types', () => {
      const permissions = builder
        .select() // FULL
        .create('$token != NONE')
        .update('owner = $token.sub')
        .denyDelete()
        .build();

      expect(permissions.rules).toHaveLength(4);
      expect(permissions.rules[0]).toEqual({
        operation: 'select',
        full: true,
      });
      expect(permissions.rules[1]).toEqual({
        operation: 'create',
        where: '$token != NONE',
      });
      expect(permissions.rules[2]).toEqual({
        operation: 'update',
        where: 'owner = $token.sub',
      });
      expect(permissions.rules[3]).toEqual({
        operation: 'delete',
        none: true,
      });
    });

    it('should return this for chaining after each operation', () => {
      const result1 = builder.select();
      expect(result1).toBe(builder);

      const result2 = builder.create();
      expect(result2).toBe(builder);

      const result3 = builder.update();
      expect(result3).toBe(builder);

      const result4 = builder.delete();
      expect(result4).toBe(builder);

      const result5 = builder.denySelect();
      expect(result5).toBe(builder);
    });
  });

  describe('Building output', () => {
    it('should include table name in build output', () => {
      const permissions = builder.select().build();

      expect(permissions.table).toBe('test_table');
    });

    it('should handle empty builder (no rules)', () => {
      const permissions = builder.build();

      expect(permissions.table).toBe('test_table');
      expect(permissions.rules).toHaveLength(0);
    });

    it('should preserve rule order', () => {
      const permissions = builder.delete().update().create().select().build();

      expect(permissions.rules[0]?.operation).toBe('delete');
      expect(permissions.rules[1]?.operation).toBe('update');
      expect(permissions.rules[2]?.operation).toBe('create');
      expect(permissions.rules[3]?.operation).toBe('select');
    });
  });

  describe('Complex scenarios', () => {
    it('should build tenant-scoped pattern manually', () => {
      const permissions = new PermissionBuilder('kv_store')
        .select('tenant_id = $token.tid')
        .create('tenant_id = $token.tid')
        .update('tenant_id = $token.tid')
        .delete('tenant_id = $token.tid')
        .build();

      expect(permissions.rules).toHaveLength(4);
      permissions.rules.forEach((rule) => {
        expect(rule.where).toBe('tenant_id = $token.tid');
      });
    });

    it('should build public read, private write pattern', () => {
      const permissions = new PermissionBuilder('articles')
        .select() // Anyone can read
        .create('$token != NONE') // Must be authenticated
        .update('$token != NONE')
        .delete('$token != NONE')
        .build();

      expect(permissions.rules[0]?.full).toBe(true);
      expect(permissions.rules[1]?.where).toBe('$token != NONE');
      expect(permissions.rules[2]?.where).toBe('$token != NONE');
      expect(permissions.rules[3]?.where).toBe('$token != NONE');
    });

    it('should build owner-only pattern manually', () => {
      const permissions = new PermissionBuilder('user_posts')
        .select('owner = $token.sub')
        .create() // Anyone can create
        .update('owner = $token.sub')
        .delete('owner = $token.sub')
        .build();

      expect(permissions.rules[0]?.where).toBe('owner = $token.sub');
      expect(permissions.rules[1]?.full).toBe(true);
      expect(permissions.rules[2]?.where).toBe('owner = $token.sub');
      expect(permissions.rules[3]?.where).toBe('owner = $token.sub');
    });

    it('should handle read-only table', () => {
      const permissions = new PermissionBuilder('read_only')
        .select()
        .denyCreate()
        .denyUpdate()
        .denyDelete()
        .build();

      expect(permissions.rules[0]?.full).toBe(true);
      expect(permissions.rules[1]?.none).toBe(true);
      expect(permissions.rules[2]?.none).toBe(true);
      expect(permissions.rules[3]?.none).toBe(true);
    });

    it('should handle complex WHERE clauses', () => {
      const complexWhere =
        'tenant_id = $token.tid AND (status = "active" OR owner = $token.sub)';
      const permissions = builder.select(complexWhere).build();

      expect(permissions.rules[0]?.where).toBe(complexWhere);
    });
  });
});

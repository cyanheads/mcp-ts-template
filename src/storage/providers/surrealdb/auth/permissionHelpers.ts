/**
 * @fileoverview Permission helpers for SurrealDB row-level security.
 * Provides utilities for defining and managing table-level permissions.
 * @module src/storage/providers/surrealdb/auth/permissionHelpers
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

/**
 * Permission operation types.
 */
export type PermissionOp = 'select' | 'create' | 'update' | 'delete';

/**
 * Permission configuration for a single operation.
 */
export interface PermissionRule {
  /** The operation this rule applies to */
  operation: PermissionOp;
  /** WHERE clause for the permission (empty = FULL) */
  where?: string;
  /** Whether to allow the operation unconditionally */
  full?: boolean;
  /** Whether to deny the operation unconditionally */
  none?: boolean;
}

/**
 * Complete permission configuration for a table.
 */
export interface TablePermissions {
  /** Table name */
  table: string;
  /** Permission rules for each operation */
  rules: PermissionRule[];
}

/**
 * Helper for building and applying table permissions.
 *
 * @remarks
 * Simplifies creation of row-level security policies with common patterns:
 * - Tenant-scoped access
 * - Owner-only access
 * - Role-based access
 * - Public read, private write
 *
 * @example
 * ```ts
 * const permissions = PermissionHelper.builder('kv_store')
 *   .select('tenant_id = $token.tid')
 *   .create('tenant_id = $token.tid')
 *   .update('tenant_id = $token.tid')
 *   .delete('tenant_id = $token.tid')
 *   .build();
 *
 * await permissionHelper.applyPermissions(permissions, context);
 * ```
 */
export class PermissionHelper {
  constructor(private readonly client: Surreal) {}

  /**
   * Apply permission rules to a table.
   *
   * @param permissions - Table permissions configuration
   * @param context - Request context for logging
   */
  async applyPermissions(
    permissions: TablePermissions,
    context: RequestContext,
  ): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[PermissionHelper] Applying permissions to table: ${permissions.table}`,
          context,
        );

        const query = this.buildPermissionsQuery(permissions);
        await this.client.query(query);

        logger.info('[PermissionHelper] Permissions applied', context);
      },
      {
        operation: 'PermissionHelper.applyPermissions',
        context,
        input: { table: permissions.table },
      },
    );
  }

  /**
   * Build DEFINE TABLE permissions query.
   */
  private buildPermissionsQuery(permissions: TablePermissions): string {
    const parts = [`DEFINE TABLE ${permissions.table} SCHEMAFULL`];

    const permissionClauses: string[] = [];

    for (const rule of permissions.rules) {
      if (rule.full) {
        permissionClauses.push(`FOR ${rule.operation} FULL`);
      } else if (rule.none) {
        permissionClauses.push(`FOR ${rule.operation} NONE`);
      } else if (rule.where) {
        permissionClauses.push(`FOR ${rule.operation} WHERE ${rule.where}`);
      }
    }

    if (permissionClauses.length > 0) {
      parts.push('PERMISSIONS');
      parts.push(permissionClauses.join('\n  '));
    }

    return parts.join('\n  ');
  }

  /**
   * Create a permission builder for a table.
   *
   * @param tableName - Name of the table
   * @returns Permission builder instance
   */
  static builder(tableName: string): PermissionBuilder {
    return new PermissionBuilder(tableName);
  }

  /**
   * Create tenant-scoped permissions (common pattern).
   *
   * @param tableName - Name of the table
   * @param tenantField - Field containing tenant ID (default: tenant_id)
   * @param tokenVar - Variable containing token (default: $token)
   * @returns Table permissions
   */
  static tenantScoped(
    tableName: string,
    tenantField: string = 'tenant_id',
    tokenVar: string = '$token',
  ): TablePermissions {
    const where = `${tenantField} = ${tokenVar}.tid`;
    return {
      table: tableName,
      rules: [
        { operation: 'select', where },
        { operation: 'create', where },
        { operation: 'update', where },
        { operation: 'delete', where },
      ],
    };
  }

  /**
   * Create owner-only permissions (common pattern).
   *
   * @param tableName - Name of the table
   * @param ownerField - Field containing owner ID (default: owner)
   * @param tokenVar - Variable containing token (default: $token)
   * @returns Table permissions
   */
  static ownerOnly(
    tableName: string,
    ownerField: string = 'owner',
    tokenVar: string = '$token',
  ): TablePermissions {
    const where = `${ownerField} = ${tokenVar}.sub`;
    return {
      table: tableName,
      rules: [
        { operation: 'select', where },
        { operation: 'create', full: true }, // Anyone can create
        { operation: 'update', where },
        { operation: 'delete', where },
      ],
    };
  }

  /**
   * Create public read, authenticated write permissions.
   *
   * @param tableName - Name of the table
   * @returns Table permissions
   */
  static publicRead(tableName: string): TablePermissions {
    return {
      table: tableName,
      rules: [
        { operation: 'select', full: true }, // Anyone can read
        { operation: 'create', where: '$token != NONE' }, // Must be authenticated
        { operation: 'update', where: '$token != NONE' },
        { operation: 'delete', where: '$token != NONE' },
      ],
    };
  }
}

/**
 * Fluent builder for table permissions.
 */
export class PermissionBuilder {
  private rules: PermissionRule[] = [];

  constructor(private readonly tableName: string) {}

  /**
   * Add SELECT permission rule.
   */
  select(where?: string): this {
    if (where) {
      this.rules.push({ operation: 'select', where });
    } else {
      this.rules.push({ operation: 'select', full: true });
    }
    return this;
  }

  /**
   * Add CREATE permission rule.
   */
  create(where?: string): this {
    if (where) {
      this.rules.push({ operation: 'create', where });
    } else {
      this.rules.push({ operation: 'create', full: true });
    }
    return this;
  }

  /**
   * Add UPDATE permission rule.
   */
  update(where?: string): this {
    if (where) {
      this.rules.push({ operation: 'update', where });
    } else {
      this.rules.push({ operation: 'update', full: true });
    }
    return this;
  }

  /**
   * Add DELETE permission rule.
   */
  delete(where?: string): this {
    if (where) {
      this.rules.push({ operation: 'delete', where });
    } else {
      this.rules.push({ operation: 'delete', full: true });
    }
    return this;
  }

  /**
   * Deny SELECT operation.
   */
  denySelect(): this {
    this.rules.push({
      operation: 'select',
      none: true,
    });
    return this;
  }

  /**
   * Deny CREATE operation.
   */
  denyCreate(): this {
    this.rules.push({
      operation: 'create',
      none: true,
    });
    return this;
  }

  /**
   * Deny UPDATE operation.
   */
  denyUpdate(): this {
    this.rules.push({
      operation: 'update',
      none: true,
    });
    return this;
  }

  /**
   * Deny DELETE operation.
   */
  denyDelete(): this {
    this.rules.push({
      operation: 'delete',
      none: true,
    });
    return this;
  }

  /**
   * Build the final permissions configuration.
   */
  build(): TablePermissions {
    return {
      table: this.tableName,
      rules: this.rules,
    };
  }
}

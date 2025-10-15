# Storage Module

**Version:** 2.4.6
**Module:** `src/storage`

Production-grade storage abstraction layer providing a unified interface for multiple backend implementations. Supports multi-tenancy, TTL expiration, batch operations, secure pagination, and comprehensive input validation.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Providers](#supported-providers)
4. [Features](#features)
5. [Usage Examples](#usage-examples)
6. [Adding a New Provider](#adding-a-new-provider)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The storage module provides a **runtime-agnostic, provider-agnostic persistence layer** for the MCP server. All storage operations flow through a single `StorageService` facade, which delegates to a configured backend provider via dependency injection.

### Key Principles

- **Abstraction**: Business logic never depends on concrete storage implementations
- **Multi-Tenancy**: All operations require a `tenantId` for data isolation
- **Security**: Centralized validation prevents path traversal, injection attacks, and cross-tenant data access
- **Flexibility**: Swap providers via environment variables without code changes
- **Edge-Ready**: Compatible with both Node.js and Cloudflare Workers runtimes

### Design Philosophy

```
Application Code
      ↓
StorageService (DI-injected facade)
      ↓
IStorageProvider interface
      ↓
Concrete Provider (in-memory, filesystem, supabase, surrealdb, cloudflare-kv, cloudflare-r2)
```

See the [root README](../../README.md#-configuration) for general storage configuration.

---

## Architecture

### Core Components

| Component               | Path                                                   | Purpose                                                                                                                                           |
| :---------------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`IStorageProvider`**  | [core/IStorageProvider.ts](core/IStorageProvider.ts)   | Interface contract all providers must implement. Defines `get`, `set`, `delete`, `list`, `getMany`, `setMany`, `deleteMany`, `clear`.             |
| **`StorageService`**    | [core/StorageService.ts](core/StorageService.ts)       | DI-managed facade. Validates inputs, extracts tenant ID from context, delegates to provider. Registered in `src/container/registrations/core.ts`. |
| **`storageFactory`**    | [core/storageFactory.ts](core/storageFactory.ts)       | Creates provider instances based on `STORAGE_PROVIDER_TYPE`. Handles runtime compatibility (serverless vs Node).                                  |
| **`storageValidation`** | [core/storageValidation.ts](core/storageValidation.ts) | Centralized input validation (tenant IDs, keys, prefixes, options). Provides cursor encoding/decoding with tenant binding.                        |

### Directory Structure

```
src/storage/
├── core/                   # Core abstractions and utilities
│   ├── IStorageProvider.ts       # Interface contract
│   ├── StorageService.ts         # DI-managed facade
│   ├── storageFactory.ts         # Provider instantiation
│   └── storageValidation.ts      # Input validation and security
├── providers/              # Concrete implementations
│   ├── inMemory/                 # In-memory (Map-based)
│   ├── fileSystem/               # Local filesystem (Node only)
│   ├── supabase/                 # PostgreSQL via Supabase
│   ├── surrealdb/                # SurrealDB with graph capabilities
│   └── cloudflare/               # KV and R2 (Workers only)
└── index.ts                # Barrel exports
```

---

## Supported Providers

### Provider Comparison

| Provider          | Runtime     | Setup  | Persistence | Edge | TTL Strategy                   | Batch Strategy    | Best For                                            |
| :---------------- | :---------- | :----- | :---------- | :--- | :----------------------------- | :---------------- | :-------------------------------------------------- |
| **In-Memory**     | Both        | None   | ❌ Volatile | ✅   | Proactive (`setTimeout`)       | Parallel          | Development, testing, caching                       |
| **FileSystem**    | Node only   | Low    | ✅ Durable  | ❌   | Lazy (delete on access)        | Parallel          | Local development, single-server deployments        |
| **Supabase**      | Both        | Medium | ✅ Durable  | ✅   | SQL filtering + lazy cleanup   | SQL batch upsert  | PostgreSQL-backed apps, Supabase users              |
| **SurrealDB**     | Both        | Medium | ✅ Durable  | ✅   | Query filtering + lazy cleanup | Transaction-based | Graph queries, complex data models, SurrealDB Cloud |
| **Cloudflare KV** | Worker only | Low    | ✅ Durable  | ✅   | Native KV TTL                  | Parallel          | Edge KV storage, global distribution                |
| **Cloudflare R2** | Worker only | Low    | ✅ Durable  | ✅   | Envelope metadata (lazy)       | Parallel          | Edge blob storage, large objects (up to 5TB)        |

### Configuration Quick Reference

**In-Memory** (default):

```bash
STORAGE_PROVIDER_TYPE=in-memory
# No additional config required
```

**FileSystem**:

```bash
STORAGE_PROVIDER_TYPE=filesystem
STORAGE_FILESYSTEM_PATH=/path/to/storage  # Required
```

**Supabase**:

```bash
STORAGE_PROVIDER_TYPE=supabase
SUPABASE_URL=https://yourproject.supabase.co         # Required
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key      # Required
```

Requires `kv_store` table:

```sql
CREATE TABLE kv_store (
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, key)
);
CREATE INDEX idx_kv_store_expires ON kv_store(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_kv_store_prefix ON kv_store(tenant_id, key text_pattern_ops);
```

**SurrealDB**:

```bash
STORAGE_PROVIDER_TYPE=surrealdb
SURREALDB_URL=wss://cloud.surrealdb.com/rpc          # Required (ws:// or wss://)
SURREALDB_NAMESPACE=production                       # Required
SURREALDB_DATABASE=mcp_server                        # Required
SURREALDB_USERNAME=root                              # Optional (for auth)
SURREALDB_PASSWORD=secret                            # Optional (for auth)
SURREALDB_TABLE_NAME=kv_store                        # Optional (default: kv_store)
```

Initialize schema: `surreal import docs/surrealdb-schema.surql` or see [schema file](../../docs/surrealdb-schema.surql).

**Cloudflare KV**:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "your-kv-namespace-id"
```

```bash
STORAGE_PROVIDER_TYPE=cloudflare-kv
```

**Cloudflare R2**:

```toml
# wrangler.toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"
```

```bash
STORAGE_PROVIDER_TYPE=cloudflare-r2
```

### Provider-Specific Notes

**SurrealDB Advanced Features:**

- Modular architecture: Core, Auth, Graph, Events, Functions, Migrations, Introspection
- Transaction support: `provider.withTransaction(async (client) => { ... })`
- Query builder: `select(...).from(...).where(...).limit(...)`
- Graph operations: Available via `GraphService` (relationships, traversals, pathfinding)

**Cloudflare KV:**

- Eventually consistent (60s max propagation)
- Strong consistency available with `cacheTtl=0`
- `list()` operations limited to 1000 keys per request

**Cloudflare R2:**

- S3-compatible blob storage
- 5TB per object limit (vs 25MB for KV)
- **Note**: `list()` does not filter expired entries (performance cost)

**FileSystem:**

- Each key is a JSON file with envelope metadata
- Supports nested keys via subdirectories
- `list()` with TTL filtering can be slow for large datasets

---

## Features

### Multi-Tenancy

**All storage operations are scoped to a tenant.** The `StorageService` extracts `tenantId` from `RequestContext` and validates it before delegating to providers.

**Tenant ID Sources:**

- **With Auth**: Auto-extracted from JWT claim `'tid'` → propagated via `requestContextService.withAuthInfo()`
- **STDIO**: Explicitly set via `requestContextService.createRequestContext({ tenantId: '...' })`

**Validation Rules:**

- Maximum length: 128 characters
- Allowed characters: `[a-zA-Z0-9._-]`
- Must start and end with alphanumeric
- No consecutive dots (`..`) or path traversal sequences (`../`, `..\\`)

### Time-To-Live (TTL)

All providers support TTL via `StorageOptions.ttl` (in seconds). **Important:** `ttl=0` (immediate expiration) is handled correctly across all providers. See [Provider Comparison](#provider-comparison) table for implementation strategies.

### Batch Operations

Efficient alternatives to multiple individual calls:

| Method                   | Purpose                        | Performance Gain                           |
| :----------------------- | :----------------------------- | :----------------------------------------- |
| **`getMany<T>(keys[])`** | Fetch multiple values          | 5-100x faster (depends on provider)        |
| **`setMany(entries)`**   | Store multiple key-value pairs | 20-100x faster (single SQL batch/parallel) |
| **`deleteMany(keys[])`** | Delete multiple keys           | Similar to `setMany`                       |

**Example:**

```typescript
// ❌ Slow (100 round-trips):
for (const key of keys) {
  await storage.set(key, value, context);
}

// ✅ Fast (1 batch or parallel):
await storage.setMany(entries, context);
```

### Pagination

**Opaque Cursor System:**

- `list()` returns `ListResult` with `keys[]` and optional `nextCursor`
- Cursors are tenant-bound (base64-encoded with HMAC validation)
- Page sizes are server-controlled (default: 1000)
- Invalid cursors throw `JsonRpcErrorCode.InvalidParams` (-32602)

**Usage:**

```typescript
let cursor: string | undefined;
const allKeys: string[] = [];

do {
  const { keys, nextCursor } = await storage.list('user:', context, { cursor });
  allKeys.push(...keys);
  cursor = nextCursor;
} while (cursor);
```

For resource pagination (MCP spec), use utilities from `@/utils/index.js`:

- `extractCursor(meta)`: Extract cursor from request metadata
- `paginateArray(items, cursor, defaultPageSize, maxPageSize, context)`: Paginate in-memory arrays

For storage-specific cursors, use `encodeCursor/decodeCursor` from `@/storage/core/storageValidation.js`.

### Validation & Security

**Defense in Depth:**

1. **Service Layer**: `StorageService` validates all inputs before reaching providers
2. **Provider Layer**: Providers perform additional sanitization (e.g., path traversal checks)
3. **Cursor Binding**: Pagination cursors are tenant-bound to prevent cross-tenant attacks
4. **Fail Closed**: Invalid input throws `McpError` (never coerced or silently ignored)

**Input Validation Rules:**

| Input          | Max Length | Allowed Characters    | Additional Rules                                             |
| :------------- | :--------- | :-------------------- | :----------------------------------------------------------- |
| **Tenant ID**  | 128        | `[a-zA-Z0-9._-]`      | Must start/end with alphanumeric, no `..`, no path traversal |
| **Key**        | 512        | Any except null bytes | No leading/trailing whitespace, not empty                    |
| **Prefix**     | 512        | Any except null bytes | Can be empty string                                          |
| **TTL**        | N/A        | Non-negative integer  | `0` = immediate expiration                                   |
| **List Limit** | N/A        | Positive integer      | Default: 1000                                                |

**Common Attack Vectors (Mitigated):**

| Attack                       | Mitigation                                                          |
| :--------------------------- | :------------------------------------------------------------------ |
| **Cross-tenant data access** | Cursor validation, tenant ID validation, namespace isolation        |
| **Path traversal**           | Input sanitization, path resolution checks, allowlist characters    |
| **Resource exhaustion**      | Pagination limits, key/prefix length limits, batch operation limits |
| **Injection attacks**        | Parameterized queries (Supabase/SurrealDB), input sanitization      |
| **Null byte injection**      | Validation rejects keys containing `\0`                             |

---

## Usage Examples

### Basic Operations

```typescript
import { container } from 'tsyringe';
import { StorageService } from '@/storage/index.js';
import { requestContextService } from '@/utils/index.js';

const storage = container.resolve(StorageService);
const context = requestContextService.createRequestContext({
  operation: 'storageExample',
  tenantId: 'tenant-123',
});

// Set with TTL
await storage.set('session:abc', { userId: 'user-456' }, context, {
  ttl: 3600,
});

// Get
const session = await storage.get<{ userId: string }>('session:abc', context);

// Delete
await storage.delete('session:abc', context);
```

### Batch Operations

```typescript
// Batch set
const entries = new Map([
  ['user:alice', { name: 'Alice', role: 'admin' }],
  ['user:bob', { name: 'Bob', role: 'user' }],
]);
await storage.setMany(entries, context, { ttl: 86400 });

// Batch get
const profiles = await storage.getMany<{ name: string; role: string }>(
  ['user:alice', 'user:bob'],
  context,
);

// Batch delete
const deletedCount = await storage.deleteMany(
  ['user:alice', 'user:bob'],
  context,
);
```

### Pagination

```typescript
// Stream keys in batches
async function* streamKeys(prefix: string, context: RequestContext) {
  let cursor: string | undefined;

  do {
    const { keys, nextCursor } = await storage.list(prefix, context, {
      limit: 100,
      cursor,
    });
    yield* keys;
    cursor = nextCursor;
  } while (cursor);
}

for await (const key of streamKeys('user:', context)) {
  console.log(key);
}
```

### Usage from Tools

```typescript
import type { ToolDefinition } from '@/mcp-server/tools/utils/index.js';
import { z } from 'zod';

const myStorageTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> = {
  name: 'my_storage_tool',
  description: 'Stores data using the storage service',
  inputSchema: z.object({ key: z.string(), value: z.unknown() }),
  outputSchema: z.object({ success: z.boolean(), key: z.string() }),

  logic: async (input, appContext, sdkContext) => {
    const { StorageService } = await import('@/storage/index.js');
    const { container } = await import('tsyringe');
    const storage = container.resolve(StorageService);

    // appContext already contains tenantId from JWT/context
    await storage.set(input.key, input.value, appContext);
    return { success: true, key: input.key };
  },
};
```

### With Authentication Context

```typescript
import { requestContextService } from '@/utils/index.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';

// After JWT verification:
const authInfo: AuthInfo = await jwtStrategy.verify(token);
const context = requestContextService.withAuthInfo(authInfo);

// tenantId is now available in context
await storage.set('user:data', { ... }, context);
```

---

## Adding a New Provider

This guide walks through creating a new storage provider. For a complete example, see existing providers in [src/storage/providers/](providers/).

### Prerequisites

- Familiarity with [IStorageProvider](core/IStorageProvider.ts) interface
- Provider-specific SDK installed (e.g., `bun add redis`)
- Environment variables planned

### Step 1: Create Provider File

**Location:** `src/storage/providers/{provider-name}/{provider-name}Provider.ts`

**Template Structure:**

```typescript
/**
 * @fileoverview {Provider} storage provider implementation.
 * @module src/storage/providers/{provider-name}/{provider-name}Provider
 */
import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

const DEFAULT_LIST_LIMIT = 1000;

/**
 * {Provider} storage provider implementation.
 *
 * Features:
 * - Native TTL support
 * - Batch operations
 * - Cursor-based pagination
 */
export class {Provider}Provider implements IStorageProvider {
  constructor(private readonly client: {ClientType}) {
    if (!client) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        '{Provider}Provider requires a valid client instance.',
      );
    }
  }

  /**
   * Namespace keys by tenant: {tenantId}:{key}
   */
  private getStorageKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  // Implement all IStorageProvider methods...
}
```

### Step 2: Implement IStorageProvider Methods

All 8 methods are required:

1. **`get<T>(tenantId, key, context): Promise<T | null>`**
   - Return `null` if key doesn't exist or is expired
   - Parse stored JSON and return typed value
   - Use `ErrorHandler.tryCatch` wrapper

2. **`set(tenantId, key, value, context, options?): Promise<void>`**
   - Serialize value to JSON
   - Apply TTL if `options?.ttl` provided
   - Namespace key by tenant

3. **`delete(tenantId, key, context): Promise<boolean>`**
   - Return `true` if key existed, `false` otherwise
   - Log deletion with `logger.debug`

4. **`list(tenantId, prefix, context, options?): Promise<ListResult>`**
   - Filter keys by `{tenantId}:{prefix}*` pattern
   - Return paginated results with `nextCursor`
   - Strip tenant prefix from returned keys

5. **`getMany<T>(tenantId, keys[], context): Promise<Map<string, T>>`**
   - Batch fetch multiple keys (use provider-specific batch operations)
   - Return `Map<string, T>` with only found keys
   - Skip unparseable values

6. **`setMany(tenantId, entries, context, options?): Promise<void>`**
   - Batch write multiple key-value pairs
   - Apply TTL to all entries if specified
   - Use transactions if provider supports them

7. **`deleteMany(tenantId, keys[], context): Promise<number>`**
   - Batch delete multiple keys
   - Return count of deleted keys

8. **`clear(tenantId, context): Promise<number>`**
   - Delete all keys for tenant
   - Return count of deleted keys
   - **DESTRUCTIVE**: Log with `logger.info`

**Key Implementation Patterns:**

```typescript
// Wrap all methods with ErrorHandler.tryCatch
async get<T>(tenantId: string, key: string, context: RequestContext): Promise<T | null> {
  return ErrorHandler.tryCatch(
    async () => {
      logger.debug(`[{Provider}] Getting key: ${key}`, context);
      // Implementation...
    },
    {
      operation: '{Provider}Provider.get',
      context,
      input: { tenantId, key },
    },
  );
}

// Handle TTL appropriately for provider
async set(tenantId: string, key: string, value: unknown, context: RequestContext, options?: StorageOptions): Promise<void> {
  const serialized = JSON.stringify(value);

  if (options?.ttl !== undefined) {
    // Provider-specific TTL implementation
    // Option A: Native TTL (Cloudflare KV, Redis)
    await this.client.setWithExpiry(key, serialized, options.ttl);

    // Option B: Envelope metadata (FileSystem, R2)
    const envelope = {
      __mcp: { v: 1, expiresAt: Date.now() + options.ttl * 1000 },
      value,
    };
    await this.client.set(key, JSON.stringify(envelope));

    // Option C: Database timestamp (Supabase, SurrealDB)
    const expiresAt = new Date(Date.now() + options.ttl * 1000);
    await this.db.upsert({ tenant_id: tenantId, key, value: serialized, expires_at: expiresAt });
  }
}
```

### Step 3: Add to Factory

**File:** `src/storage/core/storageFactory.ts`

1. Import the provider:

```typescript
import { {Provider}Provider } from '@/storage/providers/{provider-name}/{provider-name}Provider.js';
```

2. Add to `StorageFactoryDeps` interface:

```typescript
export interface StorageFactoryDeps {
  // ... existing deps ...
  readonly {provider}Client?: {ClientType};
}
```

3. Add case to switch statement:

```typescript
case '{provider-name}':
  if (!config.{provider}?.url) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      '{PROVIDER}_URL must be set for the {provider-name} storage provider.',
      context,
    );
  }
  if (deps.{provider}Client) {
    return new {Provider}Provider(deps.{provider}Client);
  }
  return container.resolve({Provider}Provider);
```

### Step 4: Register with DI (if needed)

If your provider requires a pre-configured client, register it in the DI container.

**File:** `src/container/tokens.ts`

```typescript
export const {Provider}Client = Symbol.for('{Provider}Client');
```

**File:** `src/container/registrations/core.ts`

```typescript
import { {Provider}Client } from '@/container/tokens.js';
import { {Provider}Provider } from '@/storage/providers/{provider-name}/{provider-name}Provider.js';

// In registerCoreServices():
if (config.storage.providerType === '{provider-name}' && config.{provider}?.url) {
  const client = await create{Provider}Client(config.{provider}.url);
  container.registerInstance({Provider}Client, client);

  container.register({Provider}Provider, {
    useFactory: (c) => {
      const client = c.resolve<{ClientType}>({Provider}Client);
      return new {Provider}Provider(client);
    },
  });
}
```

### Step 5: Configuration

**File:** `src/config/index.ts`

1. Add environment variables to schema:

```typescript
const configSchema = z.object({
  // ... existing fields ...

  {provider}: z.object({
    url: z.string().url().optional(),
    // ... other config fields ...
  }).optional(),

  storage: z.object({
    providerType: z.enum([
      'in-memory',
      'filesystem',
      'supabase',
      'surrealdb',
      'cloudflare-kv',
      'cloudflare-r2',
      '{provider-name}', // Add this
    ]).default('in-memory'),
    // ...
  }),
});
```

2. Map environment variables:

```typescript
const config: z.infer<typeof configSchema> = {
  // ... existing mappings ...

  {provider}: {
    url: process.env.{PROVIDER}_URL,
    // ... other fields ...
  },
};
```

### Step 6: Testing

**File:** `tests/storage/providers/{provider-name}/{provider-name}Provider.test.ts`

Use the compliance test suite to ensure your provider meets all interface requirements:

```typescript
import { describe, beforeAll, afterAll } from 'vitest';
import { {Provider}Provider } from '@/storage/providers/{provider-name}/{provider-name}Provider.js';
import { runComplianceTests } from '../storageProviderCompliance.test.js';

describe('{Provider}Provider Compliance', () => {
  let provider: {Provider}Provider;

  beforeAll(async () => {
    // Setup provider instance
    provider = new {Provider}Provider(client);
  });

  afterAll(async () => {
    // Cleanup
  });

  // Run standard compliance tests
  runComplianceTests(() => provider);
});

describe('{Provider}Provider Specific Tests', () => {
  // Test provider-specific features, edge cases, etc.
});
```

Run tests: `bun run test tests/storage/providers/{provider-name}/`

### Step 7: Documentation

1. **Update this README:**
   - Add provider to [Provider Comparison](#provider-comparison) table
   - Add configuration example to [Configuration Quick Reference](#configuration-quick-reference)
   - Add provider-specific notes if applicable

2. **Update root README:**
   - Add environment variables to configuration table

3. **Update AGENTS.md:**
   - Add provider to storage provider list

### Reference Implementation

See complete examples:

- Simple: [InMemoryProvider](providers/inMemory/inMemoryProvider.ts)
- Intermediate: [FileSystemProvider](providers/fileSystem/fileSystemProvider.ts)
- Advanced: [SurrealKvProvider](providers/surrealdb/kv/surrealKvProvider.ts)

---

## Troubleshooting

### Common Errors

| Error                                                                     | Cause                               | Solution                                                                                                         |
| :------------------------------------------------------------------------ | :---------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `Tenant ID is required for storage operations`                            | `context.tenantId` is missing       | **STDIO**: Set explicitly in `createRequestContext({ tenantId: '...' })`<br>**HTTP**: Ensure JWT has `tid` claim |
| `Invalid tenant ID: exceeds maximum length of 128 characters`             | Tenant ID too long                  | Use shorter identifiers (UUIDs or short hashes)                                                                  |
| `Invalid cursor format or tenant mismatch`                                | Cursor tampered or wrong tenant     | Never parse/modify cursors client-side. Use same tenant that generated cursor.                                   |
| `STORAGE_FILESYSTEM_PATH must be set for the filesystem storage provider` | Missing env var                     | Add `STORAGE_FILESYSTEM_PATH=/path/to/storage` to `.env`                                                         |
| `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`                  | Missing Supabase credentials        | Add credentials to `.env`                                                                                        |
| SurrealDB connection timeout                                              | Incorrect URL, firewall, or auth    | Verify URL format (`ws://` or `wss://`), check firewall, verify credentials                                      |
| Cloudflare KV/R2 not available                                            | Provider used in non-serverless env | Use `in-memory`, `filesystem`, or other providers locally                                                        |

### Performance Tips

**Use Batch Operations:**

```typescript
// ❌ 100 round-trips:
for (const key of keys) {
  await storage.set(key, value, context);
}

// ✅ 1 batch or parallel:
await storage.setMany(entries, context);
```

**TTL Cleanup Strategies:**

| Provider          | Strategy                 | Recommendation                                                  |
| :---------------- | :----------------------- | :-------------------------------------------------------------- |
| **In-Memory**     | Proactive (`setTimeout`) | Automatic (no action needed)                                    |
| **FileSystem**    | Lazy (delete on access)  | Use cron for large datasets                                     |
| **Supabase**      | Lazy + periodic SQL      | Run `DELETE FROM kv_store WHERE expires_at < NOW()` daily       |
| **SurrealDB**     | Lazy + periodic query    | Run `DELETE FROM kv_store WHERE expires_at < time::now()` daily |
| **Cloudflare KV** | Native (automatic)       | Automatic (no action needed)                                    |
| **Cloudflare R2** | Lazy (delete on access)  | Consider R2 lifecycle policies                                  |

**Provider-Specific Optimizations:**

- **Supabase**: Create indexes on `(tenant_id, key)` and `expires_at`
- **SurrealDB**: Use transactions for batch writes, leverage query builder
- **Cloudflare KV**: Use `cacheTtl` for reads, minimize `list()` calls
- **Cloudflare R2**: Minimize `list()` calls (expensive), use lifecycle policies
- **FileSystem**: Avoid `list()` with TTL on large directories, use SSD

---

**End of Storage Module Documentation**

For general MCP server documentation, see the [root README](../../README.md).
For strict development rules and agent guidance, see [AGENTS.md](../../AGENTS.md).

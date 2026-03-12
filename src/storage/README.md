# Storage Module

Version: 2.4.6 | Module: `src/storage`

Storage abstraction layer with a unified interface across multiple backends. Supports multi-tenancy, TTL, batch operations, secure pagination, and input validation.

## Overview

All storage operations flow through `StorageService` (DI-injected facade), which delegates to a configured backend provider. Business logic never depends on concrete implementations.

- All operations require a `tenantId` for data isolation
- Centralized validation prevents path traversal, injection, and cross-tenant access
- Swap providers via environment variables without code changes
- Compatible with both Node.js and Cloudflare Workers

```
Application Code
      ↓
StorageService (DI-injected facade)
      ↓
IStorageProvider interface
      ↓
Concrete Provider (in-memory, filesystem, supabase, cloudflare-kv, cloudflare-r2)
```

See the [root README](../../README.md#configuration) for general storage configuration.

---

## Architecture

### Core components

| Component           | Path                                                   | Purpose                                                                                                          |
| :------------------ | :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `IStorageProvider`  | [core/IStorageProvider.ts](core/IStorageProvider.ts)   | Interface contract. Defines `get`, `set`, `delete`, `list`, `getMany`, `setMany`, `deleteMany`, `clear`.         |
| `StorageService`    | [core/StorageService.ts](core/StorageService.ts)       | DI-managed facade. Validates inputs, extracts tenant ID from context, delegates to provider.                     |
| `storageFactory`    | [core/storageFactory.ts](core/storageFactory.ts)       | Creates provider instances based on `STORAGE_PROVIDER_TYPE`. Handles runtime compatibility (serverless vs Node). |
| `storageValidation` | [core/storageValidation.ts](core/storageValidation.ts) | Input validation (tenant IDs, keys, prefixes, options). Cursor encoding/decoding with tenant binding.            |

### Directory structure

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
│   └── cloudflare/               # KV and R2 (Workers only)
└── index.ts                # Barrel exports
```

---

## Supported providers

### Provider comparison

| Provider       | Runtime     | Setup  | Persistent | Edge | TTL Strategy                 | Batch Strategy   | Best for                            |
| :------------- | :---------- | :----- | :--------- | :--- | :--------------------------- | :--------------- | :---------------------------------- |
| In-Memory      | Both        | None   | No         | Yes  | Proactive (`setTimeout`)     | Parallel         | Development, testing, caching       |
| FileSystem     | Node only   | Low    | Yes        | No   | Lazy (delete on access)      | Parallel         | Local dev, single-server            |
| Supabase       | Both        | Medium | Yes        | Yes  | SQL filtering + lazy cleanup | SQL batch upsert | PostgreSQL-backed apps              |
| Cloudflare KV  | Worker only | Low    | Yes        | Yes  | Native KV TTL                | Parallel         | Edge KV, global distribution        |
| Cloudflare R2  | Worker only | Low    | Yes        | Yes  | Envelope metadata (lazy)     | Parallel         | Edge blob storage, large objects    |

### Configuration quick reference

In-Memory (default):

```bash
STORAGE_PROVIDER_TYPE=in-memory
# No additional config required
```

FileSystem:

```bash
STORAGE_PROVIDER_TYPE=filesystem
STORAGE_FILESYSTEM_PATH=/path/to/storage  # Required
```

Supabase:

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

Cloudflare KV:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "your-kv-namespace-id"
```

```bash
STORAGE_PROVIDER_TYPE=cloudflare-kv
```

Cloudflare R2:

```toml
# wrangler.toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"
```

```bash
STORAGE_PROVIDER_TYPE=cloudflare-r2
```

### Provider-specific notes

- Cloudflare KV: eventually consistent (60s max propagation), `cacheTtl=0` for strong consistency, `list()` limited to 1000 keys per request
- Cloudflare R2: S3-compatible, 5TB per object (vs 25MB for KV), `list()` does not filter expired entries
- FileSystem: each key is a JSON file with envelope metadata, nested keys via subdirectories, `list()` with TTL can be slow on large datasets

---

## Features

### Multi-tenancy

All storage operations are scoped to a tenant. `StorageService` extracts `tenantId` from `RequestContext` and validates it before delegating to providers.

Tenant ID sources:

- With auth: auto-extracted from JWT `tid` claim (middleware sets ALS, `createRequestContext` reads it)
- STDIO: explicitly set via `requestContextService.createRequestContext({ tenantId: '...' })`

Validation: max 128 chars, `[a-zA-Z0-9._-]`, must start/end alphanumeric, no `..` or path traversal.

### TTL

All providers support TTL via `StorageOptions.ttl` (in seconds). `ttl=0` (immediate expiration) is handled correctly across all providers.

### Batch operations

| Method              | Purpose                        | Performance Gain                           |
| :------------------ | :----------------------------- | :----------------------------------------- |
| `getMany<T>(keys[])` | Fetch multiple values          | 5-100x faster (depends on provider)        |
| `setMany(entries)`   | Store multiple key-value pairs | 20-100x faster (single SQL batch/parallel) |
| `deleteMany(keys[])` | Delete multiple keys           | Similar to `setMany`                       |

Example:

```typescript
// ❌ Slow (100 round-trips):
for (const key of keys) {
  await storage.set(key, value, context);
}

// ✅ Fast (1 batch or parallel):
await storage.setMany(entries, context);
```

### Pagination

`list()` returns `ListResult` with `keys[]` and optional `nextCursor`. Cursors are tenant-bound (base64-encoded with HMAC validation), server-controlled page sizes (default: 1000). Invalid cursors throw `InvalidParams` (-32602).

Usage:

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

### Validation and security

Validation is layered: `StorageService` validates all inputs before reaching providers, providers perform additional sanitization (path traversal checks), cursors are tenant-bound, and invalid input always throws `McpError`.

Input validation:

| Input      | Max Length | Allowed Characters    | Additional Rules                                             |
| :--------- | :--------- | :-------------------- | :----------------------------------------------------------- |
| Tenant ID  | 128        | `[a-zA-Z0-9._-]`      | Must start/end with alphanumeric, no `..`, no path traversal |
| Key        | 512        | Any except null bytes | No leading/trailing whitespace, not empty                    |
| Prefix     | 512        | Any except null bytes | Can be empty string                                          |
| TTL        | N/A        | Non-negative integer  | `0` = immediate expiration                                   |
| List Limit | N/A        | Positive integer      | Default: 1000                                                |

Mitigated attack vectors:

| Attack                  | Mitigation                                                          |
| :---------------------- | :------------------------------------------------------------------ |
| Cross-tenant access     | Cursor validation, tenant ID validation, namespace isolation        |
| Path traversal          | Input sanitization, path resolution checks, allowlist characters    |
| Resource exhaustion     | Pagination limits, key/prefix length limits, batch operation limits |
| Injection attacks       | Parameterized queries (Supabase), input sanitization                |
| Null byte injection     | Validation rejects keys containing `\0`                             |

---

## Usage examples

### Basic operations

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

### Batch operations

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

### Usage from tools

```typescript
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
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

### With authentication context

```typescript
import { requestContextService } from '@/utils/internal/requestContext.js';

// Inside auth middleware continuation (ALS is already populated):
const context = requestContextService.createRequestContext({
  operation: 'myOperation',
});
// tenantId is auto-resolved from ALS auth context
await storage.set('user:data', { ... }, context);

// Or explicitly for STDIO:
const context = requestContextService.createRequestContext({
  operation: 'myOperation',
  tenantId: 'my-tenant',
});
```

---

## Adding a new provider

For a working example, see existing providers in [src/storage/providers/](providers/).

### Step 1: Create provider file

`src/storage/providers/{provider-name}/{provider-name}Provider.ts`:

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

### Step 2: Implement IStorageProvider methods

All 8 methods are required:

| Method | Returns | Notes |
| :--- | :--- | :--- |
| `get<T>(tenantId, key, context)` | `T \| null` | Return `null` if missing/expired. Use `ErrorHandler.tryCatch`. |
| `set(tenantId, key, value, context, options?)` | `void` | Serialize to JSON. Apply TTL if provided. Namespace by tenant. |
| `delete(tenantId, key, context)` | `boolean` | `true` if existed, `false` otherwise. |
| `list(tenantId, prefix, context, options?)` | `ListResult` | Filter by `{tenantId}:{prefix}*`. Return paginated, strip tenant prefix. |
| `getMany<T>(tenantId, keys[], context)` | `Map<string, T>` | Batch fetch, only found keys. Skip unparseable. |
| `setMany(tenantId, entries, context, options?)` | `void` | Batch write. Apply TTL. Use transactions if supported. |
| `deleteMany(tenantId, keys[], context)` | `number` | Return count of deleted keys. |
| `clear(tenantId, context)` | `number` | Delete all for tenant. Return count. Destructive — log with `logger.info`. |

Key implementation patterns:

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

    // Option C: Database timestamp (Supabase)
    const expiresAt = new Date(Date.now() + options.ttl * 1000);
    await this.db.upsert({ tenant_id: tenantId, key, value: serialized, expires_at: expiresAt });
  }
}
```

### Step 3: Add to factory

`src/storage/core/storageFactory.ts`:

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

If the provider needs a pre-configured client, register in DI.

`src/container/core/tokens.ts`:

```typescript
export const {Provider}Client = Symbol.for('{Provider}Client');
```

`src/container/registrations/core.ts`:

```typescript
import { {Provider}Client } from '@/container/core/tokens.js';
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

`src/config/index.ts`:

1. Add environment variables to schema:

```typescript
const configSchema = z.object({
  // ... existing fields ...

  {provider}: z.object({
    url: z.url().optional(),
    // ... other config fields ...
  }).optional(),

  storage: z.object({
    providerType: z.enum([
      'in-memory',
      'filesystem',
      'supabase',
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

`tests/storage/providers/{provider-name}/{provider-name}Provider.test.ts`:

Use the compliance test suite to verify your provider meets the interface:

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

Update this README (provider comparison table, config quick reference), root README (env vars), and AGENTS.md (provider list).

### Reference implementations

- Simple: [InMemoryProvider](providers/inMemory/inMemoryProvider.ts)
- Intermediate: [FileSystemProvider](providers/fileSystem/fileSystemProvider.ts)

---

## Troubleshooting

### Common errors

| Error                                                                     | Cause                               | Solution                                                                                             |
| :------------------------------------------------------------------------ | :---------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `Tenant ID is required for storage operations`                            | `context.tenantId` is missing       | STDIO: set in `createRequestContext({ tenantId })`. HTTP: ensure JWT has `tid` claim.                |
| `Invalid tenant ID: exceeds maximum length of 128 characters`             | Tenant ID too long                  | Use shorter identifiers (UUIDs or short hashes)                                                      |
| `Invalid cursor format or tenant mismatch`                                | Cursor tampered or wrong tenant     | Never parse/modify cursors client-side. Use same tenant that generated cursor.                       |
| `STORAGE_FILESYSTEM_PATH must be set for the filesystem storage provider` | Missing env var                     | Add `STORAGE_FILESYSTEM_PATH=/path/to/storage` to `.env`                                             |
| `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`                  | Missing Supabase credentials        | Add credentials to `.env`                                                                            |
| Cloudflare KV/R2 not available                                            | Provider used in non-serverless env | Use `in-memory`, `filesystem`, or other providers locally                                            |

### Performance tips

Use batch operations (`setMany`/`getMany`/`deleteMany`) instead of loops. Single batch vs 100 round-trips is 5-100x faster.

TTL cleanup strategies:

| Provider       | Strategy                 | Recommendation                                            |
| :------------- | :----------------------- | :-------------------------------------------------------- |
| In-Memory      | Proactive (`setTimeout`) | Automatic                                                 |
| FileSystem     | Lazy (delete on access)  | Use cron for large datasets                               |
| Supabase       | Lazy + periodic SQL      | Run `DELETE FROM kv_store WHERE expires_at < NOW()` daily |
| Cloudflare KV  | Native (automatic)       | Automatic                                                 |
| Cloudflare R2  | Lazy (delete on access)  | Consider R2 lifecycle policies                            |

Provider-specific:

- Supabase: create indexes on `(tenant_id, key)` and `expires_at`
- Cloudflare KV: use `cacheTtl` for reads, minimize `list()` calls
- Cloudflare R2: minimize `list()` calls (expensive), use lifecycle policies
- FileSystem: avoid `list()` with TTL on large directories, use SSD

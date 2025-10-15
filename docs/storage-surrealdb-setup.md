# SurrealDB Storage Provider Setup Guide

This guide provides step-by-step instructions for configuring and using the SurrealDB storage provider with the MCP TypeScript template.

## Overview

SurrealDB is a multi-model database that combines relational, document, graph, and other database paradigms into a single engine. The storage provider supports both local SurrealDB instances and Surreal Cloud deployments.

## Prerequisites

- SurrealDB instance (local or Surreal Cloud account)
- Access credentials (username/password or authentication token)
- Network connectivity to the SurrealDB endpoint

## Quick Start

### 1. Set Environment Variables

Add the following to your `.env` file:

```bash
# Storage provider selection
STORAGE_PROVIDER_TYPE=surrealdb

# SurrealDB connection (required)
SURREALDB_URL=wss://cloud.surrealdb.com/rpc
SURREALDB_NAMESPACE=my-namespace
SURREALDB_DATABASE=my-database

# Authentication (optional, but recommended for production)
SURREALDB_USERNAME=root
SURREALDB_PASSWORD=your-secure-password

# Table name (optional, defaults to 'kv_store')
SURREALDB_TABLE_NAME=kv_store
```

### 2. Initialize Database Schema

Before first use, you must create the `kv_store` table and indexes in your SurrealDB instance.

#### Option A: Using the SurrealDB CLI

```bash
surreal sql \
  --endpoint wss://cloud.surrealdb.com/rpc \
  --namespace my-namespace \
  --database my-database \
  --username root \
  --password your-password \
  --file docs/surrealdb-schema.surql
```

#### Option B: Using Surrealist GUI

1. Download and install [Surrealist](https://surrealdb.com/surrealist)
2. Connect to your SurrealDB instance
3. Open the SQL Editor
4. Copy the contents of `docs/surrealdb-schema.surql`
5. Execute the schema definition

#### Option C: Programmatic Initialization

```typescript
import Surreal from 'surrealdb';
import fs from 'fs';

const db = new Surreal();

await db.connect('wss://cloud.surrealdb.com/rpc', {
  namespace: 'my-namespace',
  database: 'my-database',
  auth: {
    username: 'root',
    password: 'your-password'
  }
});

const schema = fs.readFileSync('docs/surrealdb-schema.surql', 'utf-8');
await db.query(schema);

console.log('Schema initialized successfully');
await db.close();
```

### 3. Start Your Application

Once the schema is initialized and environment variables are set, start your MCP server:

```bash
bun run dev:stdio
# or
bun run dev:http
```

The SurrealDB provider will connect automatically on startup.

## Connection Endpoints

### Local Development

For local development, run a SurrealDB instance:

```bash
# Using Docker
docker run --rm -p 8000:8000 surrealdb/surrealdb:latest start

# Using native binary
surreal start --log debug --user root --pass root memory
```

Then configure:

```bash
SURREALDB_URL=ws://127.0.0.1:8000/rpc
```

### Surreal Cloud (Production)

For production deployments using Surreal Cloud:

```bash
SURREALDB_URL=wss://cloud.surrealdb.com/rpc
```

Always use `wss://` (WebSocket Secure) for cloud deployments.

## Schema Details

The `kv_store` table includes:

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | `string` | Multi-tenancy isolation (max 128 chars) |
| `key` | `string` | Storage key within tenant namespace (max 1024 chars) |
| `value` | `any` | JSON-serializable data |
| `expires_at` | `datetime?` | Optional TTL expiration timestamp |
| `created_at` | `datetime` | Auto-generated creation timestamp |
| `updated_at` | `datetime` | Auto-generated update timestamp |

### Indexes

- **`idx_tenant_key`**: Composite UNIQUE index on `(tenant_id, key)` - ensures key uniqueness per tenant
- **`idx_tenant_id`**: Index on `tenant_id` - optimizes tenant-scoped queries
- **`idx_expires_at`**: Index on `expires_at` - optimizes TTL expiration checks
- **`idx_tenant_key_prefix`**: Composite index on `(tenant_id, key)` - optimizes prefix-based list operations

## Features & Capabilities

### Multi-Tenancy

Data is automatically isolated by `tenant_id`. Each tenant has a completely separate key namespace:

```typescript
// Tenant A and Tenant B can have the same key
await storage.set('my-key', 'value-a', { ...context, tenantId: 'tenant-a' });
await storage.set('my-key', 'value-b', { ...context, tenantId: 'tenant-b' });
```

### TTL Support

Set expiration times on stored values:

```typescript
// Store with 1-hour TTL
await storage.set('session-token', token, context, { ttl: 3600 });

// Expired records are automatically filtered on read
const value = await storage.get('session-token', context); // null if expired
```

### Batch Operations

Efficient bulk operations using optimized SurrealQL queries:

```typescript
// Batch read
const keys = ['key1', 'key2', 'key3'];
const results = await storage.getMany<string>(keys, context);

// Batch write
const entries = new Map([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);
await storage.setMany(entries, context, { ttl: 3600 });

// Batch delete
const deletedCount = await storage.deleteMany(keys, context);
```

### Pagination

List operations support cursor-based pagination with secure, opaque cursors:

```typescript
// First page
const page1 = await storage.list('prefix:', context, { limit: 100 });

// Next page
if (page1.nextCursor) {
  const page2 = await storage.list('prefix:', context, {
    limit: 100,
    cursor: page1.nextCursor,
  });
}
```

## Performance Characteristics

- **Batch Operations**: Single query with IN clause (database-optimized)
- **Pagination**: Server-side cursor processing
- **TTL Filtering**: Indexed queries with expiration checks
- **Connection**: Persistent WebSocket (low latency, supports future real-time features)

## Troubleshooting

### Connection Issues

**Problem**: `Failed to connect to SurrealDB`

**Solutions**:
- Verify `SURREALDB_URL` is correct and includes `/rpc` path
- Check network connectivity to endpoint
- Verify credentials are correct
- Ensure namespace and database exist

### Schema Not Found

**Problem**: `Table 'kv_store' does not exist`

**Solution**: Run the schema initialization step (see step 2 above)

### Authentication Errors

**Problem**: `Authentication failed`

**Solutions**:
- Verify `SURREALDB_USERNAME` and `SURREALDB_PASSWORD` are set
- Check that credentials have appropriate permissions
- For Surreal Cloud, ensure you're using account credentials

### Multi-Tenancy Issues

**Problem**: `Tenant ID is required for storage operations`

**Solution**: Ensure `context.tenantId` is set. In HTTP mode with auth enabled, this is automatically extracted from the JWT `tid` claim. In STDIO mode, set it explicitly:

```typescript
const context = requestContextService.createRequestContext({
  operation: 'my-operation',
  tenantId: 'default-tenant',
});
```

## Migration from Other Providers

### From Supabase

1. Export data from Supabase `kv_store` table
2. Initialize SurrealDB schema
3. Import data using `setMany()` operations
4. Update `STORAGE_PROVIDER_TYPE=surrealdb`
5. Restart application

### From In-Memory/FileSystem

1. Initialize SurrealDB schema
2. Update `STORAGE_PROVIDER_TYPE=surrealdb`
3. Restart application (previous data will not be migrated)

## Advanced Configuration

### Custom Table Name

If you want to use a different table name:

```bash
SURREALDB_TABLE_NAME=my_custom_kv_store
```

**Important**: You must also update the table name in `docs/surrealdb-schema.surql` before initializing the schema.

### Connection Pooling

The SurrealDB client maintains a single persistent WebSocket connection via the DI container. Connection pooling is handled automatically by the SDK.

### Monitoring & Observability

All storage operations include structured logging with RequestContext:

```json
{
  "level": "debug",
  "operation": "SurrealdbProvider.get",
  "tenantId": "tenant-123",
  "key": "user:settings",
  "requestId": "req-abc123"
}
```

## Security Best Practices

1. **Always use WSS in production**: `wss://` for encrypted connections
2. **Never commit credentials**: Use environment variables only
3. **Restrict permissions**: Use database-level users with minimal required permissions
4. **Enable auth mode**: Set `MCP_AUTH_MODE=jwt` or `oauth` in production
5. **Validate tenant IDs**: The provider automatically validates tenant IDs to prevent path traversal

## References

- [SurrealDB Documentation](https://surrealdb.com/docs)
- [SurrealDB TypeScript SDK](https://surrealdb.com/docs/sdk/javascript)
- [Surreal Cloud](https://surrealdb.com/cloud)
- [Template Storage Architecture](../AGENTS.md#vi-core-services--utilities)

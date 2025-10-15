-- SurrealDB Schema for Key-Value Store
-- This schema defines the table structure for the multi-tenant key-value storage provider.
--
-- Usage:
-- 1. Connect to your SurrealDB instance (local or cloud)
-- 2. Select your namespace and database
-- 3. Execute this schema file to create the table and indexes
--
-- Example (using surreal CLI):
--   surreal sql --endpoint wss://cloud.surrealdb.com --namespace my-namespace --database my-database --username root --password root --file docs/surrealdb-schema.surql
--
-- Example (using Surrealist GUI):
--   1. Open Surrealist and connect to your database
--   2. Navigate to the SQL Editor
--   3. Copy and paste this schema
--   4. Execute the query

-- Define the kv_store table with schema enforcement
DEFINE TABLE kv_store SCHEMAFULL
  COMMENT "Multi-tenant key-value storage table for MCP template application"
  PERMISSIONS
    -- ⚠️ SECURITY WARNING: These permissions allow unrestricted access!
    -- This configuration is suitable ONLY for:
    --   - Development/testing environments
    --   - Single-tenant deployments with application-level access control
    --   - Scenarios where the database is not directly exposed
    --
    -- For production multi-tenant deployments, you MUST implement tenant-scoped permissions.
    -- Example tenant-scoped permissions (replace FULL with these):
    --   FOR select WHERE tenant_id = $auth.tenant_id
    --   FOR create WHERE tenant_id = $auth.tenant_id
    --   FOR update WHERE tenant_id = $auth.tenant_id
    --   FOR delete WHERE tenant_id = $auth.tenant_id
    --
    -- Note: This requires proper authentication setup in SurrealDB with tenant_id in JWT claims
    FOR select, create, update, delete FULL;

-- Define tenant_id field (required for multi-tenancy isolation)
DEFINE FIELD tenant_id ON TABLE kv_store
  TYPE string
  ASSERT $value != NONE AND string::len($value) > 0 AND string::len($value) <= 128
  COMMENT "Unique identifier for the tenant (required for data isolation)";

-- Define key field (the storage key within the tenant's namespace)
DEFINE FIELD key ON TABLE kv_store
  TYPE string
  ASSERT $value != NONE AND string::len($value) > 0 AND string::len($value) <= 1024
  COMMENT "Unique key for the stored item within the tenant's namespace";

-- Define value field (flexible JSON storage)
DEFINE FIELD value ON TABLE kv_store
  TYPE any
  COMMENT "The stored value (can be any JSON-serializable data)";

-- Define expires_at field (optional TTL support)
DEFINE FIELD expires_at ON TABLE kv_store
  TYPE option<datetime>
  COMMENT "Optional expiration timestamp (ISO 8601 format). If set, the record is considered expired after this time.";

-- Define created_at field (automatic timestamp on creation)
DEFINE FIELD created_at ON TABLE kv_store
  TYPE datetime
  DEFAULT time::now()
  COMMENT "Timestamp when the record was created";

-- Define updated_at field (automatic timestamp on update)
DEFINE FIELD updated_at ON TABLE kv_store
  TYPE datetime
  DEFAULT time::now()
  COMMENT "Timestamp when the record was last updated";

-- Create composite unique index on (tenant_id, key)
-- This ensures that each tenant can have unique keys, but different tenants can have the same key
DEFINE INDEX idx_tenant_key ON TABLE kv_store
  COLUMNS tenant_id, key
  UNIQUE
  COMMENT "Ensures unique keys per tenant";

-- Create index on tenant_id for efficient tenant-scoped queries
DEFINE INDEX idx_tenant_id ON TABLE kv_store
  COLUMNS tenant_id
  COMMENT "Optimizes queries filtering by tenant_id";

-- Create index on expires_at for efficient expiration checks
DEFINE INDEX idx_expires_at ON TABLE kv_store
  COLUMNS expires_at
  COMMENT "Optimizes queries filtering by expiration time";

-- Create composite index on (tenant_id, key) for prefix matching
-- This supports efficient list operations with prefix filtering
DEFINE INDEX idx_tenant_key_prefix ON TABLE kv_store
  COLUMNS tenant_id, key
  COMMENT "Optimizes prefix-based list queries";

-- Optional: Define event for automatic cleanup of expired records
-- Uncomment the following block if you want SurrealDB to automatically delete expired records
-- Note: This requires a background job or periodic trigger to execute

-- DEFINE EVENT cleanup_expired_records ON TABLE kv_store WHEN $event = "CREATE" OR $event = "UPDATE" THEN {
--   DELETE FROM kv_store WHERE expires_at != NONE AND expires_at < time::now();
-- };

-- Verification queries (optional - for testing)
-- Uncomment to verify the schema was created successfully

-- INFO FOR TABLE kv_store;
-- SELECT * FROM kv_store LIMIT 5;

-- Cloudflare D1 Database Schema for MCP Storage Provider
-- This schema creates the required table and indexes for the D1 storage provider.
--
-- Usage:
--   1. Create your D1 database: wrangler d1 create mcp-database
--   2. Apply this schema: wrangler d1 execute mcp-database --file=./docs/cloudflare-d1-schema.sql
--
-- For migrations: wrangler d1 migrations create mcp-database <migration-name>

-- Main key-value storage table
-- Stores all tenant data with multi-tenancy support and TTL expiration
CREATE TABLE IF NOT EXISTS kv_store (
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,  -- JSON-serialized value
  expires_at INTEGER,   -- Unix timestamp in milliseconds (NULL = no expiration)
  PRIMARY KEY (tenant_id, key)
) STRICT;

-- Index for efficient TTL filtering and cleanup
-- Used by list() and get() operations to filter expired entries
CREATE INDEX IF NOT EXISTS idx_kv_store_expires
  ON kv_store(expires_at)
  WHERE expires_at IS NOT NULL;

-- Index for efficient prefix-based searches
-- Used by list() operations with prefix parameter
CREATE INDEX IF NOT EXISTS idx_kv_store_prefix
  ON kv_store(tenant_id, key);

-- Verify schema
SELECT 'Schema initialized successfully' AS status;
SELECT 'Table count: ' || COUNT(*) AS info FROM sqlite_master WHERE type='table' AND name='kv_store';
SELECT 'Index count: ' || COUNT(*) AS info FROM sqlite_master WHERE type='index' AND tbl_name='kv_store';

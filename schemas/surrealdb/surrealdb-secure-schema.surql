-- SurrealDB Secure Schema for Key-Value Store
-- This schema replaces FULL permissions with tenant-scoped row-level security.
--
-- SECURITY FEATURES:
-- 1. JWT-based authentication with modern DEFINE ACCESS
-- 2. Tenant-scoped permissions using $token.tid
-- 3. Row-level security for all operations
-- 4. Optional user table with record-based authentication
--
-- Usage:
-- 1. Set JWT_SECRET environment variable
-- 2. Execute this schema to replace the basic schema
-- 3. Use JWT tokens with 'tid' claim for tenant isolation
--
-- Example JWT payload:
-- {
--   "sub": "user-123",
--   "tid": "tenant-a",
--   "role": "user",
--   "iat": 1234567890,
--   "exp": 1234571490
-- }

-- =============================================================================
-- AUTHENTICATION: Define JWT Access
-- =============================================================================

-- Define JWT-based API access
-- This allows authentication using signed JWT tokens
-- The token must include a 'tid' (tenant ID) claim for data isolation
DEFINE ACCESS api_access
  ON DATABASE
  TYPE JWT
  ALGORITHM HS512
  KEY 'your-jwt-secret-key-here'
  -- In production, replace with env var: $JWT_SECRET
  COMMENT "JWT-based API authentication with tenant isolation";

-- Optional: Define record-based user access
-- Uncomment if you want to support user signup/signin
-- DEFINE ACCESS user_access
--   ON DATABASE
--   TYPE RECORD
--   SIGNIN (
--     SELECT * FROM user
--     WHERE email = $email
--     AND crypto::argon2::compare(password, $password)
--     AND active = true
--   )
--   SIGNUP (
--     CREATE user SET
--       email = $email,
--       password = crypto::argon2::generate($password),
--       active = true,
--       created_at = time::now()
--   )
--   WITH JWT
--     ALGORITHM HS512
--     KEY 'your-jwt-secret-key-here'
--     DURATION FOR TOKEN 24h;

-- =============================================================================
-- TABLE DEFINITION: kv_store with Secure Permissions
-- =============================================================================

DEFINE TABLE kv_store SCHEMAFULL
  COMMENT "Multi-tenant key-value storage with row-level security"
  PERMISSIONS
    -- ✅ SECURE: Tenant-scoped permissions using JWT claims
    -- Users can only access records where tenant_id matches their token's tid claim
    FOR select WHERE tenant_id = $token.tid
    FOR create WHERE tenant_id = $token.tid
    FOR update WHERE tenant_id = $token.tid
    FOR delete WHERE tenant_id = $token.tid;

-- =============================================================================
-- FIELD DEFINITIONS: Schema Enforcement
-- =============================================================================

DEFINE FIELD tenant_id ON TABLE kv_store
  TYPE string
  ASSERT $value != NONE AND string::len($value) > 0 AND string::len($value) <= 128
  COMMENT "Tenant identifier - must match JWT tid claim for access";

DEFINE FIELD key ON TABLE kv_store
  TYPE string
  ASSERT $value != NONE AND string::len($value) > 0 AND string::len($value) <= 1024
  COMMENT "Unique key within the tenant's namespace";

DEFINE FIELD value ON TABLE kv_store
  TYPE any
  COMMENT "The stored value (any JSON-serializable data)";

DEFINE FIELD expires_at ON TABLE kv_store
  TYPE option<datetime>
  COMMENT "Optional expiration timestamp (ISO 8601 format)";

DEFINE FIELD created_at ON TABLE kv_store
  TYPE datetime
  DEFAULT time::now()
  COMMENT "Record creation timestamp";

DEFINE FIELD updated_at ON TABLE kv_store
  TYPE datetime
  DEFAULT time::now()
  COMMENT "Last update timestamp";

-- =============================================================================
-- INDEXES: Performance Optimization
-- =============================================================================

-- Unique index: Ensures unique keys per tenant
DEFINE INDEX idx_tenant_key ON TABLE kv_store
  COLUMNS tenant_id, key
  UNIQUE
  COMMENT "Enforces unique keys within each tenant's namespace";

-- Tenant index: Optimizes tenant-scoped queries
DEFINE INDEX idx_tenant_id ON TABLE kv_store
  COLUMNS tenant_id
  COMMENT "Optimizes WHERE tenant_id = $token.tid queries";

-- Expiration index: Optimizes TTL queries
DEFINE INDEX idx_expires_at ON TABLE kv_store
  COLUMNS expires_at
  COMMENT "Optimizes expiration time lookups";

-- Prefix search index: Optimizes list operations
DEFINE INDEX idx_tenant_key_prefix ON TABLE kv_store
  COLUMNS tenant_id, key
  COMMENT "Optimizes prefix-based list queries with tenant isolation";

-- =============================================================================
-- OPTIONAL: User Table (if using record-based auth)
-- =============================================================================

-- Uncomment this section if you enabled user_access above

-- DEFINE TABLE user SCHEMAFULL
--   COMMENT "User accounts for record-based authentication"
--   PERMISSIONS
--     FOR select WHERE id = $auth.id OR $token.role = 'admin'
--     FOR create FULL  -- Anyone can sign up
--     FOR update WHERE id = $auth.id
--     FOR delete WHERE id = $auth.id OR $token.role = 'admin';
--
-- DEFINE FIELD email ON TABLE user
--   TYPE string
--   ASSERT string::is::email($value)
--   COMMENT "User email address (must be valid format)";
--
-- DEFINE FIELD password ON TABLE user
--   TYPE string
--   COMMENT "Argon2-hashed password";
--
-- DEFINE FIELD active ON TABLE user
--   TYPE bool
--   DEFAULT true
--   COMMENT "Account active status";
--
-- DEFINE FIELD tenant_id ON TABLE user
--   TYPE option<string>
--   COMMENT "Optional tenant association";
--
-- DEFINE FIELD role ON TABLE user
--   TYPE string
--   DEFAULT 'user'
--   ASSERT $value INSIDE ['user', 'admin', 'moderator']
--   COMMENT "User role for RBAC";
--
-- DEFINE FIELD created_at ON TABLE user
--   TYPE datetime
--   DEFAULT time::now()
--   COMMENT "Account creation timestamp";
--
-- DEFINE INDEX idx_user_email ON TABLE user
--   COLUMNS email
--   UNIQUE
--   COMMENT "Ensures unique email addresses";

-- =============================================================================
-- EVENTS: Optional Automated Cleanup
-- =============================================================================

-- Optional: Automatically delete expired records
-- Uncomment if you want SurrealDB to handle cleanup
-- Note: This triggers on every CREATE/UPDATE, consider scheduled jobs for large datasets

-- DEFINE EVENT cleanup_expired ON TABLE kv_store
--   WHEN $event = "CREATE" OR $event = "UPDATE"
--   THEN {
--     DELETE FROM kv_store
--     WHERE expires_at != NONE
--     AND expires_at < time::now()
--   };

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify schema was created successfully
INFO FOR TABLE kv_store;

-- Check defined access methods
INFO FOR DATABASE;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Example 1: Create a JWT token (using external service or SurrealDB CLI)
-- The token payload should include:
-- {
--   "sub": "user-id",
--   "tid": "tenant-a",
--   "role": "user",
--   "exp": <timestamp>
-- }

-- Example 2: Set a value (requires JWT with tid claim)
-- UPDATE kv_store:['tenant-a', 'my-key'] MERGE {
--   tenant_id: 'tenant-a',
--   key: 'my-key',
--   value: 'my-value',
--   created_at: $this.created_at ?? time::now(),
--   updated_at: time::now()
-- };

-- Example 3: Get a value (automatically filtered by $token.tid)
-- SELECT value FROM kv_store
-- WHERE tenant_id = $token.tid AND key = 'my-key';

-- Example 4: List keys with prefix (tenant-scoped)
-- SELECT key FROM kv_store
-- WHERE tenant_id = $token.tid
-- AND string::starts_with(key, 'prefix:')
-- ORDER BY key ASC;

-- =============================================================================
-- MIGRATION FROM BASIC SCHEMA
-- =============================================================================

-- If migrating from the basic schema with FULL permissions:
-- 1. Ensure all clients are updated to use JWT authentication
-- 2. Run this schema to replace permissions
-- 3. Test that JWT tokens include the 'tid' claim
-- 4. Verify row-level security is working correctly
-- 5. No data migration needed - only permissions changed

-- =============================================================================
-- SECURITY NOTES
-- =============================================================================

-- ✅ DO:
-- - Use strong JWT secrets (min 32 characters, random)
-- - Include 'tid' (tenant ID) in all JWT tokens
-- - Validate tenant IDs on the application layer before issuing tokens
-- - Use WSS (not WS) for production connections
-- - Rotate JWT secrets regularly
-- - Set appropriate token expiration times

-- ❌ DON'T:
-- - Use FULL permissions in production
-- - Hard-code JWT secrets in the schema
-- - Allow users to specify their own tenant_id
-- - Share JWT secrets between environments
-- - Use this schema without authentication enabled

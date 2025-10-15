-- SurrealDB Graph Schema
-- Defines tables and indexes for graph database operations.
--
-- This schema extends the base schema with graph-specific tables for:
-- - Social networks (users, follows, likes)
-- - Knowledge graphs (entities, relationships)
-- - Dependency graphs (packages, depends_on)
--
-- Usage:
-- 1. Ensure base schema is initialized first
-- 2. Execute this schema to add graph capabilities
-- 3. Use RELATE statements to create edges

-- =============================================================================
-- EXAMPLE: Social Network Graph
-- =============================================================================

-- Define user table (vertex)
DEFINE TABLE user SCHEMAFULL
  COMMENT "User vertices for social network graph"
  PERMISSIONS
    FOR select FULL
    FOR create, update, delete WHERE id = $auth.id OR $token.role = 'admin';

DEFINE FIELD username ON TABLE user
  TYPE string
  ASSERT $value != NONE AND string::len($value) >= 3;

DEFINE FIELD email ON TABLE user
  TYPE string
  ASSERT string::is::email($value);

DEFINE FIELD created_at ON TABLE user
  TYPE datetime
  DEFAULT time::now();

DEFINE INDEX idx_user_username ON TABLE user
  COLUMNS username
  UNIQUE;

-- Define follows edge table
DEFINE TABLE follows SCHEMAFULL TYPE RELATION
  COMMENT "Directional following relationships"
  IN user
  OUT user
  PERMISSIONS
    FOR select FULL
    FOR create WHERE in = $auth.id
    FOR delete WHERE in = $auth.id;

DEFINE FIELD since ON TABLE follows
  TYPE datetime
  DEFAULT time::now()
  COMMENT "When the follow relationship was created";

DEFINE FIELD weight ON TABLE follows
  TYPE int
  DEFAULT 1
  COMMENT "Relationship weight for ranking";

DEFINE INDEX idx_follows_in ON TABLE follows
  COLUMNS in;

DEFINE INDEX idx_follows_out ON TABLE follows
  COLUMNS out;

-- Define likes edge table
DEFINE TABLE likes SCHEMAFULL TYPE RELATION
  COMMENT "User likes content (posts, comments, etc)"
  IN user
  OUT post
  PERMISSIONS
    FOR select FULL
    FOR create WHERE in = $auth.id
    FOR delete WHERE in = $auth.id;

DEFINE FIELD created_at ON TABLE likes
  TYPE datetime
  DEFAULT time::now();

-- =============================================================================
-- EXAMPLE: Knowledge Graph
-- =============================================================================

-- Define entity table (vertex)
DEFINE TABLE entity SCHEMAFULL
  COMMENT "Entities in knowledge graph"
  PERMISSIONS
    FOR select FULL
    FOR create, update, delete WHERE $token.role = 'admin';

DEFINE FIELD name ON TABLE entity
  TYPE string
  ASSERT $value != NONE;

DEFINE FIELD type ON TABLE entity
  TYPE string
  ASSERT $value INSIDE ['person', 'organization', 'location', 'concept'];

DEFINE FIELD properties ON TABLE entity
  TYPE object
  COMMENT "Flexible JSON properties";

DEFINE FIELD embedding ON TABLE entity
  TYPE option<array<float>>
  COMMENT "Vector embedding for similarity search";

-- Define relationship edge table (generic)
DEFINE TABLE relationship SCHEMAFULL TYPE RELATION
  COMMENT "Generic relationships between entities"
  IN entity
  OUT entity
  PERMISSIONS FOR select FULL;

DEFINE FIELD type ON TABLE relationship
  TYPE string
  ASSERT $value != NONE
  COMMENT "Relationship type (e.g., 'works_at', 'located_in')";

DEFINE FIELD properties ON TABLE relationship
  TYPE option<object>
  COMMENT "Additional relationship metadata";

DEFINE FIELD confidence ON TABLE relationship
  TYPE option<float>
  COMMENT "Confidence score for AI-extracted relationships";

DEFINE FIELD source ON TABLE relationship
  TYPE option<string>
  COMMENT "Source of the relationship (e.g., 'manual', 'llm-extracted')";

-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

-- Example 1: Create a follow relationship
-- RELATE user:alice->follows->user:bob
--   SET since = time::now(), weight = 1;

-- Example 2: Get all users that alice follows
-- SELECT ->follows->user FROM user:alice;

-- Example 3: Get alice's followers (inverse)
-- SELECT <-follows<-user FROM user:alice;

-- Example 4: Find mutual follows (friends)
-- SELECT ->follows->user FROM user:alice
-- WHERE id IN (SELECT <-follows<-user.id FROM user:alice);

-- Example 5: Get followers of followers (2 hops)
-- SELECT <-follows<-user<-follows<-user FROM user:alice;

-- Example 6: Find shortest path
-- SELECT * FROM (
--   SELECT id, ->->->->-> as path FROM user:alice
-- )
-- WHERE user:charlie IN path..id;

-- Example 7: Create knowledge graph relationship
-- RELATE entity:openai->relationship->entity:chatgpt
--   SET
--     type = 'created_by',
--     confidence = 0.95,
--     source = 'llm-extracted';

-- Example 8: Traverse knowledge graph
-- SELECT ->relationship[WHERE type = 'works_at']->entity.name
-- FROM entity:john_doe;

-- =============================================================================
-- PERFORMANCE NOTES
-- =============================================================================

-- ✅ Indexes on IN and OUT are critical for graph performance
-- ✅ Use TYPE RELATION to enforce edge semantics
-- ✅ Limit traversal depth to prevent expensive queries
-- ✅ Consider materialized views for common graph patterns
-- ✅ Use edge metadata for weighted graphs and filtering

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

-- This schema is additive - it doesn't affect existing kv_store table
-- Can be applied independently of the base KV schema
-- Safe to apply to existing databases

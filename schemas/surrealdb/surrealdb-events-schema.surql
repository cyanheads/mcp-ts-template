-- SurrealDB Events & Triggers Schema
-- Demonstrates DEFINE EVENT usage with $event, $before, $after
--
-- This schema provides production-ready event examples for:
-- - Audit logging
-- - Auto-cleanup expired records
-- - Data validation
-- - Cascade operations
-- - Webhook notifications
--
-- Usage:
-- 1. Apply base schemas first (surrealdb-schema.surql, surrealdb-secure-schema.surql)
-- 2. Execute this schema to add event triggers
-- 3. Events trigger automatically on data changes

-- =============================================================================
-- AUDIT LOG TABLE
-- =============================================================================

-- Table to store audit trail
DEFINE TABLE audit_log SCHEMAFULL
  COMMENT "Audit trail for tracking data changes"
  PERMISSIONS
    FOR select WHERE $token.role = 'admin'
    FOR create FULL  -- Events can create
    FOR update, delete NONE;

DEFINE FIELD table ON TABLE audit_log
  TYPE string
  COMMENT "Table where change occurred";

DEFINE FIELD record_id ON TABLE audit_log
  TYPE string
  COMMENT "ID of the modified record";

DEFINE FIELD event_type ON TABLE audit_log
  TYPE string
  ASSERT $value INSIDE ['CREATE', 'UPDATE', 'DELETE']
  COMMENT "Type of change";

DEFINE FIELD field_name ON TABLE audit_log
  TYPE option<string>
  COMMENT "Specific field that changed (for granular tracking)";

DEFINE FIELD old_value ON TABLE audit_log
  TYPE option<any>
  COMMENT "Value before change";

DEFINE FIELD new_value ON TABLE audit_log
  TYPE option<any>
  COMMENT "Value after change";

DEFINE FIELD before_state ON TABLE audit_log
  TYPE option<object>
  COMMENT "Full record state before change";

DEFINE FIELD after_state ON TABLE audit_log
  TYPE option<object>
  COMMENT "Full record state after change";

DEFINE FIELD changed_at ON TABLE audit_log
  TYPE datetime
  DEFAULT time::now()
  COMMENT "Timestamp of change";

DEFINE FIELD changed_by ON TABLE audit_log
  TYPE option<string>
  COMMENT "User who made the change";

DEFINE INDEX idx_audit_table ON TABLE audit_log
  COLUMNS table, record_id;

DEFINE INDEX idx_audit_timestamp ON TABLE audit_log
  COLUMNS changed_at;

-- =============================================================================
-- EVENT 1: Auto-Cleanup Expired Records
-- =============================================================================

-- Automatically delete expired KV store entries
-- Triggers on CREATE/UPDATE to clean up old expired records
DEFINE EVENT cleanup_expired_kv ON TABLE kv_store
  WHEN $event = "CREATE" OR $event = "UPDATE"
  THEN {
    DELETE FROM kv_store
    WHERE expires_at != NONE
    AND expires_at < time::now()
  };

-- =============================================================================
-- EVENT 2: Audit User Email Changes
-- =============================================================================

-- Track when user email addresses are changed
-- Only logs when email actually changes
DEFINE EVENT audit_user_email ON TABLE user
  WHEN $event = "UPDATE" AND $before.email != $after.email
  THEN {
    CREATE audit_log SET
      table = 'user',
      record_id = $value,
      event_type = $event,
      field_name = 'email',
      old_value = $before.email,
      new_value = $after.email,
      changed_at = time::now(),
      changed_by = $auth.id
  };

-- =============================================================================
-- EVENT 3: Full Record Audit on Updates
-- =============================================================================

-- Log complete before/after state for critical tables
DEFINE EVENT audit_user_changes ON TABLE user
  WHEN $event = "UPDATE" OR $event = "DELETE"
  THEN {
    CREATE audit_log SET
      table = 'user',
      record_id = $value,
      event_type = $event,
      before_state = $before,
      after_state = $after,
      changed_at = time::now(),
      changed_by = $auth.id
  };

-- =============================================================================
-- EVENT 4: Cascade Delete Related Records
-- =============================================================================

-- When a user is deleted, remove their sessions
-- Demonstrates $before access and conditional logic
DEFINE EVENT cascade_delete_sessions ON TABLE user
  WHEN $event = "DELETE"
  THEN {
    DELETE FROM session
    WHERE user_id = $before.id
  };

-- =============================================================================
-- EVENT 5: Data Validation with THROW
-- =============================================================================

-- Prevent certain operations with validation
-- Note: This requires SurrealDB 2.x+ with THROW support
-- DEFINE EVENT validate_email_domain ON TABLE user
--   WHEN $event = "CREATE" OR $event = "UPDATE"
--   THEN {
--     IF !string::ends_with($after.email, '@company.com') THEN
--       THROW "Only company email addresses are allowed"
--     END
--   };

-- =============================================================================
-- EVENT 6: Auto-Update Timestamps
-- =============================================================================

-- Automatically update modified_at on changes
-- Demonstrates simple field updates
DEFINE EVENT update_modified_at ON TABLE kv_store
  WHEN $event = "UPDATE"
  THEN {
    UPDATE $value SET updated_at = time::now()
  };

-- =============================================================================
-- EVENT 7: Maintain Counters/Aggregates
-- =============================================================================

-- Update follower count when follows relationship changes
DEFINE EVENT update_follower_count ON TABLE follows
  WHEN $event = "CREATE" OR $event = "DELETE"
  THEN {
    UPDATE $after.out SET
      follower_count = count(<-follows<-user)
  };

-- =============================================================================
-- EVENT 8: Webhook Notification (External Integration)
-- =============================================================================

-- Send webhook on critical events
-- Note: Requires network access and http::post support
-- DEFINE EVENT notify_user_signup ON TABLE user
--   WHEN $event = "CREATE"
--   THEN {
--     http::post('https://api.example.com/webhooks/user-signup', {
--       user_id: $value,
--       email: $after.email,
--       created_at: $after.created_at
--     })
--   };

-- =============================================================================
-- EVENT 9: Complex Multi-Step Workflow
-- =============================================================================

-- When a purchase is created, perform multiple actions
-- DEFINE EVENT process_purchase ON TABLE purchase
--   WHEN $event = "CREATE"
--   THEN {
--     -- Create order record
--     LET $order = CREATE order SET
--       purchase_id = $value,
--       user_id = $after.user_id,
--       total = $after.total,
--       status = 'pending',
--       created_at = time::now();
--
--     -- Update inventory
--     UPDATE product SET
--       stock = stock - $after.quantity
--     WHERE id = $after.product_id;
--
--     -- Create notification
--     CREATE notification SET
--       user_id = $after.user_id,
--       type = 'purchase_confirmed',
--       message = 'Your purchase has been received',
--       created_at = time::now()
--   };

-- =============================================================================
-- EVENT 10: Graph Relationship Integrity
-- =============================================================================

-- When an edge is created, validate vertices exist
-- DEFINE EVENT validate_edge_vertices ON TABLE follows
--   WHEN $event = "CREATE"
--   THEN {
--     -- Verify both vertices exist
--     IF (SELECT count() FROM $after.in)[0].count = 0 THEN
--       THROW "Source vertex does not exist"
--     END;
--     IF (SELECT count() FROM $after.out)[0].count = 0 THEN
--       THROW "Target vertex does not exist"
--     END
--   };

-- =============================================================================
-- USAGE EXAMPLES WITH CODE
-- =============================================================================

-- Example 1: Using EventManager
-- ```ts
-- import { EventManager } from '@/storage/providers/surrealdb';
--
-- const eventMgr = new EventManager(client);
--
-- await eventMgr.defineEvent({
--   table: 'kv_store',
--   name: 'cleanup_expired',
--   triggers: ['CREATE', 'UPDATE'],
--   then: `DELETE FROM kv_store WHERE expires_at < time::now()`
-- }, context);
-- ```

-- Example 2: Using TriggerBuilder
-- ```ts
-- import { TriggerBuilder } from '@/storage/providers/surrealdb';
--
-- const auditEvent = TriggerBuilder.for('user')
--   .named('audit_email_changes')
--   .onUpdate()
--   .when('$before.email != $after.email')
--   .then(`CREATE audit_log SET ...`)
--   .build();
--
-- await eventMgr.defineEvent(auditEvent, context);
-- ```

-- Example 3: Common Patterns
-- ```ts
-- // Auto-cleanup
-- const cleanup = TriggerBuilder.autoCleanup('kv_store');
--
-- // Audit logging
-- const audit = TriggerBuilder.auditLog('user', 'audit_user');
--
-- // Cascade delete
-- const cascade = TriggerBuilder.cascadeDelete('user', 'cascade_sessions', 'session', 'user_id');
-- ```

-- =============================================================================
-- BEST PRACTICES
-- =============================================================================

-- ✅ DO:
-- - Keep THEN clauses focused and fast
-- - Use WHEN conditions to filter unnecessary triggers
-- - Consider performance impact on write operations
-- - Test events thoroughly before production
-- - Use events for data integrity, not business logic
-- - Monitor event execution in production

-- ❌ DON'T:
-- - Create events that trigger events (recursive loops)
-- - Put heavy operations in THEN clauses
-- - Use events for complex business logic
-- - Forget that events run in the same transaction
-- - Ignore event errors (they'll rollback the transaction)

-- =============================================================================
-- TROUBLESHOOTING
-- =============================================================================

-- View all events on a table:
-- INFO FOR TABLE kv_store;

-- Remove an event:
-- REMOVE EVENT cleanup_expired_kv ON TABLE kv_store;

-- Disable an event temporarily (remove and re-add):
-- REMOVE EVENT event_name ON TABLE table_name;

-- =============================================================================
-- NOTES
-- =============================================================================

-- Events are executed synchronously within the transaction
-- If an event fails, the entire transaction rolls back
-- Events have access to: $event, $value, $before, $after, $auth
-- Multiple events on the same table execute in definition order
-- Events cannot be disabled - they must be removed

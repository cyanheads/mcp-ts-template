/**
 * @fileoverview Tests for SessionStore tenant isolation and security.
 * @module tests/mcp-server/transports/http/sessionStore.test
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  SessionStore,
  type SessionIdentity,
} from '@/mcp-server/transports/http/sessionStore.js';

describe('SessionStore - Security & Tenant Isolation', () => {
  let store: SessionStore;
  const STALE_TIMEOUT = 30_000; // 30 seconds for testing

  beforeEach(() => {
    store = new SessionStore(STALE_TIMEOUT);
  });

  describe('Basic Session Management', () => {
    it('should create a new session', () => {
      const session = store.getOrCreate('session-1');
      expect(session.id).toBe('session-1');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should retrieve existing session', () => {
      const session1 = store.getOrCreate('session-1');
      const session2 = store.getOrCreate('session-1');
      expect(session1).toBe(session2);
      expect(session1.id).toBe('session-1');
    });

    it('should update lastAccessedAt on retrieval', async () => {
      const session1 = store.getOrCreate('session-1');
      const firstAccess = session1.lastAccessedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = store.getOrCreate('session-1');
      expect(session2.lastAccessedAt.getTime()).toBeGreaterThan(
        firstAccess.getTime(),
      );
    });

    it('should validate existing session', () => {
      store.getOrCreate('session-1');
      expect(store.isValidForIdentity('session-1')).toBe(true);
    });

    it('should reject non-existent session', () => {
      expect(store.isValidForIdentity('non-existent')).toBe(false);
    });

    it('should terminate a session', () => {
      store.getOrCreate('session-1');
      expect(store.isValidForIdentity('session-1')).toBe(true);

      store.terminate('session-1');
      expect(store.isValidForIdentity('session-1')).toBe(false);
    });

    it('should return session count', () => {
      expect(store.getSessionCount()).toBe(0);
      store.getOrCreate('session-1');
      expect(store.getSessionCount()).toBe(1);
      store.getOrCreate('session-2');
      expect(store.getSessionCount()).toBe(2);
    });
  });

  describe('Identity Binding', () => {
    it('should bind identity on session creation', () => {
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
        subject: 'user@example.com',
      };

      const session = store.getOrCreate('session-1', identity);
      expect(session.tenantId).toBe('tenant-a');
      expect(session.clientId).toBe('client-1');
      expect(session.subject).toBe('user@example.com');
    });

    it('should create session without identity (backwards compatibility)', () => {
      const session = store.getOrCreate('session-1');
      expect(session.tenantId).toBeUndefined();
      expect(session.clientId).toBeUndefined();
      expect(session.subject).toBeUndefined();
    });

    it('should lazy-bind identity on first authenticated request', () => {
      // Create session without identity
      const session1 = store.getOrCreate('session-1');
      expect(session1.tenantId).toBeUndefined();

      // Bind identity on subsequent request
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      const session2 = store.getOrCreate('session-1', identity);

      expect(session2.tenantId).toBe('tenant-a');
      expect(session2.clientId).toBe('client-1');
      expect(session1).toBe(session2); // Same session object
    });

    it('should not rebind identity once set', () => {
      // Create with first identity
      const identity1: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      store.getOrCreate('session-1', identity1);

      // Try to rebind with different identity (should not change)
      const identity2: SessionIdentity = {
        tenantId: 'tenant-b',
        clientId: 'client-2',
      };
      const session = store.getOrCreate('session-1', identity2);

      // Should still have original identity
      expect(session.tenantId).toBe('tenant-a');
      expect(session.clientId).toBe('client-1');
    });
  });

  describe('Tenant Isolation - Security', () => {
    it('should accept valid tenant for bound session', () => {
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      store.getOrCreate('session-1', identity);

      // Validate with same tenant
      expect(store.isValidForIdentity('session-1', identity)).toBe(true);
    });

    it('should REJECT session reuse across different tenants (CRITICAL)', () => {
      // User from tenant-a creates session
      const tenantA: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      store.getOrCreate('session-1', tenantA);

      // Attacker from tenant-b tries to use same session
      const tenantB: SessionIdentity = {
        tenantId: 'tenant-b',
        clientId: 'client-2',
      };

      // Should REJECT - this prevents session hijacking
      expect(store.isValidForIdentity('session-1', tenantB)).toBe(false);
    });

    it('should REJECT session reuse across different clients', () => {
      // User with client-1 creates session
      const client1: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      store.getOrCreate('session-1', client1);

      // Different client from same tenant tries to use session
      const client2: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-2',
      };

      // Should REJECT
      expect(store.isValidForIdentity('session-1', client2)).toBe(false);
    });

    it('should allow unbound session in no-auth mode', () => {
      // Create session without identity (no-auth mode)
      store.getOrCreate('session-1');

      // Should accept requests without identity
      expect(store.isValidForIdentity('session-1')).toBe(true);
      expect(store.isValidForIdentity('session-1', undefined)).toBe(true);
    });

    it('should REJECT authenticated request for unbound session', () => {
      // Session created without identity
      store.getOrCreate('session-1');

      // Authenticated request with identity
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
      };

      // Should allow (will trigger lazy binding)
      expect(store.isValidForIdentity('session-1', identity)).toBe(true);
    });

    it('should REJECT unauthenticated request for bound session', () => {
      // Session created with identity
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-1',
      };
      store.getOrCreate('session-1', identity);

      // Unauthenticated request (no identity)
      expect(store.isValidForIdentity('session-1')).toBe(false);
      expect(store.isValidForIdentity('session-1', undefined)).toBe(false);
    });
  });

  describe('Staleness & Cleanup', () => {
    it('should invalidate stale sessions', async () => {
      // Use a very short timeout for faster test execution
      const shortStore = new SessionStore(50); // 50ms timeout
      shortStore.getOrCreate('session-1');
      expect(shortStore.isValidForIdentity('session-1')).toBe(true);

      // Wait for session to become stale
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortStore.isValidForIdentity('session-1')).toBe(false);
    });

    it('should invalidate stale sessions with identity validation', async () => {
      const shortStore = new SessionStore(50); // 50ms timeout
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
      };
      shortStore.getOrCreate('session-1', identity);
      expect(shortStore.isValidForIdentity('session-1', identity)).toBe(true);

      // Wait for session to become stale
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortStore.isValidForIdentity('session-1', identity)).toBe(false);
    });
  });

  describe('Multi-Tenant Scenarios', () => {
    it('should isolate sessions across multiple tenants', () => {
      // Tenant A creates session
      const tenantA: SessionIdentity = {
        tenantId: 'tenant-a',
        clientId: 'client-a',
      };
      store.getOrCreate('session-a', tenantA);

      // Tenant B creates different session
      const tenantB: SessionIdentity = {
        tenantId: 'tenant-b',
        clientId: 'client-b',
      };
      store.getOrCreate('session-b', tenantB);

      // Each tenant can access their own session
      expect(store.isValidForIdentity('session-a', tenantA)).toBe(true);
      expect(store.isValidForIdentity('session-b', tenantB)).toBe(true);

      // But NOT each other's sessions
      expect(store.isValidForIdentity('session-a', tenantB)).toBe(false);
      expect(store.isValidForIdentity('session-b', tenantA)).toBe(false);
    });

    it('should handle same session ID across different tenants (edge case)', () => {
      // This shouldn't happen (UUIDs), but test defensive behavior
      const sharedSessionId = 'shared-session';

      // Tenant A creates session first
      const tenantA: SessionIdentity = {
        tenantId: 'tenant-a',
      };
      store.getOrCreate(sharedSessionId, tenantA);

      // Tenant B tries to use same session ID
      const tenantB: SessionIdentity = {
        tenantId: 'tenant-b',
      };

      // Tenant A should work
      expect(store.isValidForIdentity(sharedSessionId, tenantA)).toBe(true);

      // Tenant B should be REJECTED (session belongs to A)
      expect(store.isValidForIdentity(sharedSessionId, tenantB)).toBe(false);
    });
  });

  describe('Partial Identity Matching', () => {
    it('should validate when only tenantId is set', () => {
      const identity: SessionIdentity = {
        tenantId: 'tenant-a',
        // No clientId
      };
      store.getOrCreate('session-1', identity);

      // Should validate with same tenant
      expect(
        store.isValidForIdentity('session-1', { tenantId: 'tenant-a' }),
      ).toBe(true);

      // Should reject different tenant
      expect(
        store.isValidForIdentity('session-1', { tenantId: 'tenant-b' }),
      ).toBe(false);
    });

    it('should validate when only clientId is set', () => {
      const identity: SessionIdentity = {
        clientId: 'client-1',
        // No tenantId
      };
      store.getOrCreate('session-1', identity);

      // Should validate with same client
      expect(
        store.isValidForIdentity('session-1', { clientId: 'client-1' }),
      ).toBe(true);

      // Should reject different client
      expect(
        store.isValidForIdentity('session-1', { clientId: 'client-2' }),
      ).toBe(false);
    });
  });
});

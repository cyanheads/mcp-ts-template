/**
 * @fileoverview Simple in-memory session store for MCP HTTP transport.
 * Implements session management as per MCP Spec 2025-06-18.
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management | MCP Session Management}
 * @module src/mcp-server/transports/http/sessionStore
 */

import { logger, requestContextService } from '@/utils/index.js';

interface Session {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

/**
 * Simple in-memory session store for stateful MCP sessions.
 * In production, consider using Redis or another persistent store.
 */
export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private staleTimeout: number;

  constructor(staleTimeoutMs: number) {
    this.staleTimeout = staleTimeoutMs;
    // Clean up stale sessions every minute
    setInterval(() => this.cleanupStaleSessions(), 60_000);
  }

  /**
   * Creates or retrieves a session.
   * @param sessionId - The session identifier
   * @returns The session object
   */
  getOrCreate(sessionId: string): Session {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
      const context = requestContextService.createRequestContext({
        operation: 'SessionStore.create',
        sessionId,
      });
      logger.debug('Session created', context);
    } else {
      session.lastAccessedAt = new Date();
    }

    return session;
  }

  /**
   * Checks if a session exists and is valid.
   * @param sessionId - The session identifier
   * @returns True if the session exists and is not stale
   */
  isValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const isStale =
      Date.now() - session.lastAccessedAt.getTime() > this.staleTimeout;
    if (isStale) {
      this.terminate(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Terminates a session.
   * @param sessionId - The session identifier
   */
  terminate(sessionId: string): void {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      const context = requestContextService.createRequestContext({
        operation: 'SessionStore.terminate',
        sessionId,
      });
      logger.info('Session terminated', context);
    }
  }

  /**
   * Cleans up stale sessions that haven't been accessed recently.
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > this.staleTimeout) {
        this.sessions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      const context = requestContextService.createRequestContext({
        operation: 'SessionStore.cleanup',
      });
      logger.debug('Cleaned up stale sessions', {
        ...context,
        count: cleanedCount,
      });
    }
  }

  /**
   * Gets the current number of active sessions.
   * @returns The number of sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

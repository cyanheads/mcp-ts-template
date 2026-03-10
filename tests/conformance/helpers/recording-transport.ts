/**
 * @fileoverview Transparent transport wrapper that records every JSON-RPC
 * message in both directions with timestamps. Used for wire-level audit
 * trails and protocol ordering assertions in conformance tests.
 * @module tests/conformance/helpers/recording-transport
 */

import type { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export interface RecordedMessage {
  /** Which direction the message traveled */
  direction: 'client-to-server' | 'server-to-client';
  /** Message ID (requests/responses) or null (notifications) */
  id: string | number | null;
  /** The raw JSON-RPC message */
  message: JSONRPCMessage;
  /** Extracted method name (requests/notifications) or null (responses) */
  method: string | null;
  /** Monotonic timestamp (performance.now()) */
  timestamp: number;
}

type InnerTransport = InstanceType<typeof InMemoryTransport>;

/**
 * Wraps an InMemoryTransport to record every message sent and received.
 * The wrapper is transparent — the inner transport handles all actual I/O.
 *
 * Wrap the **client-side** transport from `InMemoryTransport.createLinkedPair()`
 * to get a single-sided trace: client-sent messages are recorded on `send()`,
 * server-sent messages are captured when they arrive at `onmessage`.
 *
 * Note: Uses `as any` for property delegation because the SDK's Transport
 * interface uses `exactOptionalPropertyTypes` which makes proxy patterns
 * cumbersome. This is test infrastructure, not production code.
 */
export class RecordingTransport {
  readonly messages: RecordedMessage[] = [];
  private _onmessageProxy: InnerTransport['onmessage'] = undefined;

  constructor(
    readonly inner: InnerTransport,
    private direction: 'client-to-server' | 'server-to-client',
  ) {}

  get onclose() {
    return this.inner.onclose;
  }
  set onclose(v) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.inner as any).onclose = v;
  }
  get onerror() {
    return this.inner.onerror;
  }
  set onerror(v) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.inner as any).onerror = v;
  }

  get onmessage() {
    return this._onmessageProxy;
  }
  set onmessage(handler: InnerTransport['onmessage']) {
    this._onmessageProxy = handler;
    if (!handler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.inner as any).onmessage = undefined;
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.inner as any).onmessage = (msg: JSONRPCMessage, extra?: any) => {
      this.record(msg, this.oppositeDirection());
      handler(msg, extra);
    };
  }

  async start() {
    return this.inner.start();
  }
  async close() {
    return this.inner.close();
  }

  get sessionId() {
    return this.inner.sessionId;
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions) {
    this.record(message, this.direction);
    return this.inner.send(message, options);
  }

  // --- Query helpers ---

  /** All messages with the given method name */
  byMethod(method: string): RecordedMessage[] {
    return this.messages.filter((m) => m.method === method);
  }

  /** All messages in a given direction */
  byDirection(dir: RecordedMessage['direction']): RecordedMessage[] {
    return this.messages.filter((m) => m.direction === dir);
  }

  /** Methods in chronological order (for ordering assertions) */
  methodSequence(): (string | null)[] {
    return this.messages.map((m) => m.method);
  }

  /** Full dump for debugging */
  dump(): string {
    return this.messages
      .map((m) => `[${m.timestamp.toFixed(1)}ms] ${m.direction} ${m.method ?? `response(${m.id})`}`)
      .join('\n');
  }

  // --- Internals ---

  private record(msg: JSONRPCMessage, direction: RecordedMessage['direction']) {
    this.messages.push({
      timestamp: performance.now(),
      direction,
      message: msg,
      method: 'method' in msg ? (msg.method as string) : null,
      id: 'id' in msg ? (msg.id as string | number) : null,
    });
  }

  private oppositeDirection(): RecordedMessage['direction'] {
    return this.direction === 'client-to-server' ? 'server-to-client' : 'client-to-server';
  }
}

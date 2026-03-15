/**
 * @fileoverview Shared OTel metrics for speech providers (TTS and STT).
 * Lazy-initialized on first use to avoid meter overhead when speech is never invoked.
 * @module src/services/speech/core/speechMetrics
 */

import type { Span } from '@opentelemetry/api';

import { nowMs } from '@/utils/internal/performance.js';
import { createCounter, createHistogram } from '@/utils/telemetry/metrics.js';
import {
  ATTR_MCP_SPEECH_DURATION_MS,
  ATTR_MCP_SPEECH_OPERATION,
  ATTR_MCP_SPEECH_PROVIDER,
  ATTR_MCP_SPEECH_SUCCESS,
} from '@/utils/telemetry/semconv.js';

let speechOpCounter: ReturnType<typeof createCounter> | undefined;
let speechOpDuration: ReturnType<typeof createHistogram> | undefined;
let speechOpErrors: ReturnType<typeof createCounter> | undefined;

export function getSpeechMetrics() {
  speechOpCounter ??= createCounter('mcp.speech.operations', 'Total speech operations', '{ops}');
  speechOpDuration ??= createHistogram('mcp.speech.duration', 'Speech operation duration', 'ms');
  speechOpErrors ??= createCounter(
    'mcp.speech.errors',
    'Total speech operation errors',
    '{errors}',
  );
  return { speechOpCounter, speechOpDuration, speechOpErrors };
}

/**
 * Records speech operation metrics and span attributes in a `finally` block.
 * Shared by both ElevenLabs (TTS) and Whisper (STT) providers.
 */
export function recordSpeechOp(
  span: Span,
  t0: number,
  ok: boolean,
  operation: 'tts' | 'stt',
  provider: string,
): void {
  const durationMs = Math.round((nowMs() - t0) * 100) / 100;
  span.setAttribute(ATTR_MCP_SPEECH_DURATION_MS, durationMs);
  span.setAttribute(ATTR_MCP_SPEECH_SUCCESS, ok);
  const m = getSpeechMetrics();
  const attrs = {
    [ATTR_MCP_SPEECH_OPERATION]: operation,
    [ATTR_MCP_SPEECH_PROVIDER]: provider,
  };
  m.speechOpCounter.add(1, { ...attrs, [ATTR_MCP_SPEECH_SUCCESS]: ok });
  m.speechOpDuration.record(durationMs, attrs);
  if (!ok) m.speechOpErrors.add(1, attrs);
}

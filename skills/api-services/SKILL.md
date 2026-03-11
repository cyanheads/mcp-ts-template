---
name: api-services
description: >
  API reference for built-in service providers (LLM, Speech, Graph). Use when looking up service interfaces, provider capabilities, or integration patterns.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

Service interfaces are deferred from core's public exports — they remain in downstream servers until shared by 2+ servers. These are documented here for core contributors and servers that use the built-in providers.

All services follow the **init/accessor pattern**: initialized in `setup()`, accessed at request time via lazy accessor. See the `add-service` skill for the full pattern.

---

## LLM Service (`services/llm`)

| Export | API | Notes |
|:-------|:----|:------|
| `ILlmProvider` | `.chat(params, ctx) -> Promise<ChatCompletion \| Stream<ChatCompletionChunk>>` | OpenAI-compatible interface. `params.stream` discriminates return type. |
| `OpenRouterProvider` | Implements `ILlmProvider` via OpenRouter API | Tier 3 peer: `openai`. Lazy-loaded. Rate-limited via `RateLimiter`. Retries on 429/5xx. |
| `OpenRouterChatParams` | `ChatCompletionCreateParamsNonStreaming \| ChatCompletionCreateParamsStreaming` | OpenAI SDK types — OpenRouter is API-compatible. |

### Configuration

| Env Var | Purpose |
|:--------|:--------|
| `OPENROUTER_API_KEY` | API key (required to enable LLM service) |
| `OPENROUTER_APP_URL` | App URL for OpenRouter rankings |
| `OPENROUTER_APP_NAME` | App name for OpenRouter rankings |
| `LLM_DEFAULT_MODEL` | Default model ID (e.g., `anthropic/claude-sonnet-4-20250514`) |
| `LLM_DEFAULT_MAX_TOKENS` | Default max tokens |
| `LLM_DEFAULT_TEMPERATURE` | Default temperature |

### Usage

```ts
import type { ILlmProvider } from '@cyanheads/mcp-ts-core';

// In a tool handler — assumes LLM provider was initialized in setup()
const completion = await llmProvider.chat({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 500,
}, ctx);
```

Streaming variant:

```ts
const stream = await llmProvider.chat({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 500,
  stream: true,
}, ctx);

for await (const chunk of stream) {
  // chunk is ChatCompletionChunk
}
```

---

## Speech Service (`services/speech`)

| Export | API | Notes |
|:-------|:----|:------|
| `ISpeechProvider` | `.textToSpeech(opts) -> Promise<TextToSpeechResult>` `.speechToText(opts) -> Promise<SpeechToTextResult>` `.getVoices() -> Promise<Voice[]>` `.healthCheck() -> Promise<boolean>` `.supportsTTS` `.supportsSTT` `.name` | Check `supportsTTS`/`supportsSTT` before calling. |
| `SpeechService` | Facade over multiple `ISpeechProvider` instances | Routes to appropriate provider. |
| `ElevenLabsProvider` | TTS only (`supportsTTS: true`, `supportsSTT: false`) | Tier 3 peer: ElevenLabs API (direct HTTP). |
| `WhisperProvider` | STT only (`supportsTTS: false`, `supportsSTT: true`) | Tier 3 peer: `openai` (Whisper API). 25MB file size limit. |

### Configuration

| Env Var | Purpose |
|:--------|:--------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key (enables TTS) |
| `ELEVENLABS_MODEL_ID` | Model ID (default: `eleven_multilingual_v2`) |
| `ELEVENLABS_VOICE_ID` | Default voice ID |
| `OPENAI_API_KEY` | OpenAI API key (enables Whisper STT) |
| `WHISPER_MODEL` | Whisper model (default: `whisper-1`) |

### Usage

```ts
// Text-to-Speech
const ttsResult = await speechService.textToSpeech({
  text: 'Hello, world!',
  voice: 'some-voice-id',
  outputFormat: 'mp3_44100_128',
});
// ttsResult: { audioData: Buffer, mimeType: string, duration?: number }

// Speech-to-Text
const sttResult = await speechService.speechToText({
  audioData: buffer,
  mimeType: 'audio/mp3',
  language: 'en',
});
// sttResult: { text: string, confidence?: number, language?: string }

// List available voices
const voices = await speechService.getVoices();
```

---

## Graph Service (`services/graph`)

| Export | API | Notes |
|:-------|:----|:------|
| `IGraphProvider` | `.createVertex(table, data, ctx)` `.getVertex(id, ctx)` `.updateVertex(id, data, ctx)` `.deleteVertex(id, ctx)` `.createEdge(table, from, to, data, ctx)` `.getEdge(id, ctx)` `.deleteEdge(id, ctx)` `.getNeighbors(id, direction?, edgeTable?, ctx)` `.traverseBFS(startId, opts, ctx)` `.findShortestPath(fromId, toId, opts, ctx)` `.getStats(ctx)` | Full graph CRUD + traversal + pathfinding. |
| `GraphService` | Facade over `IGraphProvider` | Delegates to configured provider. |

### Types

```ts
interface Vertex {
  id: string;
  table: string;
  data: Record<string, unknown>;
}

interface Edge {
  id: string;
  table: string;
  from: string;  // source vertex ID
  to: string;    // target vertex ID
  data: Record<string, unknown>;
}

type TraversalDirection = 'out' | 'in' | 'both';
```

### Usage

```ts
// Create vertices
const user = await graphService.createVertex('users', { name: 'Alice' }, ctx);
const project = await graphService.createVertex('projects', { title: 'My Project' }, ctx);

// Create edge
const edge = await graphService.createEdge('owns', user.id, project.id, { since: '2025-01' }, ctx);

// Query neighbors
const neighbors = await graphService.getNeighbors(user.id, 'out', 'owns', ctx);

// BFS traversal
const reachable = await graphService.traverseBFS(user.id, {
  maxDepth: 3,
  direction: 'out',
}, ctx);

// Shortest path
const path = await graphService.findShortestPath(user.id, targetId, {
  direction: 'out',
  maxDepth: 10,
}, ctx);
```

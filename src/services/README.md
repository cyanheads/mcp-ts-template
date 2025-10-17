# Services Module

## Overview

The `services/` directory contains external service integrations following a consistent domain-driven pattern. Each service domain provides pluggable providers, allowing you to swap implementations without changing business logic.

**Service domains:**

- **[llm/](llm/)** - Large Language Model providers (OpenRouter)
- **[speech/](speech/)** - Text-to-Speech and Speech-to-Text providers (ElevenLabs, Whisper)
- **[graph/](graph/)** - Graph database operations (SurrealDB)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Application Layer                  │
│         (Tools, Resources, Logic)               │
└────────────────┬────────────────────────────────┘
                 │
                 │ Dependency Injection
                 │
┌────────────────▼────────────────────────────────┐
│              Services Layer                     │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Service Orchestrators            │   │
│  │  - Route requests to providers           │   │
│  │  - Handle multi-provider scenarios       │   │
│  │  - Aggregate results                     │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Provider Interface Layer         │   │
│  │  - I[Service]Provider contracts          │   │
│  │  - Consistent provider API               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                 │
                 │ Provider implementations
                 │
┌────────────────▼────────────────────────────────┐
│              Provider Layer                     │
│   (OpenRouter, ElevenLabs, SurrealDB, etc.)     │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTP/API calls
                 │
┌────────────────▼────────────────────────────────┐
│              External Services                  │
│         (Third-party APIs, DBs)                 │
└─────────────────────────────────────────────────┘
```

### Directory Structure

All services follow this consistent structure:

```
services/[service-name]/
├── core/
│   ├── I[Service]Provider.ts    # Provider interface
│   └── [Service]Service.ts      # Orchestrator (for multi-provider)
├── providers/
│   ├── provider1.provider.ts
│   └── provider2.provider.ts
├── types.ts                      # Domain types
└── index.ts                      # Barrel export
```

---

## Service Patterns

### Single-Provider Pattern (LLM)

When a domain has a single provider, inject it directly:

```typescript
import { injectable, inject } from 'tsyringe';
import { LlmProvider } from '@/container/tokens.js';
import type { ILlmProvider } from '@/services/llm/core/ILlmProvider.js';
import { requestContextService } from '@/utils/index.js';

@injectable()
class MyTool {
  constructor(@inject(LlmProvider) private llmProvider: ILlmProvider) {}

  async execute() {
    const context = requestContextService.createRequestContext({
      operation: 'my-tool-execute',
    });

    const result = await this.llmProvider.chatCompletion(
      {
        messages: [{ role: 'user', content: 'Hello, world!' }],
        max_tokens: 100,
      },
      context,
    );

    return result;
  }
}
```

### Multi-Provider Pattern with Orchestrator (Speech, Graph)

When a domain has multiple providers or complex operations, use an orchestrator:

**Speech Service Example:**

```typescript
import { injectable, inject } from 'tsyringe';
import { SpeechService } from '@/container/tokens.js';
import type { SpeechService as SpeechServiceType } from '@/services/speech/core/SpeechService.js';

@injectable()
class MyTool {
  constructor(@inject(SpeechService) private speech: SpeechServiceType) {}

  async execute() {
    // Orchestrator routes to appropriate provider (ElevenLabs, Whisper, etc.)
    const ttsProvider = this.speech.getTTSProvider();
    const audio = await ttsProvider.textToSpeech({
      text: 'Hello, world!',
      voice: { voiceId: 'en-US-Neural2-F' },
    });
    return audio;
  }
}
```

**Graph Service Example:**

```typescript
import { injectable, inject } from 'tsyringe';
import { GraphProvider } from '@/container/tokens.js';
import type { IGraphProvider } from '@/services/graph/core/IGraphProvider.js';
import { requestContextService } from '@/utils/index.js';

@injectable()
class MyTool {
  constructor(@inject(GraphProvider) private graphProvider: IGraphProvider) {}

  async execute() {
    const context = requestContextService.createRequestContext({
      operation: 'graph-query',
    });

    // Direct provider access for graph operations
    const path = await this.graphProvider.shortestPath(
      'user:alice',
      'user:bob',
      context,
      { algorithm: 'bfs' },
    );

    return path;
  }
}
```

---

## Provider Requirements

All providers must adhere to the following requirements:

1. **Implement the interface**
   - Extend `I[Service]Provider` interface
   - Implement all required methods with correct signatures

2. **Be injectable**
   - Add `@injectable()` decorator to class
   - Use constructor injection for dependencies

3. **Include health check**
   - Implement `healthCheck()` method
   - Return `boolean` indicating provider availability

4. **Throw McpError on failures**
   - Use `JsonRpcErrorCode` enum for error codes
   - Include context information in error messages

5. **Follow naming convention**
   - File name: `[name].provider.ts` (kebab-case)
   - Class name: `[Name]Provider` (PascalCase)

### Provider Template

```typescript
/**
 * @fileoverview [Provider Name] implementation for [Service] service
 * @module services/[service]/providers/[name]
 */

import { inject, injectable } from 'tsyringe';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { AppConfig, Logger } from '@/container/tokens.js';
import { logger as LoggerType } from '@/utils/internal/logger.js';
import { requestContextService, type RequestContext } from '@/utils/index.js';
import { config as ConfigType } from '@/config/index.js';
import type { I[Service]Provider } from '../core/I[Service]Provider.js';
import type { [Service]Request, [Service]Response } from '../types.js';

/**
 * [Provider description]
 *
 * Configuration:
 * - ENV_VAR_NAME: Description
 * - ENV_VAR_NAME_2: Description
 */
@injectable()
export class [Name]Provider implements I[Service]Provider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    @inject(AppConfig) private config: typeof ConfigType,
    @inject(Logger) private logger: typeof LoggerType,
  ) {
    const context = requestContextService.createRequestContext({
      operation: '[Name]Provider.constructor',
    });

    // Validate configuration
    this.apiKey = this.config.someApiKey || '';
    if (!this.apiKey) {
      this.logger.fatal(
        '[Provider] API key is not configured. Please set API_KEY.',
        context,
      );
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        '[Provider] API key not configured',
        context,
      );
    }
    this.baseUrl = this.config.someBaseUrl || 'https://api.example.com';

    this.logger.info('[Provider] instance created and ready.', context);
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const context = requestContextService.createRequestContext({
        operation: '[name]-healthCheck',
      });
      // Implement health check logic (e.g., lightweight API call)
      return true;
    } catch (error: unknown) {
      this.logger.error(
        '[Provider] health check failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }

  /**
   * Main service method
   */
  async execute(
    request: [Service]Request,
    context: RequestContext,
  ): Promise<[Service]Response> {
    this.logger.debug('[Provider] executing request', context);

    // Validate input
    if (!request.someField) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        'Required field is missing',
        context,
      );
    }

    try {
      // Implement service logic
      const response = await this.callApi(request, context);
      const transformed = this.transformResponse(response);

      this.logger.info('[Provider] execution successful', context);
      return transformed;
    } catch (error: unknown) {
      if (error instanceof McpError) {
        throw error;
      }

      this.logger.error(
        '[Provider] execution failed',
        error instanceof Error ? error : new Error(String(error)),
        context,
      );

      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `[Provider] execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context,
      );
    }
  }

  private async callApi(
    request: [Service]Request,
    context: RequestContext,
  ): Promise<unknown> {
    // API call implementation using fetchWithTimeout or similar
    // Example:
    // const response = await fetchWithTimeout(url, timeout, context, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${this.apiKey}` },
    //   body: JSON.stringify(request),
    // });
    // return response.json();
  }

  private transformResponse(response: unknown): [Service]Response {
    // Transform API response to domain type
    // Perform any necessary data mapping
    return response as [Service]Response;
  }
}
```

---

## Adding a New Service

### Step 1: Create Directory Structure

```bash
mkdir -p src/services/[service-name]/{core,providers}
touch src/services/[service-name]/{types.ts,index.ts}
```

### Step 2: Define Interface

**`core/I[Service]Provider.ts`:**

```typescript
/**
 * @fileoverview Interface for [Service] providers
 * @module services/[service]/core/I[Service]Provider
 */

import type { [Service]Request, [Service]Response } from '../types.js';

/**
 * Interface for [Service] providers
 */
export interface I[Service]Provider {
  /**
   * Health check for provider availability
   */
  healthCheck(): Promise<boolean>;

  /**
   * Execute [service] operation
   */
  execute(request: [Service]Request): Promise<[Service]Response>;
}
```

### Step 3: Define Types

**`types.ts`:**

```typescript
/**
 * @fileoverview Type definitions for [Service] service
 * @module services/[service]/types
 */

/**
 * Request payload for [service] operations
 */
export interface [Service]Request {
  // Define request fields
}

/**
 * Response from [service] operations
 */
export interface [Service]Response {
  // Define response fields
}

/**
 * Configuration for [service] providers
 */
export interface [Service]Config {
  // Define config fields
}
```

### Step 4: Implement Provider

Create `providers/[name].provider.ts` following the template above.

### Step 5: Add DI Token

**`src/container/tokens.ts`:**

```typescript
export const [Service]Provider = Symbol.for('I[Service]Provider');
```

### Step 6: Register Provider

**`src/container/registrations/core.ts`:**

**For single-provider services (like LLM):**

```typescript
import { [Name]Provider } from '@/services/[service]/providers/[name].provider.js';
import { [Service]Provider } from '@/container/tokens.js';
import type { I[Service]Provider } from '@/services/[service]/core/I[Service]Provider.js';

// In registerCoreServices():
container.register<I[Service]Provider>([Service]Provider, {
  useClass: [Name]Provider,
});
```

**For multi-provider services with factory (like Speech):**

```typescript
import { [Service]Service } from '@/services/[service]/core/[Service]Service.js';
import { [Service]Service as [Service]ServiceToken } from '@/container/tokens.js';
import type { [Service]ProviderConfig } from '@/services/[service]/types.js';

// In registerCoreServices():
container.register<[Service]Service>([Service]ServiceToken, {
  useFactory: (c) => {
    const config = c.resolve(AppConfig);

    // Configure TTS provider
    const ttsConfig: [Service]ProviderConfig | undefined = config.someTtsApiKey
      ? {
          provider: 'provider-name',
          apiKey: config.someTtsApiKey,
          // ... other config
        }
      : undefined;

    // Configure STT provider
    const sttConfig: [Service]ProviderConfig | undefined = config.someSttApiKey
      ? {
          provider: 'provider-name',
          apiKey: config.someSttApiKey,
          // ... other config
        }
      : undefined;

    return new [Service]Service(ttsConfig, sttConfig);
  },
});
```

**For services with singleton providers (like Graph with SurrealDB):**

```typescript
import { SurrealGraphProvider } from '@/services/graph/providers/surrealGraph.provider.js';
import { GraphProvider } from '@/container/tokens.js';
import type { IGraphProvider } from '@/services/graph/core/IGraphProvider.js';

// In registerCoreServices():
container.registerSingleton<IGraphProvider>(GraphProvider, (c) => {
  const surrealClient = c.resolve(SurrealdbClient);
  return new SurrealGraphProvider(surrealClient);
});
```

### Step 7: Export from Barrel

**`src/services/[service]/index.ts`:**

```typescript
export * from './core/I[Service]Provider.js';
export * from './providers/[name].provider.js';
export * from './types.js';
```

### Step 8: Add Tests

Create `tests/services/[service]/providers/[name].provider.test.ts`.

---

## Service Domains

### LLM Service

**Purpose:** Large Language Model completions (streaming and non-streaming)

**Provider:** OpenRouter

**Interface:** [ILlmProvider](llm/core/ILlmProvider.ts)

**Methods:**

- `chatCompletion(params, context)` - Chat completion (streaming or non-streaming based on params)
- `chatCompletionStream(params, context)` - Streaming chat completion (returns AsyncIterable)

**Configuration:**

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_APP_URL=https://your-app.com
OPENROUTER_APP_NAME=YourApp
LLM_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
LLM_DEFAULT_MAX_TOKENS=4000
LLM_DEFAULT_TEMPERATURE=0.7
```

**Usage Example:**

```typescript
import { inject } from 'tsyringe';
import { LlmProvider } from '@/container/tokens.js';
import type { ILlmProvider } from '@/services/llm/core/ILlmProvider.js';
import { requestContextService } from '@/utils/index.js';

// Non-streaming completion
const context = requestContextService.createRequestContext({
  operation: 'llm-completion',
});

const response = await llmProvider.chatCompletion(
  {
    messages: [{ role: 'user', content: 'Explain dependency injection' }],
    model: 'anthropic/claude-3.5-sonnet',
    max_tokens: 500,
  },
  context,
);

// Streaming completion
const streamResponse = await llmProvider.chatCompletionStream(
  {
    messages: [{ role: 'user', content: 'Write a story' }],
    model: 'anthropic/claude-3.5-sonnet',
    stream: true,
  },
  context,
);

for await (const chunk of streamResponse) {
  console.log(chunk.choices[0]?.delta?.content || '');
}
```

---

### Speech Service

**Purpose:** Text-to-Speech and Speech-to-Text operations

**Providers:** ElevenLabs (TTS), Whisper (STT)

**Orchestrator:** [SpeechService](speech/core/SpeechService.ts)

**Methods:**

- `textToSpeech(request)` - Convert text to audio
- `speechToText(request)` - Transcribe audio to text
- `healthCheck()` - Check all providers

**Configuration:**

```bash
SPEECH_TTS_API_KEY=...        # ElevenLabs API key
SPEECH_TTS_MODEL_ID=eleven_multilingual_v2
SPEECH_TTS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
SPEECH_STT_API_KEY=...        # Whisper API key
```

**Usage Example:**

```typescript
// Text-to-Speech
const audio = await speechService.textToSpeech({
  text: 'Hello, world!',
  voice: 'en-US-Neural2-F',
});

// Speech-to-Text
const transcript = await speechService.speechToText({
  audioBuffer: audioData,
  language: 'en',
});
```

---

### Graph Service

**Purpose:** Graph database operations (nodes, edges, traversals, pathfinding)

**Provider:** SurrealDB

**Orchestrator:** [GraphService](graph/core/GraphService.ts)

**Interface:** [IGraphProvider](graph/core/IGraphProvider.ts)

**Methods:**

- `relate(from, edgeTable, to, context, options)` - Create relationship between vertices
- `unrelate(edgeId, context)` - Remove relationship edge
- `traverse(startVertexId, context, options)` - Graph traversal from starting vertex
- `shortestPath(from, to, context, options)` - Find shortest path between vertices
- `getOutgoingEdges(vertexId, context, edgeTypes)` - Get outgoing edges from vertex
- `getIncomingEdges(vertexId, context, edgeTypes)` - Get incoming edges to vertex
- `pathExists(from, to, context, maxDepth)` - Check if path exists between vertices
- `getStats(context)` - Get graph statistics (vertex/edge counts, type distributions)
- `healthCheck()` - Provider health check

**Configuration:**

```bash
SURREALDB_URL=ws://localhost:8000/rpc
SURREALDB_NAMESPACE=mcp_server
SURREALDB_DATABASE=main
SURREALDB_USERNAME=root
SURREALDB_PASSWORD=root
```

**Usage Example:**

```typescript
import { inject } from 'tsyringe';
import { GraphProvider } from '@/container/tokens.js';
import type { IGraphProvider } from '@/services/graph/core/IGraphProvider.js';
import { requestContextService } from '@/utils/index.js';

const context = requestContextService.createRequestContext({
  operation: 'graph-operations',
});

// Create relationship
const edge = await graphProvider.relate(
  'user:alice',
  'follows',
  'user:bob',
  context,
  {
    data: { since: '2024-01-01' },
    allowDuplicates: false,
  },
);

// Traverse the graph
const traversal = await graphProvider.traverse('user:alice', context, {
  maxDepth: 2,
  direction: 'out',
  edgeTypes: ['follows'],
});

// Find shortest path
const path = await graphProvider.shortestPath(
  'user:alice',
  'user:charlie',
  context,
  { algorithm: 'bfs', maxLength: 10 },
);

// Get graph statistics
const stats = await graphProvider.getStats(context);
console.log(
  `Graph contains ${stats.vertexCount} vertices and ${stats.edgeCount} edges`,
);
```

---

## Testing Services

### Unit Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { [Name]Provider } from '@/services/[service]/providers/[name].provider.js';
import { AppConfig, Logger } from '@/container/tokens.js';
import { requestContextService } from '@/utils/index.js';
import { McpError } from '@/types-global/errors.js';

describe('[Name]Provider', () => {
  let provider: [Name]Provider;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    // Create mocks
    mockConfig = {
      someApiKey: 'test-key',
      someBaseUrl: 'https://api.test.com',
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };

    // Register mocks in container
    container.register(AppConfig, { useValue: mockConfig });
    container.register(Logger, { useValue: mockLogger });

    provider = container.resolve([Name]Provider);
  });

  describe('healthCheck', () => {
    it('returns true when provider is healthy', async () => {
      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });

    it('returns false when provider is unhealthy', async () => {
      // Mock failure scenario
      const result = await provider.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('executes successfully with valid request', async () => {
      const context = requestContextService.createRequestContext({
        operation: 'test-execute',
      });

      const request = { /* test data */ };
      const result = await provider.execute(request, context);

      expect(result).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('throws McpError on failure', async () => {
      const context = requestContextService.createRequestContext({
        operation: 'test-execute-fail',
      });

      const request = { /* invalid data */ };

      await expect(provider.execute(request, context)).rejects.toThrow(McpError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('validates required fields', async () => {
      const context = requestContextService.createRequestContext({
        operation: 'test-validate',
      });

      const invalidRequest = { /* missing required fields */ };

      await expect(provider.execute(invalidRequest, context)).rejects.toThrow(McpError);
    });
  });
});
```

---

## Best Practices

### 1. Error Handling

Always use `McpError` with appropriate `JsonRpcErrorCode`:

```typescript
// ✅ Good - using McpError with proper error code
throw new McpError(
  JsonRpcErrorCode.InternalError,
  'Descriptive error message',
  { additionalContext: 'value' },
);
```

### 2. Configuration Validation

Validate all configuration in constructor:

```typescript
// ✅ Good - validating required configuration
constructor() {
  this.apiKey = process.env.API_KEY || '';
  if (!this.apiKey) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'API key not configured: API_KEY environment variable is required'
    );
  }
}
```

### 3. Logging

Use structured logging with context:

```typescript
// ✅ Good - structured logging with context
import { logger } from '@/utils/index.js';

logger.info('Service operation started', {
  provider: 'ProviderName',
  operation: 'execute',
  requestId: context.requestId,
});
```

### 4. Health Checks

Implement meaningful health checks:

```typescript
// ✅ Good - health check with error handling
async healthCheck(): Promise<boolean> {
  try {
    // Make lightweight API call
    const response = await fetch(`${this.baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

### 5. Type Safety

Use strict types for all inputs and outputs:

```typescript
// ❌ Bad - using any types
async execute(data: any): Promise<any>

// ✅ Good - using strict types
async execute(request: ServiceRequest): Promise<ServiceResponse>
```

---

## Troubleshooting

### Provider Not Found

**Error:** `No matching provider found for token I[Service]Provider`

**Solution:** Ensure provider is registered in `src/container/registrations/core.ts`:

```typescript
container.register([Service]Provider, {
  useClass: [Name]Provider,
});
```

### Configuration Errors

**Error:** `API key not configured`

**Solution:** Set required environment variables in `.env`:

```bash
API_KEY=your-key-here
```

### Health Check Failures

**Error:** Provider health check returns false

**Solution:**

1. Verify API credentials are correct
2. Check network connectivity
3. Verify API endpoint is accessible
4. Review provider-specific logs

---

## See Also

- [Container Module](../container/README.md) - Dependency injection setup
- [Storage Module](../storage/README.md) - Data persistence patterns
- [CLAUDE.md](../../CLAUDE.md) - Architectural mandate (Section V)

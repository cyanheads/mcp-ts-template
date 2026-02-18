# Container Module (Dependency Injection)

## Overview

The `container/` directory implements a minimal, type-safe DI container with zero external dependencies. No decorators, no `reflect-metadata`, no runtime magic — just typed tokens and factory functions.

**Key Files:**

- **[core/container.ts](core/container.ts)** — `Container` class, `Token<T>`, `token<T>()` factory
- **[core/tokens.ts](core/tokens.ts)** — All DI tokens with phantom-typed interfaces
- **[registrations/core.ts](registrations/core.ts)** — Core service registration (config, logging, storage, LLM, etc.)
- **[registrations/mcp.ts](registrations/mcp.ts)** — MCP-specific registration (tools, resources, prompts, transport)
- **[index.ts](index.ts)** — Barrel export and `composeContainer()` entry point

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Application Entry Point              │
│              (src/index.ts)                      │
└────────────────┬────────────────────────────────┘
                 │
                 │ composeContainer()
                 │
┌────────────────▼────────────────────────────────┐
│              Container Module                    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Registration Phase               │    │
│  │  registerCoreServices()                  │    │
│  │  registerMcpServices()                   │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Resolution Phase                 │    │
│  │  container.resolve(token)                │    │
│  │  container.resolveAll(multiToken)        │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                 │
                 │ Resolved services
                 │
┌────────────────▼────────────────────────────────┐
│            Application Components               │
│      (Tools, Resources, Services)               │
└─────────────────────────────────────────────────┘
```

---

## Tokens

Tokens use phantom typing via `Token<T>` to carry the resolved type at compile time. This enables fully type-safe resolution without casts.

**File:** [core/tokens.ts](core/tokens.ts)

```typescript
import { token } from '@/container/core/container.js';
import type { logger } from '@/utils/internal/logger.js';

// The phantom type parameter ensures resolve() returns the correct type
export const Logger = token<typeof logger>('Logger');
export const AppConfig = token<ReturnType<typeof parseConfig>>('AppConfig');
```

### Available Tokens

| Token                     | Type                         | Purpose                         |
| ------------------------- | ---------------------------- | ------------------------------- |
| `AppConfig`               | `ReturnType<parseConfig>`    | Application configuration       |
| `Logger`                  | `typeof logger`              | Structured logging (Pino)       |
| `StorageService`          | `StorageService`             | Data persistence abstraction    |
| `StorageProvider`         | `IStorageProvider`           | Storage provider implementation |
| `LlmProvider`             | `ILlmProvider`               | LLM integration                 |
| `RateLimiterService`      | `RateLimiter`                | Rate limiting                   |
| `SpeechService`           | `SpeechService`              | TTS/STT orchestrator            |
| `SupabaseAdminClient`     | `SupabaseClient<Database>`   | Supabase admin client           |
| `CreateMcpServerInstance` | `() => Promise<McpServer>`   | Factory for MCP server          |
| `TransportManagerToken`   | `TransportManager`           | Transport lifecycle manager     |
| `TaskManagerToken`        | `TaskManager`                | MCP Tasks API manager           |
| `ToolRegistryToken`       | `ToolRegistry`               | Tool registration registry      |
| `ResourceRegistryToken`   | `ResourceRegistry`           | Resource registration registry  |
| `PromptRegistryToken`     | `PromptRegistry`             | Prompt registration registry    |
| `RootsRegistryToken`      | `RootsRegistry`              | Roots capability registry       |
| `ToolDefinitions`         | (multi) Tool definitions     | All registered tool definitions |
| `ResourceDefinitions`     | (multi) Resource definitions | All registered resources        |

---

## Container API

**File:** [core/container.ts](core/container.ts)

### Registration

```typescript
// Pre-built value (always singleton)
container.registerValue(Logger, logger);

// Singleton factory — instantiated once on first resolve()
container.registerSingleton(
  StorageService,
  (c) => new StorageServiceClass(c.resolve(StorageProvider)),
);

// Transient factory — new instance per resolve()
container.registerFactory(MyToken, (c) => new MyService(c.resolve(Logger)));

// Singleton factory with explicit option
container.registerFactory(MyToken, factory, { singleton: true });

// Multi-registration — collect multiple values under one token
for (const tool of allToolDefinitions) {
  container.registerMulti(ToolDefinitions, tool);
}
```

### Resolution

```typescript
// Single value — throws if not registered
const logger = container.resolve(Logger);

// Multi-token — returns T[] (empty array if none registered)
const tools = container.resolveAll(ToolDefinitions);

// Check existence
if (container.has(SpeechService)) {
  /* ... */
}
```

### Test Isolation

```typescript
// Fork — creates a child container with shallow-copied registrations
const child = container.fork();

// Clear singleton instances (registrations remain)
container.clearInstances();

// Full reset — remove all registrations and instances
container.reset();
```

---

## Service Registration

### Core Services

**File:** [registrations/core.ts](registrations/core.ts)

```typescript
import { container } from '@/container/core/container.js';
import {
  AppConfig,
  Logger,
  StorageProvider,
  StorageService,
} from '@/container/core/tokens.js';

export const registerCoreServices = () => {
  const config = parseConfig();

  // Static values
  container.registerValue(AppConfig, config);
  container.registerValue(Logger, logger);

  // Factory with dependency resolution
  container.registerSingleton(StorageProvider, (c) => {
    const cfg = c.resolve(AppConfig);
    return createStorageProvider(cfg, deps);
  });

  // Service depending on another service
  container.registerSingleton(
    StorageService,
    (c) => new StorageServiceClass(c.resolve(StorageProvider)),
  );
};
```

### MCP Services

**File:** [registrations/mcp.ts](registrations/mcp.ts)

```typescript
import { container } from '@/container/core/container.js';
import { ToolDefinitions, ToolRegistryToken } from '@/container/core/tokens.js';

export const registerMcpServices = () => {
  // Multi-register all tool definitions
  for (const tool of allToolDefinitions) {
    container.registerMulti(ToolDefinitions, tool);
  }

  // Registry consumes multi-registered definitions
  container.registerSingleton(
    ToolRegistryToken,
    (c) => new ToolRegistry(c.resolveAll(ToolDefinitions)),
  );
};
```

---

## Container Lifecycle

```typescript
// src/index.ts
import { composeContainer } from '@/container/index.js';

// Called once at startup — registers all services
composeContainer();
```

`composeContainer()` is idempotent (guarded by `isContainerComposed` flag). It calls `registerCoreServices()` then `registerMcpServices()`.

---

## Adding a New Service

### 1. Define Token

**File:** [core/tokens.ts](core/tokens.ts)

```typescript
import type { IMyService } from '@/services/my-service/core/IMyService.js';

export const MyService = token<IMyService>('MyService');
```

### 2. Create Service

```typescript
// src/services/my-service/core/IMyService.ts
export interface IMyService {
  execute(): Promise<void>;
}

// src/services/my-service/providers/my.provider.ts
export class MyServiceImpl implements IMyService {
  constructor(private logger: typeof import('@/utils/index.js').logger) {}

  async execute(): Promise<void> {
    this.logger.info('Executing');
  }
}
```

### 3. Register

**File:** [registrations/core.ts](registrations/core.ts)

```typescript
import { MyService } from '@/container/core/tokens.js';
import { MyServiceImpl } from '@/services/my-service/providers/my.provider.js';

// Inside registerCoreServices():
container.registerSingleton(
  MyService,
  (c) => new MyServiceImpl(c.resolve(Logger)),
);
```

### 4. Use

```typescript
import { container } from '@/container/index.js';
import { MyService } from '@/container/core/tokens.js';

const myService = container.resolve(MyService);
await myService.execute();
```

---

## Testing with DI

### Forking for Isolation

```typescript
import { container } from '@/container/core/container.js';
import { Logger } from '@/container/core/tokens.js';

describe('MyService', () => {
  let testContainer: typeof container;

  beforeEach(() => {
    testContainer = container.fork();
    testContainer.registerValue(Logger, mockLogger);
  });

  it('uses injected logger', () => {
    const service = testContainer.resolve(MyService);
    // service uses mockLogger
  });
});
```

### Clearing Singleton State

```typescript
afterEach(() => {
  container.clearInstances(); // Resets singletons, keeps registrations
});
```

---

## Best Practices

1. **Depend on interfaces, not implementations** — tokens carry interface types
2. **Register early, resolve late** — all registration happens in `composeContainer()`, resolution happens at runtime
3. **Keep registration centralized** — all in `registrations/core.ts` or `registrations/mcp.ts`
4. **Use singletons for stateless services** — config, logger, storage, providers
5. **Use `fork()` in tests** — isolates test state without affecting the global container

---

## See Also

- [Services Module](../services/README.md) — Service development pattern
- [MCP Server Module](../mcp-server/README.md) — Using DI in tools/resources
- [Storage Module](../storage/README.md) — Storage service injection
- [AGENTS.md](../../AGENTS.md) — Architectural mandate (Section VI)

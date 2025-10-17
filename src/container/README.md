# Container Module (Dependency Injection)

## Overview

The `container/` directory manages dependency injection (DI) using [tsyringe](https://github.com/microsoft/tsyringe). This module provides centralized registration and resolution of services, ensuring loose coupling and testability.

**Key Files:**

- **[tokens.ts](tokens.ts)** - DI tokens (symbols for interface resolution)
- **[registrations/core.ts](registrations/core.ts)** - Core service registration
- **[registrations/mcp.ts](registrations/mcp.ts)** - MCP-specific registration
- **[index.ts](index.ts)** - Barrel export and container instance

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Application Entry Point              │
│              (src/index.ts)                     │
└────────────────┬────────────────────────────────┘
                 │
                 │ Imports container
                 │
┌────────────────▼────────────────────────────────┐
│              Container Module                   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Registration Phase               │   │
│  │  - Core services (Logger, Storage)       │   │
│  │  - MCP services (Server, Transport)      │   │
│  │  - External services (LLM, Speech)       │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Resolution Phase                 │   │
│  │  - Constructor injection                 │   │
│  │  - @inject() decorator                   │   │
│  │  - container.resolve()                   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                 │
                 │ Injected services
                 │
┌────────────────▼────────────────────────────────┐
│            Application Components               │
│      (Tools, Resources, Services)               │
└─────────────────────────────────────────────────┘
```

---

## DI Tokens

**File:** [tokens.ts](tokens.ts)

Tokens are symbols used to identify injectable services.

```typescript
/**
 * Token for Logger service
 */
export const Logger = Symbol('Logger');

/**
 * Token for Storage service
 */
export const StorageService = Symbol('StorageService');

/**
 * Token for LLM provider
 */
export const LlmProvider = Symbol('ILlmProvider');
```

### Available Tokens

| Token                     | Interface/Type             | Purpose                                 |
| ------------------------- | -------------------------- | --------------------------------------- |
| `Logger`                  | `typeof logger`            | Structured logging (Pino)               |
| `AppConfig`               | `ReturnType<parseConfig>`  | Application configuration               |
| `StorageService`          | `StorageService`           | Data persistence abstraction            |
| `StorageProvider`         | `IStorageProvider`         | Storage provider implementation         |
| `LlmProvider`             | `ILlmProvider`             | Large Language Model integration        |
| `GraphService`            | `GraphService`             | Graph database operations               |
| `SpeechService`           | `SpeechService`            | TTS/STT orchestrator                    |
| `RateLimiterService`      | `RateLimiter`              | Rate limiting                           |
| `SupabaseAdminClient`     | `SupabaseClient<Database>` | Supabase admin client                   |
| `SurrealdbClient`         | `Surreal`                  | SurrealDB client                        |
| `TransportManagerToken`   | `TransportManager`         | Transport lifecycle manager             |
| `ToolDefinitions`         | `ToolDefinition[]`         | Multi-injection token for MCP tools     |
| `ResourceDefinitions`     | `ResourceDefinition[]`     | Multi-injection token for MCP resources |
| `CreateMcpServerInstance` | `() => Promise<McpServer>` | Factory for creating MCP server         |

---

## Service Registration

### Multi-Injection Pattern (MCP Tools & Resources)

**Special Case:** `ToolDefinitions` and `ResourceDefinitions` use a multi-injection pattern where multiple values are registered under the same token:

```typescript
// In tool-registration.ts
export const registerTools = (container: DependencyContainer): void => {
  for (const tool of allToolDefinitions) {
    container.register(ToolDefinitions, { useValue: tool });
  }
};

// In resource-registration.ts
export const registerResources = (container: DependencyContainer): void => {
  for (const resource of allResourceDefinitions) {
    container.register(ResourceDefinitions, { useValue: resource });
  }
};
```

These are then resolved using `@injectAll()`:

```typescript
@injectable()
export class ToolRegistry {
  constructor(
    @injectAll(ToolDefinitions, { isOptional: true })
    private toolDefs: ToolDefinition<
      ZodObject<ZodRawShape>,
      ZodObject<ZodRawShape>
    >[],
  ) {}
}
```

### Core Services

**File:** [registrations/core.ts](registrations/core.ts)

```typescript
import { container, Lifecycle } from 'tsyringe';
import {
  Logger,
  AppConfig,
  StorageService,
  StorageProvider,
} from '../tokens.js';
import { logger } from '@/utils/index.js';
import { parseConfig } from '@/config/index.js';
import { StorageService as StorageServiceImpl } from '@/storage/core/StorageService.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';

/**
 * Register core services
 */
export function registerCoreServices(): void {
  // Configuration (parsed and registered as a static value)
  const config = parseConfig();
  container.register(AppConfig, { useValue: config });

  // Logger (as a static value)
  container.register(Logger, { useValue: logger });

  // Storage provider factory
  container.register(StorageProvider, {
    useFactory: (c) => createStorageProvider(c.resolve(AppConfig)),
  });

  // Storage service (singleton)
  container.register(
    StorageService,
    { useClass: StorageServiceImpl },
    { lifecycle: Lifecycle.Singleton },
  );

  // ... other core services
}
```

### MCP Services

**File:** [registrations/mcp.ts](registrations/mcp.ts)

```typescript
import { container } from 'tsyringe';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateMcpServerInstance, TransportManagerToken } from '../tokens.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import {
  ToolRegistry,
  registerTools,
} from '@/mcp-server/tools/tool-registration.js';
import {
  ResourceRegistry,
  registerResources,
} from '@/mcp-server/resources/resource-registration.js';

/**
 * Register MCP-specific services
 */
export function registerMcpServices(): void {
  // Register registries as singletons
  container.registerSingleton(ToolRegistry);
  container.registerSingleton(ResourceRegistry);

  // Register tools & resources (via modular functions)
  registerTools(container);
  registerResources(container);

  // Register the server factory function
  container.register<() => Promise<McpServer>>(CreateMcpServerInstance, {
    useValue: createMcpServerInstance,
  });

  // Register TransportManager
  container.registerSingleton(TransportManagerToken, TransportManager);
}
```

---

## Service Lifetimes

### Singleton (Default)

**One instance per application:**

```typescript
container.registerSingleton(StorageService, StorageServiceImpl);
```

Use for:

- Stateless services
- Shared resources (logger, config)
- Connection pools

### Transient

**New instance per resolution:**

```typescript
container.register(MyService, MyServiceImpl, {
  lifecycle: Lifecycle.Transient,
});
```

Use for:

- Stateful operations
- Request-scoped services (not recommended, use context instead)

### Instance (Value)

**Pre-created instance:**

```typescript
container.register(Logger, { useValue: logger });
```

Use for:

- Pre-configured objects
- Constants
- External dependencies

---

## Using Dependency Injection

### Constructor Injection (Recommended)

```typescript
import { injectable, inject } from 'tsyringe';
import { StorageService, Logger } from '@/container/tokens.js';
import type { logger } from '@/utils/index.js';

@injectable()
export class MyTool {
  constructor(
    @inject(StorageService) private storage: StorageService,
    @inject(Logger) private logger: typeof logger,
  ) {
    // Services are now available
  }

  async execute() {
    this.logger.info('Executing tool');
    const data = await this.storage.get('tenant1', 'key1');
    return data;
  }
}

// Resolution (automatic in tool/resource handlers)
const tool = container.resolve(MyTool);
await tool.execute();
```

### Manual Resolution

```typescript
import { container } from 'tsyringe';
import { StorageService } from '@/container/tokens.js';

// Resolve service directly
const storage = container.resolve<StorageService>(StorageService);
await storage.set('tenant1', 'key1', 'value1');
```

### Optional Dependencies

```typescript
import { injectable, inject, optional } from 'tsyringe';

@injectable()
export class MyService {
  constructor(
    @inject(RequiredService) private required: RequiredService,
    @inject(OptionalService) @optional() private optional?: OptionalService,
  ) {
    if (this.optional) {
      // Use optional service
    }
  }
}
```

---

## Adding a New Service

### Step 1: Define Token

**File:** [tokens.ts](tokens.ts)

```typescript
/**
 * Token for MyService
 */
export const MyService = Symbol('IMyService');
```

### Step 2: Create Service

**File:** `src/services/my-service/core/IMyService.ts`

```typescript
export interface IMyService {
  execute(): Promise<void>;
}
```

**File:** `src/services/my-service/providers/my.provider.ts`

```typescript
import { injectable } from 'tsyringe';
import type { IMyService } from '../core/IMyService.js';

@injectable()
export class MyServiceImpl implements IMyService {
  async execute(): Promise<void> {
    // Implementation
  }
}
```

### Step 3: Register Service

**File:** [registrations/core.ts](registrations/core.ts)

```typescript
import { MyService } from '../tokens.js';
import { MyServiceImpl } from '@/services/my-service/providers/my.provider.js';

export function registerCoreServices(): void {
  // ... existing registrations

  // Register new service
  container.registerSingleton(MyService, MyServiceImpl);
}
```

### Step 4: Use Service

```typescript
import { injectable, inject } from 'tsyringe';
import { MyService } from '@/container/tokens.js';
import type { IMyService } from '@/services/my-service/core/IMyService.js';

@injectable()
export class MyTool {
  constructor(@inject(MyService) private myService: IMyService) {}

  async execute() {
    await this.myService.execute();
  }
}
```

---

## Conditional Registration

### Environment-Based Registration

```typescript
export function registerCoreServices(): void {
  // Register storage provider based on config
  const storageType = config.STORAGE_PROVIDER_TYPE;

  if (storageType === 'supabase') {
    container.registerSingleton(StorageProviderToken, SupabaseProvider);
  } else if (storageType === 'surrealdb') {
    container.registerSingleton(StorageProviderToken, SurrealKvProvider);
  } else {
    container.registerSingleton(StorageProviderToken, InMemoryProvider);
  }
}
```

### Feature Flags

```typescript
import { GraphService as GraphServiceClass } from '@/services/graph/core/GraphService.js';
import { SurrealGraphProvider } from '@/services/graph/providers/surrealGraph.provider.js';

export function registerCoreServices(): void {
  // Register GraphService with factory (uses SurrealDB client)
  container.register<GraphServiceClass>(GraphService, {
    useFactory: (c) => {
      const surrealClient = c.resolve<Surreal>(SurrealdbClient);
      const graphProvider = new SurrealGraphProvider(surrealClient);
      return new GraphServiceClass(graphProvider);
    },
  });
}
```

---

## Testing with DI

### Mocking Dependencies

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { container } from 'tsyringe';
import { StorageService } from '@/container/tokens.js';
import { MyTool } from './my-tool.js';

describe('MyTool', () => {
  beforeEach(() => {
    // Create child container for test isolation
    container.clearInstances();

    // Mock storage service
    const mockStorage = {
      get: vi.fn().mockResolvedValue('mock-value'),
      set: vi.fn().mockResolvedValue(true),
    };

    container.register(StorageService, { useValue: mockStorage as any });
  });

  afterEach(() => {
    // Clean up
    container.clearInstances();
  });

  it('uses storage service', async () => {
    const tool = container.resolve(MyTool);
    const result = await tool.execute();

    expect(result).toBe('mock-value');
  });
});
```

### Child Containers

```typescript
import { container } from 'tsyringe';

describe('MyTest', () => {
  let childContainer: DependencyContainer;

  beforeEach(() => {
    // Create isolated container
    childContainer = container.createChildContainer();

    // Register test-specific services
    childContainer.register(Logger, { useValue: mockLogger });
  });

  it('uses child container', () => {
    const tool = childContainer.resolve(MyTool);
    // Test with isolated dependencies
  });
});
```

---

## Best Practices

### 1. Use Interfaces, Not Implementations

```typescript
// ❌ Bad - depends on concrete class
@injectable()
export class MyTool {
  constructor(
    @inject(StorageService) private storage: InMemoryProvider, // ❌
  ) {}
}

// ✅ Good - depends on interface
@injectable()
export class MyTool {
  constructor(
    @inject(StorageService) private storage: StorageService, // ✅
  ) {}
}
```

### 2. Inject All Dependencies

```typescript
// ❌ Bad - creates dependency directly
@injectable()
export class MyTool {
  private logger = logger; // ❌ Global import

  async execute() {
    this.logger.info('Executing');
  }
}

// ✅ Good - injects dependency
@injectable()
export class MyTool {
  constructor(
    @inject(Logger) private logger: typeof logger, // ✅
  ) {}

  async execute() {
    this.logger.info('Executing');
  }
}
```

### 3. Use Singleton for Stateless Services

```typescript
// ✅ Good - stateless service is singleton
container.registerSingleton(MyStatelessService, MyStatelessServiceImpl);

// ⚠️ Careful - stateful service might need transient
container.register(MyStatefulService, MyStatefulServiceImpl, {
  lifecycle: Lifecycle.Transient,
});
```

### 4. Register Early, Resolve Late

```typescript
// ❌ Bad - resolve at module level
export const storage = container.resolve<StorageService>(StorageService);

// ✅ Good - resolve in function/constructor
@injectable()
export class MyTool {
  constructor(@inject(StorageService) private storage: StorageService) {}
}
```

### 5. Keep Registration Centralized

```typescript
// ❌ Bad - register in multiple places
container.registerSingleton(MyService, MyServiceImpl); // in moduleA
container.registerSingleton(MyService, MyServiceImpl); // in moduleB

// ✅ Good - register once in registrations/
export function registerCoreServices(): void {
  container.registerSingleton(MyService, MyServiceImpl);
}
```

---

## Advanced Patterns

### Factory Registration

```typescript
container.register(MyService, {
  useFactory: (c) => {
    const config = c.resolve<typeof configModule>(AppConfig);
    return new MyServiceImpl(config.MY_SERVICE_URL);
  },
});
```

### Lazy Loading

```typescript
@injectable()
export class MyTool {
  constructor(
    @inject(delay(() => ExpensiveService)) private expensive: ExpensiveService,
  ) {}
}
```

### Named Registrations

```typescript
// Register multiple implementations
container.register('PrimaryStorage', { useClass: SupabaseProvider });
container.register('CacheStorage', { useClass: InMemoryProvider });

// Resolve specific implementation
@injectable()
export class MyTool {
  constructor(
    @inject('PrimaryStorage') private primary: IStorageProvider,
    @inject('CacheStorage') private cache: IStorageProvider,
  ) {}
}
```

---

## Troubleshooting

### Error: "Cannot resolve ..."

**Cause:** Service not registered or circular dependency

**Solution:**

1. Check service is registered in `registrations/`
2. Verify token matches
3. Check for circular dependencies

### Error: "Reflect.getOwnMetadata is not a function"

**Cause:** Missing `reflect-metadata` import

**Solution:** Ensure `reflect-metadata` is imported at app entry point:

```typescript
import 'reflect-metadata';
```

### Error: Multiple instances when expecting singleton

**Cause:** Registering service multiple times

**Solution:** Ensure service is registered only once:

```typescript
// Check if already registered
if (!container.isRegistered(MyService)) {
  container.registerSingleton(MyService, MyServiceImpl);
}
```

### Error: "injectable() decorator missing"

**Cause:** Forgot `@injectable()` decorator

**Solution:** Add decorator to class:

```typescript
@injectable()
export class MyService {
  // ...
}
```

---

## Circular Dependencies

### Detecting Circular Dependencies

**Error message:**

```
Maximum call stack size exceeded
```

**Common causes:**

- ServiceA depends on ServiceB
- ServiceB depends on ServiceA

### Resolving Circular Dependencies

**Option 1: Use `@inject()` with `delay()`**

```typescript
import { injectable, inject, delay } from 'tsyringe';

@injectable()
export class ServiceA {
  constructor(@inject(delay(() => ServiceB)) private serviceB: ServiceB) {}
}
```

**Option 2: Introduce intermediate service**

```typescript
// Break cycle with interface
export interface ISharedData {
  getData(): string;
}

@injectable()
export class ServiceA {
  constructor(@inject(SharedDataToken) private data: ISharedData) {}
}

@injectable()
export class ServiceB {
  constructor(@inject(SharedDataToken) private data: ISharedData) {}
}
```

**Option 3: Refactor to eliminate cycle**

```typescript
// Extract common logic to third service
@injectable()
export class CommonService {
  commonLogic() {
    // Shared logic
  }
}

@injectable()
export class ServiceA {
  constructor(@inject(CommonService) private common: CommonService) {}
}

@injectable()
export class ServiceB {
  constructor(@inject(CommonService) private common: CommonService) {}
}
```

---

## Container Lifecycle

### Initialization

```typescript
// src/index.ts
import 'reflect-metadata';
import { composeContainer } from '@/container/index.js';

// Register all services at startup
composeContainer();
```

The `composeContainer()` function internally calls both `registerCoreServices()` and `registerMcpServices()`:

```typescript
// src/container/index.ts
export function composeContainer(): void {
  if (isContainerComposed) {
    return;
  }

  registerCoreServices();
  registerMcpServices();

  isContainerComposed = true;
}
```

### Cleanup

```typescript
// Clear instances (for testing)
container.clearInstances();

// Reset entire container (use with caution)
container.reset();
```

---

## See Also

- [Services Module](../services/README.md) - Service development pattern
- [MCP Server Module](../mcp-server/README.md) - Using DI in tools/resources
- [Storage Module](../storage/README.md) - Storage service injection
- [tsyringe Documentation](https://github.com/microsoft/tsyringe) - Official docs
- [CLAUDE.md](../../CLAUDE.md) - Architectural mandate (Section VI)

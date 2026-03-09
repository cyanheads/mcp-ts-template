# 11 — Consumer Workflow

> End-to-end walkthrough of building an MCP server on `@cyanheads/mcp-ts-core`. Uses the developer API defined in [12-developer-api.md](12-developer-api.md).

---

## Purpose

Documents 01-10 describe how we build the core. Document 12 defines the developer API. This document shows what it's like to **use** it — the full developer experience from `bun init` to production deployment. Uses a concrete example ("bookmarks" MCP server) to surface gaps, friction, or design tensions.

---

## Project Structure

```
bookmarks-mcp-server/
  src/
    index.ts                              # Node entry — createApp()
    worker.ts                             # Worker entry — createWorkerHandler()
    config/
      server-config.ts                    # Server-specific env vars (Zod)
    services/
      bookmarks/
        bookmarks-service.ts              # Domain service (init/accessor)
        types.ts                          # Domain types
    mcp-server/
      tools/
        add-bookmark.tool.ts
        search-bookmarks.tool.ts
        delete-bookmark.tool.ts
        index.ts                          # allToolDefinitions barrel
      resources/
        bookmark-collection.resource.ts
        index.ts                          # allResourceDefinitions barrel
      prompts/
        summarize-bookmarks.prompt.ts
        index.ts                          # allPromptDefinitions barrel
    tests/
      tools/
        add-bookmark.tool.test.ts
        search-bookmarks.tool.test.ts
      services/
        bookmarks-service.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.toml                           # If deploying to Workers
  CLAUDE.md
```

What's absent is as important as what's present. No `src/container/`, no `src/utils/`, no `src/types-global/`, no `src/storage/`, no `src/mcp-server/transports/` — all of that is framework.

---

## Setup

### package.json

```jsonc
{
  "name": "bookmarks-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc && tsc-alias",
    "build:worker": "bun build src/worker.ts --target=node --outdir=dist-worker --no-external",
    "dev:stdio": "bun run --watch src/index.ts",
    "dev:http": "MCP_TRANSPORT_TYPE=http bun run --watch src/index.ts",
    "devcheck": "bun run build:check && bun run lint && bun run test",
    "build:check": "tsc --noEmit",
    "lint": "biome check",
    "test": "vitest run",
    "start:stdio": "node dist/index.js",
    "start:http": "MCP_TRANSPORT_TYPE=http node dist/index.js"
  },
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.3.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "tsc-alias": "^1.8.0",
    "vitest": "^4.0.0",
    "pino-pretty": "^13.0.0"
  }
}
```

Two production deps. Add Tier 3 peers as needed (e.g., `js-yaml` if using YAML parsing, `sanitize-html` if using sanitization).

### tsconfig.json

```jsonc
{
  "extends": "@cyanheads/mcp-ts-core/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

### vitest.config.ts

```ts
import { defineConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';

export default defineConfig({
  ...coreConfig,
  resolve: {
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
```

---

## Entry Points

### src/index.ts (Node)

```ts
#!/usr/bin/env node
import { createApp } from '@cyanheads/mcp-ts-core';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';
import { initBookmarksService } from './services/bookmarks/bookmarks-service.js';

await createApp({
  name: 'bookmarks-mcp-server',
  version: '0.1.0',
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initBookmarksService(core.config, core.storage);
  },
});
```

10 lines of meaningful code. `createApp()` handles: config parsing, logger init, OTEL, storage provider construction, transport startup, signal handlers, error hooks, shutdown orchestration.

### src/worker.ts (Cloudflare Workers)

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';
import { initBookmarksService } from './services/bookmarks/bookmarks-service.js';

export default createWorkerHandler({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initBookmarksService(core.config, core.storage);
  },
  extraEnvBindings: [['BOOKMARKS_API_KEY', 'BOOKMARKS_API_KEY']],
});
```

Same definitions, same setup. `createWorkerHandler()` handles: env injection, binding storage, singleton caching, per-request server creation, error responses.

---

## Server Config

```ts
// src/config/server-config.ts
import { z } from 'zod';

const ServerConfigSchema = z.object({
  bookmarksApiKey: z.string().optional().describe('External bookmarks API key'),
  maxBookmarksPerUser: z.coerce.number().default(1000).describe('Max bookmarks per tenant'),
  defaultPageSize: z.coerce.number().default(20).describe('Default pagination page size'),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

let _config: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  _config ??= ServerConfigSchema.parse({
    bookmarksApiKey: process.env.BOOKMARKS_API_KEY,
    maxBookmarksPerUser: process.env.BOOKMARKS_MAX_PER_USER,
    defaultPageSize: process.env.BOOKMARKS_DEFAULT_PAGE_SIZE,
  });
  return _config;
}
```

Lazy parsing — mandatory for Worker compatibility where `process.env` is populated at request time, not import time. Core's own config follows the same pattern.

---

## Server-Specific Services

```ts
// src/services/bookmarks/bookmarks-service.ts
import type { AppConfig } from '@cyanheads/mcp-ts-core/config';
import type { StorageService } from '@cyanheads/mcp-ts-core/storage';
import type { Context } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { getServerConfig } from '../../config/server-config.js';
import type { Bookmark, BookmarkCreateInput } from './types.js';

export class BookmarksService {
  constructor(
    private readonly config: AppConfig,
    private readonly storage: StorageService,
  ) {}

  async create(input: BookmarkCreateInput, ctx: Context): Promise<Bookmark> {
    const serverConfig = getServerConfig();
    ctx.log.debug('Creating bookmark', { url: input.url });

    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      url: input.url,
      title: input.title,
      tags: input.tags ?? [],
      createdAt: new Date().toISOString(),
    };

    await ctx.state.set(`bookmark:${bookmark.id}`, JSON.stringify(bookmark));
    return bookmark;
  }

  async search(query: string, ctx: Context): Promise<Bookmark[]> {
    ctx.log.debug('Searching bookmarks', { query });
    // Implementation using ctx.state.list() + filtering
    return [];
  }
}

// --- Init/accessor pattern ---

let _service: BookmarksService | undefined;

export function initBookmarksService(config: AppConfig, storage: StorageService): void {
  _service = new BookmarksService(config, storage);
}

export function getBookmarksService(): BookmarksService {
  if (!_service) {
    throw new McpError(
      JsonRpcErrorCode.InitializationFailed,
      'BookmarksService not initialized — was setup() called?',
    );
  }
  return _service;
}
```

Services receive `Context` in their methods — they use `ctx.log` for correlated logging and `ctx.state` for tenant-scoped storage. The init/accessor pattern replaces DI: `initBookmarksService` is called in `setup()`, `getBookmarksService` is called at request time.

---

## Tool Definition

```ts
// src/mcp-server/tools/add-bookmark.tool.ts
import { z } from 'zod';
import { tool } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';
import { getBookmarksService } from '../../services/bookmarks/bookmarks-service.js';

export const addBookmark = tool('add_bookmark', {
  description: 'Save a URL as a bookmark with title and optional tags.',
  annotations: { readOnlyHint: false, idempotentHint: false },
  input: z.object({
    url: z.string().url().describe('URL to bookmark'),
    title: z.string().describe('Human-readable title'),
    tags: z.array(z.string()).optional().describe('Categorization tags'),
  }),
  output: z.object({
    id: z.string().describe('Created bookmark ID'),
    url: z.string().describe('Bookmarked URL'),
    title: z.string().describe('Bookmark title'),
    tags: z.array(z.string()).describe('Applied tags'),
    createdAt: z.string().describe('ISO 8601 creation timestamp'),
  }),
  auth: ['bookmark:write'],

  async handler(input, ctx) {
    ctx.log.info('Adding bookmark', { url: input.url });
    const bookmark = await getBookmarksService().create(input, ctx);
    return bookmark;
  },

  format: (result) => {
    const md = markdown()
      .text(`Bookmark saved: **${result.title}**\n`)
      .text(`URL: ${result.url}\n`)
      .text(`ID: \`${result.id}\``);
    md.when(result.tags.length > 0, () => {
      md.text(`\nTags: ${result.tags.join(', ')}`);
    });
    return [{ type: 'text', text: md.build() }];
  },
});
```

What's different from the old pattern:

| Aspect | Old | New |
|:-------|:----|:----|
| Definition | 50+ line `ToolDefinition` object literal | `tool()` builder — name as first arg |
| Handler signature | `(input, appContext, sdkContext)` | `(input, ctx)` |
| Auth | `withToolAuth(['scope'], fn)` wrapper | `auth: ['scope']` property |
| Logging | `logger.info(msg, { ...appContext })` | `ctx.log.info(msg)` |
| Schema names | `inputSchema`, `outputSchema` | `input`, `output` |
| Formatter | `responseFormatter` | `format` |

### Import story

| Import | Source | What it provides |
|:-------|:-------|:-----------------|
| `tool` | `@cyanheads/mcp-ts-core` | Builder function |
| `McpError`, `JsonRpcErrorCode` | `@cyanheads/mcp-ts-core/errors` | Error types |
| `markdown` | `@cyanheads/mcp-ts-core/utils/formatting` | Response builder |
| `getBookmarksService` | `@/services/...` (relative) | Server's own service |

No `logger` import. No `RequestContext` import. No `withToolAuth` import. The `Context` provides logging, and auth is declarative.

### Tool barrel

```ts
// src/mcp-server/tools/index.ts
import type { AnyToolDefinition } from '@cyanheads/mcp-ts-core';
import { addBookmark } from './add-bookmark.tool.js';
import { searchBookmarks } from './search-bookmarks.tool.js';
import { deleteBookmark } from './delete-bookmark.tool.js';

export const allToolDefinitions: AnyToolDefinition[] = [
  addBookmark,
  searchBookmarks,
  deleteBookmark,
];
```

---

## Resource Definition

```ts
// src/mcp-server/resources/bookmark-collection.resource.ts
import { z } from 'zod';
import { resource } from '@cyanheads/mcp-ts-core';
import { getBookmarksService } from '../../services/bookmarks/bookmarks-service.js';

export const bookmarkCollection = resource('bookmarks://collection{?tag}', {
  description: 'List of saved bookmarks, optionally filtered by tag.',
  mimeType: 'application/json',
  params: z.object({
    tag: z.string().optional().describe('Filter by tag'),
  }),
  auth: ['bookmarks:read'],

  async handler(params, ctx) {
    const bookmarks = await getBookmarksService().search(params.tag ?? '', ctx);
    return {
      bookmarks: bookmarks.map(b => ({ id: b.id, url: b.url, title: b.title })),
      total: bookmarks.length,
    };
  },

  list: async () => ({
    resources: [
      {
        uri: 'bookmarks://collection',
        name: 'All Bookmarks',
        description: 'Complete bookmark collection',
        mimeType: 'application/json',
      },
    ],
  }),
});
```

Handler receives `(params, ctx)` — no raw `URL` object. URI available on `ctx.uri` if needed.

---

## Prompt Definition

```ts
// src/mcp-server/prompts/summarize-bookmarks.prompt.ts
import { z } from 'zod';
import { prompt } from '@cyanheads/mcp-ts-core';

export const summarizeBookmarks = prompt('summarize_bookmarks', {
  description: 'Generate a summary of saved bookmarks, optionally filtered by tag.',
  args: z.object({
    tag: z.string().optional().describe('Filter bookmarks by tag before summarizing'),
    format: z.enum(['brief', 'detailed']).default('brief').describe('Summary format'),
  }),
  generate: (args) => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Summarize my bookmarks${args.tag ? ` tagged "${args.tag}"` : ''}.`,
          `Format: ${args.format}.`,
          args.format === 'detailed'
            ? 'Include key topics, relationships between bookmarks, and suggested reading order.'
            : 'List each bookmark with a one-line description.',
        ].join('\n'),
      },
    },
  ],
});
```

Prompts are pure message templates — no `Context`, no auth, no side effects.

---

## Testing

```ts
// src/tests/tools/add-bookmark.tool.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { McpError } from '@cyanheads/mcp-ts-core/errors';
import { addBookmark } from '@/mcp-server/tools/add-bookmark.tool.js';
import { initBookmarksService } from '@/services/bookmarks/bookmarks-service.js';

// Mock storage for test isolation
const mockStorage = {
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ items: [], cursor: undefined }),
} as any;

const mockConfig = {} as any;

describe('addBookmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initBookmarksService(mockConfig, mockStorage);
  });

  it('creates a bookmark and returns it', async () => {
    const ctx = createMockContext({ tenantId: 'test-tenant' });
    const input = addBookmark.input.parse({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
    });

    const result = await addBookmark.handler(input, ctx);

    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Example');
    expect(result.tags).toEqual(['test']);
    expect(result.id).toBeDefined();
  });

  it('rejects when tenantId is missing', async () => {
    const ctx = createMockContext(); // no tenantId — ctx.state.set will throw
    const input = addBookmark.input.parse({
      url: 'https://example.com',
      title: 'Example',
    });

    await expect(addBookmark.handler(input, ctx))
      .rejects.toThrow(McpError);
  });

  it('formats response as markdown', () => {
    const result = {
      id: 'abc-123',
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
      createdAt: '2026-03-09T00:00:00Z',
    };
    const blocks = addBookmark.format!(result);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toContain('Example');
    expect(blocks[0].text).toContain('abc-123');
  });
});
```

`createMockContext()` produces a `Context` with stubbed `log`, `state`, and `signal`. Pass `{ tenantId }` to enable state operations. Pass `{ sample }`, `{ elicit }`, or `{ progress: true }` to enable optional capabilities.

---

## Boot Lifecycle

What happens when `createApp()` runs:

```
1. Suppress ANSI colors for stdio/non-TTY
2. Parse config (name/version overrides -> env vars -> package.json defaults)
3. Construct core services:
   config -> storageProvider -> StorageService -> rateLimiter
   Conditional: supabase, llmProvider, speechService
4. Initialize logger (level, transport type)
5. Call setup(core) — server inits BookmarksService with core.storage
6. Construct registries from definition arrays
7. Construct TaskManager, server factory, TransportManager
8. Init OTEL (if enabled)
9. Register uncaughtException / unhandledRejection handlers
10. Start transport (stdio or HTTP)
11. Register SIGTERM / SIGINT -> graceful shutdown
12. Return ServerHandle { shutdown(), services }
```

Logger initialization moved to step 4 (before `setup()`) so that `setup()` can log safely.

### Request lifecycle

```
Client request arrives
  -> Transport deserializes
  -> Handler factory creates Context from RequestContext + SdkContext + services
  -> Handler factory calls definition.handler(parsedInput, ctx)
    -> Tool logic calls getBookmarksService() (lazy accessor — already initialized)
    -> Tool logic calls service.create(input, ctx)
      -> Service uses ctx.log for logging, ctx.state for storage
      -> Service returns result
    -> Tool logic returns result
  -> Handler factory runs format() (or JSON.stringify)
  -> Handler factory measures duration, logs, returns ContentBlock[]
```

Tool logic never catches errors. It throws `McpError`. The handler factory catches, normalizes, sets `isError: true`, and returns a well-formed error response.

---

## Development Workflow

### Day-to-day

```bash
# Dev mode (stdio) — auto-restart on changes
bun run dev:stdio

# Dev mode (HTTP) — browser/client testing
bun run dev:http

# After changes — lint, format, typecheck, security
bun run devcheck

# Run tests
bun run test
```

### Adding a new tool

1. Create `src/mcp-server/tools/my-tool.tool.ts`
2. Use `tool('my_tool', { ... })` with `input` schema (all fields `.describe()`d)
3. Implement `handler(input, ctx)` — pure, throws `McpError`, no try/catch
4. Add `auth` scopes if needed
5. Add `format` function if needed (optional — defaults to JSON)
6. Add to `allToolDefinitions` in `index.ts`
7. `bun run devcheck`
8. Smoke-test

### Worker deployment

```bash
# Build the worker bundle
bun run build:worker

# Local testing
wrangler dev --local

# Deploy
wrangler deploy
```

---

## CLAUDE.md

The server's `CLAUDE.md` is lightweight — domain-specific instructions only:

```markdown
# Agent Protocol — Bookmarks MCP Server

## Core Framework

Built on `@cyanheads/mcp-ts-core`. For infrastructure docs (exports, tool/resource
contracts, error handling, auth, transports, storage, utils):

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read once per session.

## Tools

| Tool | Purpose |
|:-----|:--------|
| `add_bookmark` | Save a URL with title and tags |
| `search_bookmarks` | Full-text search across bookmarks |
| `delete_bookmark` | Remove a bookmark by ID |

## Services

`BookmarksService` — initialized in `setup()`, accessed via `getBookmarksService()`.
Methods receive `Context` for logging and tenant-scoped storage.

## Config

Server-specific env vars (see `src/config/server-config.ts`):
- `BOOKMARKS_API_KEY` — external API key (optional)
- `BOOKMARKS_MAX_PER_USER` — per-tenant limit (default: 1000)
- `BOOKMARKS_DEFAULT_PAGE_SIZE` — pagination default (default: 20)
```

---

## Observations

Tensions and questions surfaced by walking through this workflow:

### 1. Service methods receive `Context` — is that right?

`BookmarksService.create(input, ctx)` receives the full `Context`. This means the service can log (`ctx.log`), access state (`ctx.state`), and theoretically elicit or sample. For logging and state, this is desirable. For elicitation/sampling, it's questionable — services shouldn't drive UI interactions.

Mitigation: convention, not enforcement. Document that `ctx.elicit` and `ctx.sample` should only be called from tool handlers, not from services. The types allow it; the docs prohibit it. Acceptable tradeoff for the simplicity of passing one object.

### 2. Service init ordering in `setup()`

If service A depends on service B, init order matters:

```ts
setup(core) {
  initServiceB(core.config);
  initServiceA(core.config, core.storage); // might need getServiceB()
},
```

Explicit (good), but if `initServiceA` calls `getServiceB()` during construction, it works because B is already initialized. If the order is swapped, the accessor throws. The error message makes the fix obvious, but it's a runtime failure, not a compile-time one. Acceptable tradeoff.

### 3. Test isolation for the init/accessor pattern

The `beforeEach` re-initialization pattern works. Vitest runs files in separate workers by default, so parallel test files are safe. Tests within the same file are sequential. If a test forgets to re-init after a failed init, subsequent tests see stale state. `beforeEach` handles this.

### 4. `ctx.state` vs direct `StorageService` usage

`ctx.state` is tenant-scoped sugar. But services like `BookmarksService` receive `StorageService` at init time (via `setup()`) and `Context` at call time. Should the service use `ctx.state` (implicit tenantId) or `this.storage` (explicit tenantId)?

Recommendation: use `ctx.state` in tool handlers and service methods that receive `ctx`. Use `StorageService` directly only for background operations outside a request context (scheduled tasks, migrations). This keeps tenant scoping automatic.

### 5. Core services access from prompts

Prompts receive only `args` — no `ctx`, no `CoreServices`. The `generate` function is `(args) => PromptMessage[]`. If a prompt needs to read data, it can't — prompts are pure message templates per the MCP spec. The client uses the prompt output as messages in a completion request, potentially calling tools to fetch actual data.

### 6. Logger initialization ordering

Logger is now initialized at step 4 (before `setup()`), so `setup()` can safely log. But `CoreServices.logger` is the raw Pino instance — `setup()` doesn't have a `Context` (it's not inside a request). Logging from `setup()` uses the global logger directly:

```ts
setup(core) {
  core.logger.info('Initializing bookmarks service...');
  initBookmarksService(core.config, core.storage);
},
```

This is the right separation: `ctx.log` for request-scoped logging, `core.logger` for lifecycle logging.

### 7. `createApp` returns before all tools register?

`createApp()` is async and returns a `ServerHandle`. The transport is started and tools are registered before it returns. But if `setup()` is async (e.g., connecting to a database), `createApp()` awaits it. This means tools might try to access uninitialized services if the server starts accepting requests before `setup()` completes. The lifecycle guarantees that `setup()` completes before transport starts — verify this is explicit in the implementation.

---

## Checklist

- [ ] This doc accurately reflects the API design from [12-developer-api.md](12-developer-api.md)
- [ ] All imports shown use the subpath exports from [02-public-api.md](02-public-api.md)
- [ ] Init/accessor pattern matches [03-config-container.md](03-config-container.md)
- [ ] Config lazy parsing matches Worker constraint from [03-config-container.md](03-config-container.md)
- [ ] Testing patterns match [06-testing.md](06-testing.md) and [12-developer-api.md](12-developer-api.md)
- [ ] Boot lifecycle logger init moved before `setup()` (noted in observation #6)
- [ ] Observations reviewed and addressed (or logged as open questions in [10-decisions.md](10-decisions.md))

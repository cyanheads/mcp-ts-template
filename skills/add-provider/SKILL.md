---
name: add-provider
description: >
  Add a new storage or service provider to the core package. Use when implementing a new backend for StorageService (e.g., a new database) or a new service provider (e.g., a new LLM backend).
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
---

## Context

Providers implement interfaces defined in core (e.g., `IStorageProvider`). 

They are selected at runtime via config (e.g., `STORAGE_PROVIDER_TYPE`).

Tier 3 providers lazy-load their dependencies to keep the core bundle small.

## Steps

1. **Identify the provider interface** — check the existing interface in the
   relevant types file (e.g., `src/storage/core/IStorageProvider.ts`)
2. **Create the provider file** in the appropriate directory
   (e.g., `src/storage/providers/{{provider-name}}/{{provider-name}}Provider.ts`)
3. **Implement the interface** — all methods must be implemented
4. **Lazy-load dependencies** if Tier 3:
   ```typescript
   let _client: SomeClient | undefined;
   async function getClient(): Promise<SomeClient> {
     if (!_client) {
       const { SomeClient } = await import('some-package');
       _client = new SomeClient(/* config */);
     }
     return _client;
   }
   ```
5. **Register the provider** in the factory/selector that maps config values
   to provider instances
6. **Update the serverless whitelist** if the provider is compatible with Workers
7. **Add the dependency** as an optional peer dependency in `package.json`
8. **Run `bun run devcheck`** to verify

## Checklist

- [ ] Provider file created with JSDoc header
- [ ] Interface fully implemented
- [ ] Tier 3 dependencies lazy-loaded (not top-level imports)
- [ ] Registered in provider factory/selector
- [ ] Serverless whitelist updated if Worker-compatible
- [ ] Optional peer dependency added to `package.json`
- [ ] `bun run devcheck` passes
- [ ] Integration tested with the target backend

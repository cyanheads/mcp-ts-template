---
name: add-provider
description: >
  Add a new storage or service provider to the core package. Use when implementing a new backend for StorageService (e.g., a new database) or a new service provider (e.g., a new LLM backend).
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
  type: reference
---

## Context

Providers implement interfaces defined in core. They are selected at runtime via config
(e.g., `STORAGE_PROVIDER_TYPE`). Tier 3 providers lazy-load their dependencies to keep the
core bundle small.

## Provider interfaces

| Domain  | Interface file                                    |
|:--------|:--------------------------------------------------|
| Storage | `src/storage/core/IStorageProvider.ts`            |
| LLM     | `src/services/llm/core/ILlmProvider.ts`           |
| Speech  | `src/services/speech/core/ISpeechProvider.ts`     |

Read the relevant interface fully before implementing — each has distinct required members.
`ISpeechProvider` in particular requires `readonly name`, `readonly supportsTTS`,
`readonly supportsSTT`, and `healthCheck()` in addition to the capability methods;
these flags drive routing in `SpeechService`.

## File conventions

Provider file location and naming differ by domain:

- **Storage** — nested subdirectory, PascalCase file:
  `src/storage/providers/{{provider-name}}/{{provider-name}}Provider.ts`
  (e.g., `src/storage/providers/inMemory/inMemoryProvider.ts`)

- **LLM / Speech** — flat directory, kebab-case with `.provider.ts` suffix:
  `src/services/llm/providers/{{provider-name}}.provider.ts`
  `src/services/speech/providers/{{provider-name}}.provider.ts`
  (e.g., `src/services/llm/providers/openrouter.provider.ts`,
  `src/services/speech/providers/elevenlabs.provider.ts`)

## Steps

1. **Identify the provider interface** — read the interface file for the target domain
   (see table above).
2. **Create the provider file** following the file convention for its domain (see above).
3. **Implement the interface** — all methods must be implemented.
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
5. **Register the provider** — the registration point differs by domain:

   - **Storage** — add a `case` to the `switch` in `src/storage/core/storageFactory.ts`
     inside `createStorageProvider()`. Import the new provider class at the top of that file.

   - **Speech** — two changes required:
     1. Add the new provider string literal to the `provider` union in
        `SpeechProviderConfig` (`src/services/speech/types.ts`, field `provider`).
     2. Add a `case` to the `switch` in `createSpeechProvider()`
        (`src/services/speech/core/SpeechService.ts`). Import the new provider class at
        the top of that file.

   - **LLM** — currently only one provider exists (`OpenRouterProvider`); it is
     instantiated directly in `src/core/app.ts` rather than through a factory switch.
     Add a factory function or extend `app.ts` as needed, then update `ILlmProvider`
     consumers accordingly.

6. **Update the Worker-compatible provider list** if the new storage provider runs in
   Cloudflare Workers. The list is an inline array in `storageFactory.ts` at the
   `isServerless()` guard:
   ```typescript
   // src/storage/core/storageFactory.ts ~line 112
   !['in-memory', 'cloudflare-r2', 'cloudflare-kv', 'cloudflare-d1'].includes(providerType)
   ```
   Add the new provider string to this array. Non-storage providers have no equivalent
   gate.

7. **Add the dependency** as an optional peer dependency in `package.json` if Tier 3.
8. **Run `bun run devcheck`** to verify.

## Checklist

- [ ] Provider file created with JSDoc `@fileoverview` + `@module` header
- [ ] Interface fully implemented (including `name`, `supportsTTS`/`supportsSTT` for speech)
- [ ] Tier 3 dependencies lazy-loaded (not top-level imports)
- [ ] Registered in the correct factory for the domain (see Step 5)
- [ ] Speech: `provider` literal added to `SpeechProviderConfig` union in `types.ts`
- [ ] Storage: Worker-compatible array in `storageFactory.ts` updated if applicable
- [ ] Optional peer dependency added to `package.json` if Tier 3
- [ ] `bun run devcheck` passes
- [ ] Integration tested with the target backend

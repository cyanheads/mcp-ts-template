# mcp-ts-template - Directory Structure

Generated on: 2026-02-28 06:00:00

```
mcp-ts-template/
├── .github/
│   └── FUNDING.yml
├── .husky/
│   └── pre-commit
├── .storage/
├── .vscode/
│   └── settings.json
├── changelog/
│   ├── archive1.md
│   └── archive2.md
├── docs/
│   ├── mcp-specification/
│   │   └── 2025-06-18/
│   │       ├── best-practices/
│   │       │   └── security.md
│   │       ├── core/
│   │       │   ├── authorization.md
│   │       │   ├── lifecycle.md
│   │       │   ├── overview.md
│   │       │   └── transports.md
│   │       └── utils/
│   │           ├── cancellation.md
│   │           ├── completion.md
│   │           ├── logging.md
│   │           ├── pagination.md
│   │           ├── ping.md
│   │           └── progress.md
│   ├── mcp-apps.md
│   ├── mcp-elicitation-summary.md
│   ├── mcp-sdk-changes.md
│   └── publishing-mcp-server-registry.md
├── schemas/
│   └── cloudflare-d1-schema.sql
├── scripts/
│   ├── clean.ts
│   ├── devcheck.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   ├── tree.ts
│   └── update-coverage.ts
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── container/
│   │   ├── core/
│   │   │   ├── container.ts
│   │   │   └── tokens.ts
│   │   ├── registrations/
│   │   │   ├── core.ts
│   │   │   └── mcp.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── mcp-server/
│   │   ├── prompts/
│   │   │   ├── definitions/
│   │   │   │   ├── code-review.prompt.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── promptDefinition.ts
│   │   │   └── prompt-registration.ts
│   │   ├── resources/
│   │   │   ├── definitions/
│   │   │   │   ├── data-explorer-ui.app-resource.ts
│   │   │   │   ├── echo.resource.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── resourceDefinition.ts
│   │   │   │   └── resourceHandlerFactory.ts
│   │   │   └── resource-registration.ts
│   │   ├── roots/
│   │   │   └── roots-registration.ts
│   │   ├── tasks/
│   │   │   ├── core/
│   │   │   │   ├── storageBackedTaskStore.ts
│   │   │   │   ├── taskManager.ts
│   │   │   │   └── taskTypes.ts
│   │   │   ├── utils/
│   │   │   │   └── taskToolDefinition.ts
│   │   │   └── index.ts
│   │   ├── tools/
│   │   │   ├── definitions/
│   │   │   │   ├── index.ts
│   │   │   │   ├── template-async-countdown.task-tool.ts
│   │   │   │   ├── template-cat-fact.tool.ts
│   │   │   │   ├── template-code-review-sampling.tool.ts
│   │   │   │   ├── template-data-explorer.app-tool.ts
│   │   │   │   ├── template-echo-message.tool.ts
│   │   │   │   ├── template-image-test.tool.ts
│   │   │   │   └── template-madlibs-elicitation.tool.ts
│   │   │   ├── utils/
│   │   │   │   ├── index.ts
│   │   │   │   ├── toolDefinition.ts
│   │   │   │   └── toolHandlerFactory.ts
│   │   │   └── tool-registration.ts
│   │   ├── transports/
│   │   │   ├── auth/
│   │   │   │   ├── lib/
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   ├── authUtils.ts
│   │   │   │   │   └── withAuth.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── http/
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── sessionIdUtils.ts
│   │   │   │   └── sessionStore.ts
│   │   │   ├── stdio/
│   │   │   │   ├── index.ts
│   │   │   │   └── stdioTransport.ts
│   │   │   ├── ITransport.ts
│   │   │   └── manager.ts
│   │   ├── README.md
│   │   └── server.ts
│   ├── services/
│   │   ├── graph/
│   │   │   ├── core/
│   │   │   │   ├── GraphService.ts
│   │   │   │   └── IGraphProvider.ts
│   │   │   ├── providers/
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── llm/
│   │   │   ├── core/
│   │   │   │   └── ILlmProvider.ts
│   │   │   ├── providers/
│   │   │   │   └── openrouter.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── speech/
│   │   │   ├── core/
│   │   │   │   ├── ISpeechProvider.ts
│   │   │   │   └── SpeechService.ts
│   │   │   ├── providers/
│   │   │   │   ├── elevenlabs.provider.ts
│   │   │   │   └── whisper.provider.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── README.md
│   ├── storage/
│   │   ├── core/
│   │   │   ├── IStorageProvider.ts
│   │   │   ├── storageFactory.ts
│   │   │   ├── StorageService.ts
│   │   │   └── storageValidation.ts
│   │   ├── providers/
│   │   │   ├── cloudflare/
│   │   │   │   ├── d1Provider.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── kvProvider.ts
│   │   │   │   └── r2Provider.ts
│   │   │   ├── fileSystem/
│   │   │   │   └── fileSystemProvider.ts
│   │   │   ├── inMemory/
│   │   │   │   └── inMemoryProvider.ts
│   │   │   └── supabase/
│   │   │       ├── supabase.types.ts
│   │   │       └── supabaseProvider.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── types-global/
│   │   └── errors.ts
│   ├── utils/
│   │   ├── formatting/
│   │   │   ├── diffFormatter.ts
│   │   │   ├── index.ts
│   │   │   ├── markdownBuilder.ts
│   │   │   ├── tableFormatter.ts
│   │   │   └── treeFormatter.ts
│   │   ├── internal/
│   │   │   ├── error-handler/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── mappings.ts
│   │   │   │   └── types.ts
│   │   │   ├── encoding.ts
│   │   │   ├── health.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   ├── requestContext.ts
│   │   │   ├── runtime.ts
│   │   │   └── startupBanner.ts
│   │   ├── metrics/
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network/
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── pagination/
│   │   │   └── index.ts
│   │   ├── parsing/
│   │   │   ├── csvParser.ts
│   │   │   ├── dateParser.ts
│   │   │   ├── frontmatterParser.ts
│   │   │   ├── index.ts
│   │   │   ├── jsonParser.ts
│   │   │   ├── pdfParser.ts
│   │   │   ├── xmlParser.ts
│   │   │   └── yamlParser.ts
│   │   ├── scheduling/
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security/
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry/
│   │   │   ├── index.ts
│   │   │   ├── instrumentation.ts
│   │   │   ├── metrics.ts
│   │   │   ├── semconv.ts
│   │   │   └── trace.ts
│   │   ├── types/
│   │   │   ├── guards.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── index.ts
│   └── worker.ts
├── tests/
│   ├── config/
│   │   ├── index.int.test.ts
│   │   └── index.test.ts
│   ├── conformance/
│   │   ├── helpers/
│   │   │   ├── assertions.ts
│   │   │   └── server-harness.ts
│   │   ├── lifecycle.test.ts
│   │   ├── prompts.test.ts
│   │   ├── protocol-init.test.ts
│   │   ├── resources.test.ts
│   │   └── tools.test.ts
│   ├── container/
│   │   ├── registrations/
│   │   │   ├── core.test.ts
│   │   │   └── mcp.test.ts
│   │   ├── container.test.ts
│   │   ├── index.test.ts
│   │   └── tokens.test.ts
│   ├── fixtures/
│   │   └── index.ts
│   ├── mcp-server/
│   │   ├── prompts/
│   │   │   ├── definitions/
│   │   │   │   └── code-review.prompt.test.ts
│   │   │   ├── utils/
│   │   │   │   └── promptDefinition.test.ts
│   │   │   └── prompt-registration.test.ts
│   │   ├── resources/
│   │   │   ├── definitions/
│   │   │   │   ├── data-explorer-ui.app-resource.test.ts
│   │   │   │   ├── echo.resource.test.ts
│   │   │   │   └── index.test.ts
│   │   │   ├── schemas/
│   │   │   │   ├── __snapshots__/
│   │   │   │   │   └── schema-snapshots.test.ts.snap
│   │   │   │   ├── json-schema-compatibility.test.ts
│   │   │   │   └── schema-snapshots.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── resourceDefinition.test.ts
│   │   │   │   └── resourceHandlerFactory.test.ts
│   │   │   └── resource-registration.test.ts
│   │   ├── roots/
│   │   │   └── roots-registration.test.ts
│   │   ├── tasks/
│   │   │   ├── core/
│   │   │   │   ├── storageBackedTaskStore.test.ts
│   │   │   │   └── taskManager.test.ts
│   │   │   └── utils/
│   │   │       └── taskToolDefinition.test.ts
│   │   ├── tools/
│   │   │   ├── definitions/
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── template-async-countdown.task-tool.test.ts
│   │   │   │   ├── template-cat-fact.tool.test.ts
│   │   │   │   ├── template-code-review-sampling.tool.test.ts
│   │   │   │   ├── template-data-explorer.app-tool.test.ts
│   │   │   │   ├── template-echo-message.tool.test.ts
│   │   │   │   ├── template-image-test.tool.test.ts
│   │   │   │   └── template-madlibs-elicitation.tool.test.ts
│   │   │   ├── fuzz/
│   │   │   │   └── tool-input-fuzz.test.ts
│   │   │   ├── schemas/
│   │   │   │   ├── __snapshots__/
│   │   │   │   │   └── schema-snapshots.test.ts.snap
│   │   │   │   ├── json-schema-compatibility.test.ts
│   │   │   │   ├── schema-snapshots.test.ts
│   │   │   │   └── zod4-compatibility.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── toolDefinition.test.ts
│   │   │   │   └── toolHandlerFactory.test.ts
│   │   │   └── tool-registration.test.ts
│   │   ├── transports/
│   │   │   ├── auth/
│   │   │   │   ├── lib/
│   │   │   │   │   ├── authContext.test.ts
│   │   │   │   │   ├── authTypes.test.ts
│   │   │   │   │   ├── authUtils.test.ts
│   │   │   │   │   └── withAuth.test.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── authStrategy.test.ts
│   │   │   │   │   ├── jwtStrategy.test.ts
│   │   │   │   │   └── oauthStrategy.test.ts
│   │   │   │   ├── authFactory.test.ts
│   │   │   │   ├── authMiddleware.test.ts
│   │   │   │   └── index.test.ts
│   │   │   ├── http/
│   │   │   │   ├── httpErrorHandler.test.ts
│   │   │   │   ├── httpTransport.integration.test.ts
│   │   │   │   ├── httpTransport.test.ts
│   │   │   │   ├── httpTypes.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── sessionIdUtils.test.ts
│   │   │   │   └── sessionStore.test.ts
│   │   │   ├── stdio/
│   │   │   │   ├── index.test.ts
│   │   │   │   └── stdioTransport.test.ts
│   │   │   ├── ITransport.test.ts
│   │   │   └── manager.test.ts
│   │   └── server.test.ts
│   ├── mocks/
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── scripts/
│   │   └── devdocs.test.ts
│   ├── services/
│   │   ├── graph/
│   │   │   ├── core/
│   │   │   │   ├── GraphService.test.ts
│   │   │   │   └── IGraphProvider.test.ts
│   │   │   ├── index.test.ts
│   │   │   └── types.test.ts
│   │   ├── llm/
│   │   │   ├── core/
│   │   │   │   └── ILlmProvider.test.ts
│   │   │   ├── providers/
│   │   │   │   ├── openrouter.provider.test.ts
│   │   │   │   └── openrouter.provider.test.ts.disabled
│   │   │   ├── index.test.ts
│   │   │   └── types.test.ts
│   │   └── speech/
│   │       ├── core/
│   │       │   ├── ISpeechProvider.test.ts
│   │       │   └── SpeechService.test.ts
│   │       ├── providers/
│   │       │   ├── elevenlabs.provider.test.ts
│   │       │   └── whisper.provider.test.ts
│   │       ├── index.test.ts
│   │       └── types.test.ts
│   ├── storage/
│   │   ├── core/
│   │   │   ├── IStorageProvider.test.ts
│   │   │   ├── storageFactory.test.ts
│   │   │   └── storageValidation.test.ts
│   │   ├── providers/
│   │   │   ├── cloudflare/
│   │   │   │   ├── d1Provider.test.ts
│   │   │   │   ├── kvProvider.test.ts
│   │   │   │   └── r2Provider.test.ts
│   │   │   ├── fileSystem/
│   │   │   │   └── fileSystemProvider.test.ts
│   │   │   ├── inMemory/
│   │   │   │   └── inMemoryProvider.test.ts
│   │   │   └── supabase/
│   │   │       ├── supabase.types.test.ts
│   │   │       └── supabaseProvider.test.ts
│   │   ├── index.test.ts
│   │   ├── storageProviderCompliance.test.ts
│   │   └── StorageService.test.ts
│   ├── types-global/
│   │   └── errors.test.ts
│   ├── utils/
│   │   ├── formatting/
│   │   │   ├── diffFormatter.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── markdownBuilder.test.ts
│   │   │   ├── tableFormatter.test.ts
│   │   │   └── treeFormatter.test.ts
│   │   ├── internal/
│   │   │   ├── error-handler/
│   │   │   │   ├── errorHandler.test.ts
│   │   │   │   ├── helpers.test.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── mappings.test.ts
│   │   │   │   └── types.test.ts
│   │   │   ├── encoding.test.ts
│   │   │   ├── errorHandler.int.test.ts
│   │   │   ├── errorHandler.unit.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── logger.int.test.ts
│   │   │   ├── logger.test.ts
│   │   │   ├── performance.init.test.ts
│   │   │   ├── performance.test.ts
│   │   │   ├── requestContext.test.ts
│   │   │   ├── runtime.test.ts
│   │   │   └── startupBanner.test.ts
│   │   ├── metrics/
│   │   │   ├── index.test.ts
│   │   │   ├── registry.test.ts
│   │   │   └── tokenCounter.test.ts
│   │   ├── network/
│   │   │   ├── fetchWithTimeout.test.ts
│   │   │   └── index.test.ts
│   │   ├── pagination/
│   │   │   └── index.test.ts
│   │   ├── parsing/
│   │   │   ├── csvParser.test.ts
│   │   │   ├── dateParser.test.ts
│   │   │   ├── frontmatterParser.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── jsonParser.test.ts
│   │   │   ├── pdfParser.test.ts
│   │   │   ├── xmlParser.test.ts
│   │   │   └── yamlParser.test.ts
│   │   ├── scheduling/
│   │   │   ├── index.test.ts
│   │   │   └── scheduler.test.ts
│   │   ├── security/
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── index.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   ├── sanitization.property.test.ts
│   │   │   └── sanitization.test.ts
│   │   ├── telemetry/
│   │   │   ├── index.test.ts
│   │   │   ├── instrumentation.test.ts
│   │   │   ├── metrics.test.ts
│   │   │   ├── semconv.test.ts
│   │   │   └── trace.test.ts
│   │   ├── types/
│   │   │   └── guards.test.ts
│   │   └── index.test.ts
│   ├── index.test.ts
│   ├── setup.ts
│   └── worker.test.ts
├── .dockerignore
├── .env.example
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── biome.json
├── bun.lock
├── bunfig.toml
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── LICENSE
├── package.json
├── README.md
├── repomix.config.json
├── server.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.scripts.json
├── tsconfig.test.json
├── tsdoc.json
├── typedoc.json
├── vitest.config.ts
├── vitest.conformance.ts
└── wrangler.toml
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

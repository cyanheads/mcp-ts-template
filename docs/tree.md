# mcp-ts-template - Directory Structure

Generated on: 2025-09-23 21:18:30

```
mcp-ts-template
├── .clinerules
│   └── clinerules.md
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .husky
│   └── pre-commit
├── .storage
├── .vscode
│   └── settings.json
├── changelog
│   └── archive1.md
├── docs
│   ├── publishing-mcp-server-registry.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── devcheck.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   ├── tree.ts
│   └── validate-mcp-publish-schema.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── container
│   │   ├── registrations
│   │   │   ├── core.ts
│   │   │   └── mcp.ts
│   │   ├── index.ts
│   │   └── tokens.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   ├── definitions
│   │   │   │   ├── echo.resource.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils
│   │   │   │   ├── resourceDefinition.ts
│   │   │   │   └── resourceHandlerFactory.ts
│   │   │   └── resource-registration.ts
│   │   ├── tools
│   │   │   ├── definitions
│   │   │   │   ├── index.ts
│   │   │   │   ├── template-cat-fact.tool.ts
│   │   │   │   ├── template-echo-message.tool.ts
│   │   │   │   └── template-image-test.tool.ts
│   │   │   ├── utils
│   │   │   │   ├── toolDefinition.ts
│   │   │   │   └── toolHandlerFactory.ts
│   │   │   └── tool-registration.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   ├── authUtils.ts
│   │   │   │   │   └── withAuth.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   └── index.ts
│   │   │   └── stdio
│   │   │       ├── index.ts
│   │   │       └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   └── llm-providers
│   │       ├── ILlmProvider.ts
│   │       └── openRouterProvider.ts
│   ├── storage
│   │   ├── core
│   │   │   ├── IStorageProvider.ts
│   │   │   ├── storageFactory.ts
│   │   │   └── StorageService.ts
│   │   ├── providers
│   │   │   ├── fileSystem
│   │   │   │   └── fileSystemProvider.ts
│   │   │   ├── inMemory
│   │   │   │   └── inMemoryProvider.ts
│   │   │   └── supabase
│   │   │       ├── supabase.types.ts
│   │   │       └── supabaseProvider.ts
│   │   └── index.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── encoding.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── health.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   ├── requestContext.ts
│   │   │   └── runtime.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   └── jsonParser.ts
│   │   ├── scheduling
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry
│   │   │   ├── index.ts
│   │   │   ├── instrumentation.ts
│   │   │   ├── semconv.ts
│   │   │   └── trace.ts
│   │   └── index.ts
│   └── index.ts
├── tests
│   ├── integration
│   │   ├── config
│   │   │   └── config.test.ts
│   │   ├── mcp-server
│   │   │   └── tools
│   │   ├── utils
│   │   │   └── internal
│   │   │       ├── errorHandler.test.ts
│   │   │       └── logger.test.ts
│   │   └── setup.integration.ts
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── storage
│   │   ├── providers
│   │   │   └── inMemory
│   │   │       └── inMemoryProvider.test.ts
│   │   └── storageProviderCompliance.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.unit.test.ts
│   │   │   ├── health.test.ts
│   │   │   ├── performance.test.ts
│   │   │   └── requestContext.test.ts
│   │   ├── metrics
│   │   │   ├── registry.test.ts
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   └── fetchWithTimeout.test.ts
│   │   ├── parsing
│   │   │   ├── dateParser.test.ts
│   │   │   └── jsonParser.test.ts
│   │   ├── scheduling
│   │   │   └── scheduler.test.ts
│   │   └── security
│   │       ├── idGenerator.test.ts
│   │       ├── rateLimiter.test.ts
│   │       └── sanitization.test.ts
│   └── setup.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── bun.lock
├── bunfig.toml
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package.json
├── README.md
├── repomix.config.json
├── server.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.test.json
├── tsdoc.json
└── typedoc.json
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

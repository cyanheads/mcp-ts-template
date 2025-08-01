# mcp-ts-template - Directory Structure

Generated on: 2025-08-01 14:55:24

```
mcp-ts-template
├── .clinerules
│   └── clinerules.md
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .vscode
│   └── settings.json
├── coverage
├── docs
│   ├── api-references
│   │   ├── duckDB.md
│   │   ├── jsdoc-standard-tags.md
│   │   └── typedoc-reference.md
│   ├── best-practices.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   ├── README.md
│   └── tree.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── mcp-server
│   │   ├── core
│   │   │   └── managedMcpServer.ts
│   │   ├── resources
│   │   │   └── echoResource
│   │   │       ├── index.ts
│   │   │       ├── logic.ts
│   │   │       └── registration.ts
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── echoTool
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   └── imageTest
│   │   │       ├── index.ts
│   │   │       ├── logic.ts
│   │   │       └── registration.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   └── authUtils.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── core
│   │   │   │   ├── baseTransportManager.ts
│   │   │   │   ├── headerUtils.ts
│   │   │   │   ├── honoNodeBridge.ts
│   │   │   │   ├── statefulTransportManager.ts
│   │   │   │   ├── statelessTransportManager.ts
│   │   │   │   └── transportTypes.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── mcpTransportMiddleware.ts
│   │   │   └── stdio
│   │   │       ├── index.ts
│   │   │       └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.ts
│   │   │   ├── duckDBQueryExecutor.ts
│   │   │   ├── duckDBService.ts
│   │   │   └── types.ts
│   │   ├── llm-providers
│   │   │   └── openRouterProvider.ts
│   │   └── supabase
│   │       └── supabaseClient.ts
│   ├── storage
│   │   └── duckdbExample.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   └── requestContext.ts
│   │   ├── metrics
│   │   │   ├── index.ts
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
│   │   │   ├── instrumentation.ts
│   │   │   └── semconv.ts
│   │   └── index.ts
│   ├── index.ts
│   └── README.md
├── tests
│   ├── mcp-server
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   ├── echoTool
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   └── imageTest
│   │   │       └── registration.test.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   └── authUtils.test.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── jwtStrategy.test.ts
│   │   │   │   │   └── oauthStrategy.test.ts
│   │   │   │   └── auth.test.ts
│   │   │   └── stdio
│   │   │       └── stdioTransport.test.ts
│   │   └── server.test.ts
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.test.ts
│   │   │   ├── duckDBQueryExecutor.test.ts
│   │   │   └── duckDBService.test.ts
│   │   ├── llm-providers
│   │   │   └── openRouterProvider.test.ts
│   │   └── supabase
│   │       └── supabaseClient.test.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.test.ts
│   │   │   ├── logger.test.ts
│   │   │   └── requestContext.test.ts
│   │   ├── metrics
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   └── fetchWithTimeout.test.ts
│   │   ├── parsing
│   │   │   ├── dateParser.test.ts
│   │   │   └── jsonParser.test.ts
│   │   ├── scheduling
│   │   │   └── scheduler.test.ts
│   │   ├── security
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   └── sanitization.test.ts
│   │   └── telemetry
│   │       └── instrumentation.test.ts
│   └── setup.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .ncurc.json
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.typedoc.json
├── tsconfig.vitest.json
├── tsdoc.json
├── typedoc.json
└── vitest.config.ts
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

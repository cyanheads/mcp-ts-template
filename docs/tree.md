# mcp-ts-template - Directory Structure

Generated on: 2025-05-31 13:36:29

```
mcp-ts-template
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── docs
│   ├── api
│   ├── api-references
│   │   ├── duckDB.md
│   │   ├── jsdoc-standard-tags.md
│   │   └── typedoc-reference.md
│   └── tree.md
├── duckdata
├── scripts
│   ├── clean.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   └── tree.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── mcp-client
│   │   ├── client-config
│   │   │   ├── configLoader.ts
│   │   │   └── mcp-config.json.example
│   │   ├── core
│   │   │   ├── clientCache.ts
│   │   │   ├── clientConnectionLogic.ts
│   │   │   └── clientManager.ts
│   │   ├── transports
│   │   │   ├── httpClientTransport.ts
│   │   │   ├── index.ts
│   │   │   ├── stdioClientTransport.ts
│   │   │   └── transportFactory.ts
│   │   └── index.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   └── echoResource
│   │   │       ├── echoResourceLogic.ts
│   │   │       ├── index.ts
│   │   │       └── registration.ts
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── catFactFetcherLogic.ts
│   │   │   │   ├── catFactFetcherRegistration.ts
│   │   │   │   └── index.ts
│   │   │   ├── echoTool
│   │   │   │   ├── echoToolLogic.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── registration.ts
│   │   │   └── imageTest
│   │   │       ├── index.ts
│   │   │       ├── logic.ts
│   │   │       └── registration.ts
│   │   ├── transports
│   │   │   ├── authentication
│   │   │   │   └── authMiddleware.ts
│   │   │   ├── httpTransport.ts
│   │   │   └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.ts
│   │   │   ├── duckDBQueryExecutor.ts
│   │   │   ├── duckDBService.ts
│   │   │   └── types.ts
│   │   ├── llm-providers
│   │   │   ├── openRouter
│   │   │   │   ├── index.ts
│   │   │   │   └── openRouterProvider.ts
│   │   │   ├── index.ts
│   │   │   └── llmFactory.ts
│   │   └── index.ts
│   ├── storage
│   │   └── duckdbExample.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
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
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   └── index.ts
│   └── index.ts
├── .clinerules
├── .dockerignore
├── .gitignore
├── .ncurc.json
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── LICENSE
├── mcp.json
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.typedoc.json
├── tsdoc.json
└── typedoc.json
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

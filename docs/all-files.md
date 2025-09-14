---
File: .ncurc.json
---

```json
{
  "reject": [
    "chrono-node",
    "dotenv",
    "zod",
    "@hono/node-server",
    "hono",
    "@faker-js/faker",
    "typescript"
  ]
}

```

---
File: .prettierrc.json
---

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "overrides": [
    {
      "files": "*.ts",
      "options": {
        "parser": "typescript"
      }
    }
  ]
}

```

---
File: eslint.config.js
---

```json
import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Merge browser + node globals and normalize keys
const combinedGlobals = { ...globals.browser, ...globals.node };
const trimmedGlobals = Object.fromEntries(
  Object.entries(combinedGlobals).map(([key, value]) => [key.trim(), value]),
);

// Paths used by type-aware linting
const tsProjectFiles = [
  './tsconfig.json',
  './tsconfig.vitest.json',
  './tsconfig.typedoc.json',
];

export default [
  // Ignore common build/test artifacts
  {
    ignores: [
      'coverage/',
      'tests/',
      'dist/',
      'build/',
      'node_modules/',
      '**/.wrangler/',
    ],
  },

  // JavaScript files: apply JS recommended rules and globals
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      ...(pluginJs.configs.recommended.languageOptions ?? {}),
      globals: trimmedGlobals,
    },
  },

  // TypeScript files: enable type-aware linting with proper parserOptions
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: tsProjectFiles,
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        sourceType: 'module',
      },
      globals: trimmedGlobals,
    },
  },
  // Apply TypeScript recommended type-checked configs only to TS files
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    files: ['**/*.{ts,tsx}'],
    ...cfg,
  })),

  // Repo-specific TypeScript rule tweaks
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

```

---
File: package.json
---

```json
{
  "name": "mcp-ts-template",
  "version": "2.0.0",
  "description": "A production-grade TypeScript template for building robust Model Context Protocol (MCP) servers, featuring built-in observability with OpenTelemetry, advanced error handling, comprehensive utilities, and a modular architecture.",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "bin": {
    "mcp-ts-template": "dist/index.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./*": "./dist/*"
  },
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cyanheads/mcp-ts-template.git"
  },
  "bugs": {
    "url": "https://github.com/cyanheads/mcp-ts-template/issues"
  },
  "homepage": "https://github.com/cyanheads/mcp-ts-template#readme",
  "scripts": {
    "build": "tsc -b",
    "start": "bun dist/index.js",
    "start:stdio": "MCP_LOG_LEVEL=debug MCP_TRANSPORT_TYPE=stdio bun dist/index.js",
    "start:http": "MCP_LOG_LEVEL=debug MCP_TRANSPORT_TYPE=http bun dist/index.js",
    "start:agent": "MCP_LOG_LEVEL=debug bun dist/agent/cli/boot.js",
    "dev": "tsx --watch src/index.ts",
    "dev:stdio": "MCP_LOG_LEVEL=debug MCP_TRANSPORT_TYPE=stdio tsx --watch src/index.ts",
    "dev:http": "MCP_LOG_LEVEL=debug MCP_TRANSPORT_TYPE=http tsx --watch src/index.ts",
    "dev:agent": "MCP_LOG_LEVEL=debug tsx --watch src/agent/cli/boot.ts",
    "devdocs": "tsx scripts/devdocs.ts",
    "devcheck": "tsx scripts/devcheck.ts",
    "rebuild": "tsx scripts/clean.ts && bun run build",
    "docs:generate": "typedoc",
    "depcheck": "bunx depcheck",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "tree": "bun run scripts/tree.ts",
    "fetch-spec": "bun run scripts/fetch-openapi-spec.ts",
    "format": "bun run prettier --write \"**/*.{ts,js,json,md,html,css}\"",
    "prepare": "husky",
    "inspector": "bunx mcp-inspector --config mcp.json --server mcp-ts-template",
    "db:duckdb-example": "MCP_LOG_LEVEL=debug tsc && node dist/storage/duckdbExample.js",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test --config vitest.unit.config.ts --coverage",
    "test:integration": "INTEGRATION=1 bun test --config vitest.integration.config.ts --coverage",
    "audit": "bun audit",
    "audit:fix": "bun audit --fix"
  },
  "dependencies": {
    "@hono/node-server": "^1.19.2",
    "@modelcontextprotocol/sdk": "^1.18.0",
    "@opentelemetry/instrumentation-winston": "^0.50.0",
    "@supabase/supabase-js": "^2.57.4",
    "axios": "^1.12.1",
    "chrono-node": "^2.8.4",
    "dotenv": "^16.6.1",
    "hono": "^4.9.7",
    "ignore": "^7.0.5",
    "jose": "^6.1.0",
    "js-yaml": "^4.1.0",
    "node-cron": "^4.2.1",
    "openai": "^5.20.2",
    "partial-json": "^0.1.7",
    "reflect-metadata": "^0.2.2",
    "sanitize-html": "^2.17.0",
    "tsyringe": "^4.10.0",
    "validator": "13.15.15",
    "winston": "^3.17.0",
    "winston-transport": "^4.9.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@eslint/js": "^9.35.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/auto-instrumentations-node": "^0.64.1",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.205.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.205.0",
    "@opentelemetry/resources": "^2.1.0",
    "@opentelemetry/sdk-metrics": "^2.1.0",
    "@opentelemetry/sdk-node": "^0.205.0",
    "@opentelemetry/sdk-trace-node": "^2.1.0",
    "@opentelemetry/semantic-conventions": "^1.37.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.3.3",
    "@types/node-cron": "^3.0.11",
    "@types/sanitize-html": "^2.16.0",
    "@types/validator": "13.15.3",
    "@vitest/coverage-v8": "3.2.4",
    "depcheck": "^1.4.7",
    "eslint": "^9.35.0",
    "eslint-import-resolver-typescript": "^4.4.4",
    "glob": "^11.0.3",
    "globals": "^16.4.0",
    "husky": "^9.1.7",
    "msw": "^2.11.2",
    "prettier": "^3.6.2",
    "tsx": "^4.20.5",
    "typedoc": "^0.28.12",
    "typescript": "^5.9.2",
    "typescript-eslint": "^8.43.0",
    "vite": "^7.1.5",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^3.2.4"
  },
  "keywords": [
    "typescript",
    "template",
    "mcp",
    "model-context-protocol",
    "agent",
    "autonomous-agent",
    "agent-framework",
    "architecture",
    "error-handling",
    "llm",
    "ai-integration",
    "mcp-server",
    "mcp-client",
    "hono",
    "stdio",
    "http",
    "authentication",
    "oauth",
    "jwt",
    "openrouter",
    "duckdb",
    "zod",
    "opentelemetry",
    "observability",
    "tracing",
    "metrics"
  ],
  "author": "cyanheads <casey@caseyjhand.com> (https://github.com/cyanheads/mcp-ts-template#readme)",
  "license": "Apache-2.0",
  "funding": [
    {
      "type": "github",
      "url": "https://github.com/sponsors/cyanheads"
    },
    {
      "type": "buy_me_a_coffee",
      "url": "https://www.buymeacoffee.com/cyanheads"
    }
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "depcheck": {
    "ignores": [
      "mcp-ts-template"
    ]
  }
}

```

---
File: tsconfig.json
---

```json
{
  "compilerOptions": {
    // Target modern JavaScript
    "target": "ES2022",

    // Use modern Node.js module system
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // Enable all strict type checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module interop for CommonJS compatibility
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    // Output configuration
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Import helpers to reduce bundle size
    "importHelpers": true,

    // Skip type checking of declaration files
    "skipLibCheck": true,

    // Ensure consistent file naming
    "forceConsistentCasingInFileNames": true,

    // Enable experimental decorators if needed
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    // Node.js specific
    "lib": ["ES2022"],
    "types": ["node", "reflect-metadata"],

    // Error on unused locals and parameters
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // Ensure void returns are handled
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Modern resolution features
    "resolveJsonModule": true,
    "allowJs": false,
    "baseUrl": ".",
    "paths": {
      "mcp-ts-template/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}

```

---
File: tsdoc.json
---

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "tagDefinitions": [
    {
      "tagName": "@fileoverview",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@module",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@type",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@typedef",
      "syntaxKind": "block"
    },
    {
      "tagName": "@function",
      "syntaxKind": "block"
    },
    {
      "tagName": "@template",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@property",
      "syntaxKind": "block"
    },
    {
      "tagName": "@class",
      "syntaxKind": "block"
    },
    {
      "tagName": "@static",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@private",
      "syntaxKind": "modifier"
    },
    {
      "tagName": "@constant",
      "syntaxKind": "block"
    }
  ]
}

```

---
File: typedoc.json
---

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src", "scripts"],
  "entryPointStrategy": "expand",
  "out": "docs/api",
  "readme": "README.md",
  "name": "mcp-ts-template API Documentation",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "theme": "default"
}

```


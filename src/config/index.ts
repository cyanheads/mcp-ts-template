/**
 * @fileoverview Loads, validates, and exports application configuration.
 * This module centralizes configuration management, sourcing values from
 * environment variables and `package.json`. It uses Zod for schema validation
 * to ensure type safety and correctness of configuration parameters.
 *
 * @module src/config/index
 */
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

dotenv.config();

// --- Determine Project Root ---
const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  if (path.basename(currentDir) === 'dist') {
    currentDir = path.dirname(currentDir);
  }
  while (true) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        `Could not find project root (package.json) starting from ${startDir}`,
      );
    }
    currentDir = parentDir;
  }
};

let projectRoot: string;
try {
  const currentModuleDir = dirname(fileURLToPath(import.meta.url));
  projectRoot = findProjectRoot(currentModuleDir);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`FATAL: Error determining project root: ${errorMessage}`);
  projectRoot = process.cwd();
  if (process.stdout.isTTY) {
    console.warn(
      `Warning: Using process.cwd() (${projectRoot}) as fallback project root.`,
    );
  }
}
// --- End Determine Project Root ---

const loadPackageJson = (): {
  name: string;
  version: string;
  description: string;
} => {
  const pkgPath = join(projectRoot, 'package.json');
  const fallback = {
    name: 'mcp-ts-template',
    version: '1.0.0',
    description: 'Shits broken',
  };
  if (!existsSync(pkgPath)) {
    if (process.stdout.isTTY) {
      console.warn(
        `Warning: package.json not found at ${pkgPath}. Using fallback values.`,
      );
    }
    return fallback;
  }
  try {
    const fileContents = readFileSync(pkgPath, 'utf-8');
    const parsed: unknown = JSON.parse(fileContents);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      return {
        name: typeof obj.name === 'string' ? obj.name : fallback.name,
        version:
          typeof obj.version === 'string' ? obj.version : fallback.version,
        description:
          typeof obj.description === 'string'
            ? obj.description
            : fallback.description,
      };
    }
    return fallback;
  } catch (error) {
    if (process.stdout.isTTY) {
      console.error(
        'Warning: Could not read or parse package.json. Using hardcoded defaults.',
        error,
      );
    }
    return fallback;
  }
};

const pkg = loadPackageJson();

const ConfigSchema = z.object({
  pkg: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
  }),
  mcpServerName: z.string(),
  mcpServerVersion: z.string(),
  mcpServerDescription: z.string().optional(),
  logLevel: z.string().default('debug'),
  logsPath: z.string(),
  environment: z.string().default('development'),
  mcpTransportType: z.enum(['stdio', 'http']).default('stdio'),
  mcpSessionMode: z.enum(['stateless', 'stateful', 'auto']).default('auto'),
  mcpHttpPort: z.coerce.number().default(3010),
  mcpHttpHost: z.string().default('127.0.0.1'),
  mcpHttpEndpointPath: z.string().default('/mcp'),
  mcpHttpMaxPortRetries: z.coerce.number().default(15),
  mcpHttpPortRetryDelayMs: z.coerce.number().default(50),
  mcpStatefulSessionStaleTimeoutMs: z.coerce.number().default(1_800_000),
  mcpAllowedOrigins: z.array(z.string()).optional(),
  mcpAuthSecretKey: z.string().optional(),
  mcpAuthMode: z.enum(['jwt', 'oauth', 'none']).default('none'),
  oauthIssuerUrl: z.string().url().optional(),
  oauthJwksUri: z.string().url().optional(),
  oauthAudience: z.string().optional(),
  oauthJwksCooldownMs: z.coerce.number().default(300_000), // 5 minutes
  oauthJwksTimeoutMs: z.coerce.number().default(5_000), // 5 seconds
  devMcpClientId: z.string().optional(),
  devMcpScopes: z.array(z.string()).optional(),
  openrouterAppUrl: z.string().default('http://localhost:3000'),
  openrouterAppName: z.string(),
  openrouterApiKey: z.string().optional(),
  llmDefaultModel: z.string().default('google/gemini-2.5-flash'),
  llmDefaultTemperature: z.coerce.number().optional(),
  llmDefaultTopP: z.coerce.number().optional(),
  llmDefaultMaxTokens: z.coerce.number().optional(),
  llmDefaultTopK: z.coerce.number().optional(),
  llmDefaultMinP: z.coerce.number().optional(),
  oauthProxy: z
    .object({
      authorizationUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
      revocationUrl: z.string().url().optional(),
      issuerUrl: z.string().url().optional(),
      serviceDocumentationUrl: z.string().url().optional(),
      defaultClientRedirectUris: z.array(z.string()).optional(),
    })
    .optional(),
  supabase: z
    .object({
      url: z.string().url(),
      anonKey: z.string(),
      serviceRoleKey: z.string().optional(),
    })
    .optional(),
  storage: z.object({
    providerType: z
      .enum(['in-memory', 'filesystem', 'supabase'])
      .default('in-memory'),
    filesystemPath: z.string().optional(),
  }),
  openTelemetry: z.object({
    enabled: z.coerce.boolean().default(false),
    serviceName: z.string(),
    serviceVersion: z.string(),
    tracesEndpoint: z.string().url().optional(),
    metricsEndpoint: z.string().url().optional(),
    samplingRatio: z.coerce.number().default(1.0),
    logLevel: z
      .enum(['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE', 'ALL'])
      .default('INFO'),
  }),
});

const parseConfig = () => {
  const env = process.env;
  const rawConfig = {
    pkg,
    mcpServerName: env.MCP_SERVER_NAME || pkg.name,
    mcpServerVersion: env.MCP_SERVER_VERSION || pkg.version,
    mcpServerDescription: env.MCP_SERVER_DESCRIPTION || pkg.description,
    logLevel: env.MCP_LOG_LEVEL,
    logsPath: env.LOGS_DIR || path.join(projectRoot, 'logs'),
    environment: env.NODE_ENV,
    mcpTransportType: env.MCP_TRANSPORT_TYPE,
    mcpSessionMode: env.MCP_SESSION_MODE,
    mcpHttpPort: env.MCP_HTTP_PORT,
    mcpHttpHost: env.MCP_HTTP_HOST,
    mcpHttpEndpointPath: env.MCP_HTTP_ENDPOINT_PATH,
    mcpHttpMaxPortRetries: env.MCP_HTTP_MAX_PORT_RETRIES,
    mcpHttpPortRetryDelayMs: env.MCP_HTTP_PORT_RETRY_DELAY_MS,
    mcpStatefulSessionStaleTimeoutMs: env.MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS,
    mcpAllowedOrigins: env.MCP_ALLOWED_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    mcpAuthSecretKey: env.MCP_AUTH_SECRET_KEY,
    mcpAuthMode: env.MCP_AUTH_MODE,
    oauthIssuerUrl: env.OAUTH_ISSUER_URL,
    oauthJwksUri: env.OAUTH_JWKS_URI,
    oauthAudience: env.OAUTH_AUDIENCE,
    oauthJwksCooldownMs: env.OAUTH_JWKS_COOLDOWN_MS,
    oauthJwksTimeoutMs: env.OAUTH_JWKS_TIMEOUT_MS,
    devMcpClientId: env.DEV_MCP_CLIENT_ID,
    devMcpScopes: env.DEV_MCP_SCOPES?.split(',').map((s) => s.trim()),
    openrouterAppUrl: env.OPENROUTER_APP_URL,
    openrouterAppName: env.OPENROUTER_APP_NAME || pkg.name || 'mcp-ts-template',
    openrouterApiKey: env.OPENROUTER_API_KEY,
    llmDefaultModel: env.LLM_DEFAULT_MODEL,
    llmDefaultTemperature: env.LLM_DEFAULT_TEMPERATURE,
    llmDefaultTopP: env.LLM_DEFAULT_TOP_P,
    llmDefaultMaxTokens: env.LLM_DEFAULT_MAX_TOKENS,
    llmDefaultTopK: env.LLM_DEFAULT_TOP_K,
    llmDefaultMinP: env.LLM_DEFAULT_MIN_P,
    oauthProxy:
      env.OAUTH_PROXY_AUTHORIZATION_URL || env.OAUTH_PROXY_TOKEN_URL
        ? {
            authorizationUrl: env.OAUTH_PROXY_AUTHORIZATION_URL,
            tokenUrl: env.OAUTH_PROXY_TOKEN_URL,
            revocationUrl: env.OAUTH_PROXY_REVOCATION_URL,
            issuerUrl: env.OAUTH_PROXY_ISSUER_URL,
            serviceDocumentationUrl: env.OAUTH_PROXY_SERVICE_DOCUMENTATION_URL,
            defaultClientRedirectUris:
              env.OAUTH_PROXY_DEFAULT_CLIENT_REDIRECT_URIS?.split(',')
                .map((uri) => uri.trim())
                .filter(Boolean),
          }
        : undefined,
    supabase:
      env.SUPABASE_URL && env.SUPABASE_ANON_KEY
        ? {
            url: env.SUPABASE_URL,
            anonKey: env.SUPABASE_ANON_KEY,
            serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          }
        : undefined,
    storage: {
      providerType: env.STORAGE_PROVIDER_TYPE,
      filesystemPath: env.STORAGE_FILESYSTEM_PATH || './.storage',
    },
    openTelemetry: {
      enabled: env.OTEL_ENABLED,
      serviceName: env.OTEL_SERVICE_NAME || env.MCP_SERVER_NAME || pkg.name,
      serviceVersion:
        env.OTEL_SERVICE_VERSION || env.MCP_SERVER_VERSION || pkg.version,
      tracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      metricsEndpoint: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
      samplingRatio: env.OTEL_TRACES_SAMPLER_ARG,
      logLevel: env.OTEL_LOG_LEVEL,
    },
  };

  const parsedConfig = ConfigSchema.safeParse(rawConfig);

  if (!parsedConfig.success) {
    if (process.stdout.isTTY) {
      console.error(
        '❌ Invalid configuration found. Please check your environment variables.',
        parsedConfig.error.flatten().fieldErrors,
      );
    }
    process.exit(1);
  }

  return parsedConfig.data;
};

export const config = parseConfig();

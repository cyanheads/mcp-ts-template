/**
 * @fileoverview Loads, validates, and exports application configuration.
 * This module centralizes configuration management, sourcing values from
 * environment variables and `package.json`. It uses Zod for schema validation
 * to ensure type safety and correctness of configuration parameters.
 *
 * @module src/config/index
 */

import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

dotenv.config();

// --- Determine Project Root ---
const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  // If the start directory is in `dist`, start searching from the parent directory.
  if (path.basename(currentDir) === 'dist') {
    currentDir = path.dirname(currentDir);
  }
  while (true) {
    const packageJsonPath = join(currentDir, "package.json");
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

/**
 * Loads and parses the package.json file from the project root.
 * @returns The parsed package.json object or a fallback default.
 * @private
 */
const loadPackageJson = (): { name: string; version: string } => {
  const pkgPath = join(projectRoot, "package.json");
  const fallback = { name: "mcp-ts-template", version: "1.0.0" };

  if (!existsSync(pkgPath)) {
    if (process.stdout.isTTY) {
      console.warn(
        `Warning: package.json not found at ${pkgPath}. Using fallback values. This is expected in some environments (e.g., Docker) but may indicate an issue with project root detection.`,
      );
    }
    return fallback;
  }

  try {
    const fileContents = readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(fileContents);
    return {
      name: typeof parsed.name === "string" ? parsed.name : fallback.name,
      version: typeof parsed.version === "string" ? parsed.version : fallback.version,
    };
  } catch (error) {
    if (process.stdout.isTTY) {
      console.error(
        "Warning: Could not read or parse package.json. Using hardcoded defaults.",
        error,
      );
    }
    return fallback;
  }
};

const pkg = loadPackageJson();

const EnvSchema = z.object({
  // --- Existing MCP and other variables ---
  MCP_SERVER_NAME: z.string().optional(),
  MCP_SERVER_VERSION: z.string().optional(),
  MCP_LOG_LEVEL: z.string().default("debug"),
  LOGS_DIR: z.string().default(path.join(projectRoot, "logs")),
  NODE_ENV: z.string().default("development"),
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http"]).default("stdio"),
  MCP_SESSION_MODE: z.enum(["stateless", "stateful", "auto"]).default("auto"),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3010),
  MCP_HTTP_HOST: z.string().default("127.0.0.1"),
  MCP_HTTP_ENDPOINT_PATH: z.string().default("/mcp"),
  MCP_HTTP_MAX_PORT_RETRIES: z.coerce.number().int().nonnegative().default(15),
  MCP_HTTP_PORT_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(50),
  MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1_800_000),
  MCP_ALLOWED_ORIGINS: z.string().optional(),
  MCP_AUTH_SECRET_KEY: z
    .string()
    .min(
      32,
      "MCP_AUTH_SECRET_KEY must be at least 32 characters long for security reasons.",
    )
    .optional(),
  MCP_AUTH_MODE: z.enum(["jwt", "oauth", "none"]).default("none"),
  OAUTH_ISSUER_URL: z.string().url().optional(),
  OAUTH_JWKS_URI: z.string().url().optional(),
  OAUTH_AUDIENCE: z.string().optional(),
  DEV_MCP_CLIENT_ID: z.string().optional(),
  DEV_MCP_SCOPES: z.string().optional(),
  OPENROUTER_APP_URL: z
    .string()
    .url("OPENROUTER_APP_URL must be a valid URL (e.g., http://localhost:3000)")
    .optional(),
  OPENROUTER_APP_NAME: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_DEFAULT_MODEL: z.string().default("google/gemini-2.5-flash"),
  LLM_DEFAULT_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),
  LLM_DEFAULT_TOP_P: z.coerce.number().min(0).max(1).optional(),
  LLM_DEFAULT_MAX_TOKENS: z.coerce.number().int().positive().optional(),
  LLM_DEFAULT_TOP_K: z.coerce.number().int().nonnegative().optional(),
  LLM_DEFAULT_MIN_P: z.coerce.number().min(0).max(1).optional(),
  OAUTH_PROXY_AUTHORIZATION_URL: z
    .string()
    .url("OAUTH_PROXY_AUTHORIZATION_URL must be a valid URL.")
    .optional(),
  OAUTH_PROXY_TOKEN_URL: z
    .string()
    .url("OAUTH_PROXY_TOKEN_URL must be a valid URL.")
    .optional(),
  OAUTH_PROXY_REVOCATION_URL: z
    .string()
    .url("OAUTH_PROXY_REVOCATION_URL must be a valid URL.")
    .optional(),
  OAUTH_PROXY_ISSUER_URL: z
    .string()
    .url("OAUTH_PROXY_ISSUER_URL must be a valid URL.")
    .optional(),
  OAUTH_PROXY_SERVICE_DOCUMENTATION_URL: z
    .string()
    .url("OAUTH_PROXY_SERVICE_DOCUMENTATION_URL must be a valid URL.")
    .optional(),
  OAUTH_PROXY_DEFAULT_CLIENT_REDIRECT_URIS: z.string().optional(),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL.").optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // --- START: OpenTelemetry Configuration ---
  /** If 'true', OpenTelemetry will be initialized and enabled. Default: 'false'. */
  OTEL_ENABLED: z
    .string()
    .transform((v) => v.toLowerCase() === "true")
    .default("false"),
  /** The logical name of the service. Defaults to MCP_SERVER_NAME or package name. */
  OTEL_SERVICE_NAME: z.string().optional(),
  /** The version of the service. Defaults to MCP_SERVER_VERSION or package version. */
  OTEL_SERVICE_VERSION: z.string().optional(),
  /** The OTLP endpoint for traces. If not set, traces are logged to a file in development. */
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
  /** The OTLP endpoint for metrics. If not set, metrics are not exported. */
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().url().optional(),
  /** Sampling ratio for traces (0.0 to 1.0). 1.0 means sample all. Default: 1.0 */
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().min(0).max(1).default(1.0),
  /** Log level for OpenTelemetry's internal diagnostic logger. Default: "INFO". */
  OTEL_LOG_LEVEL: z
    .enum(["NONE", "ERROR", "WARN", "INFO", "DEBUG", "VERBOSE", "ALL"])
    .default("INFO"),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  if (process.stdout.isTTY) {
    console.error(
      "❌ Invalid environment variables found:",
      parsedEnv.error.flatten().fieldErrors,
    );
  }
}

const env = parsedEnv.success ? parsedEnv.data : EnvSchema.parse({});

const ensureDirectory = (
  dirPath: string,
  rootDir: string,
  dirName: string,
): string | null => {
  const resolvedDirPath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(rootDir, dirPath);
  if (
    !resolvedDirPath.startsWith(rootDir + path.sep) &&
    resolvedDirPath !== rootDir
  ) {
    if (process.stdout.isTTY) {
      console.error(
        `Error: ${dirName} path "${dirPath}" resolves to "${resolvedDirPath}", which is outside the project boundary "${rootDir}".`,
      );
    }
    return null;
  }
  if (!existsSync(resolvedDirPath)) {
    try {
      mkdirSync(resolvedDirPath, { recursive: true });
      if (process.stdout.isTTY) {
        console.log(`Created ${dirName} directory: ${resolvedDirPath}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (process.stdout.isTTY) {
        console.error(
          `Error creating ${dirName} directory at ${resolvedDirPath}: ${errorMessage}`,
        );
      }
      return null;
    }
  } else {
    try {
      const stats = statSync(resolvedDirPath);
      if (!stats.isDirectory()) {
        if (process.stdout.isTTY) {
          console.error(
            `Error: ${dirName} path ${resolvedDirPath} exists but is not a directory.`,
          );
        }
        return null;
      }
    } catch (statError: unknown) {
      if (process.stdout.isTTY) {
        const statErrorMessage =
          statError instanceof Error ? statError.message : String(statError);
        console.error(
          `Error accessing ${dirName} path ${resolvedDirPath}: ${statErrorMessage}`,
        );
      }
      return null;
    }
  }
  return resolvedDirPath;
};

let validatedLogsPath: string | null = ensureDirectory(
  env.LOGS_DIR,
  projectRoot,
  "logs",
);
if (!validatedLogsPath) {
  if (process.stdout.isTTY) {
    console.warn(
      `Warning: Custom logs directory ('${env.LOGS_DIR}') is invalid or outside the project boundary. Falling back to default.`,
    );
  }
  const defaultLogsDir = path.join(projectRoot, "logs");
  validatedLogsPath = ensureDirectory(defaultLogsDir, projectRoot, "logs");
  if (!validatedLogsPath) {
    if (process.stdout.isTTY) {
      console.warn(
        "Warning: Default logs directory could not be created. File logging will be disabled.",
      );
    }
  }
}

export const config = {
  pkg,
  mcpServerName: env.MCP_SERVER_NAME || pkg.name,
  mcpServerVersion: env.MCP_SERVER_VERSION || pkg.version,
  logLevel: env.MCP_LOG_LEVEL,
  logsPath: validatedLogsPath,
  environment: env.NODE_ENV,
  mcpTransportType: env.MCP_TRANSPORT_TYPE,
  mcpSessionMode: env.MCP_SESSION_MODE,
  mcpHttpPort: env.MCP_HTTP_PORT,
  mcpHttpHost: env.MCP_HTTP_HOST,
  mcpHttpEndpointPath: env.MCP_HTTP_ENDPOINT_PATH,
  mcpHttpMaxPortRetries: env.MCP_HTTP_MAX_PORT_RETRIES,
  mcpHttpPortRetryDelayMs: env.MCP_HTTP_PORT_RETRY_DELAY_MS,
  mcpStatefulSessionStaleTimeoutMs: env.MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS,
  mcpAllowedOrigins: env.MCP_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  mcpAuthSecretKey: env.MCP_AUTH_SECRET_KEY,
  mcpAuthMode: env.MCP_AUTH_MODE,
  oauthIssuerUrl: env.OAUTH_ISSUER_URL,
  oauthJwksUri: env.OAUTH_JWKS_URI,
  oauthAudience: env.OAUTH_AUDIENCE,
  devMcpClientId: env.DEV_MCP_CLIENT_ID,
  devMcpScopes: env.DEV_MCP_SCOPES?.split(",").map((s) => s.trim()),
  openrouterAppUrl: env.OPENROUTER_APP_URL || "http://localhost:3000",
  openrouterAppName: env.OPENROUTER_APP_NAME || pkg.name || "mcp-ts-template",
  openrouterApiKey: env.OPENROUTER_API_KEY,
  llmDefaultModel: env.LLM_DEFAULT_MODEL,
  llmDefaultTemperature: env.LLM_DEFAULT_TEMPERATURE,
  llmDefaultTopP: env.LLM_DEFAULT_TOP_P,
  llmDefaultMaxTokens: env.LLM_DEFAULT_MAX_TOKENS,
  llmDefaultTopK: env.LLM_DEFAULT_TOP_K,
  llmDefaultMinP: env.LLM_DEFAULT_MIN_P,
  oauthProxy:
    env.OAUTH_PROXY_AUTHORIZATION_URL ||
    env.OAUTH_PROXY_TOKEN_URL ||
    env.OAUTH_PROXY_REVOCATION_URL ||
    env.OAUTH_PROXY_ISSUER_URL ||
    env.OAUTH_PROXY_SERVICE_DOCUMENTATION_URL ||
    env.OAUTH_PROXY_DEFAULT_CLIENT_REDIRECT_URIS
      ? {
          authorizationUrl: env.OAUTH_PROXY_AUTHORIZATION_URL,
          tokenUrl: env.OAUTH_PROXY_TOKEN_URL,
          revocationUrl: env.OAUTH_PROXY_REVOCATION_URL,
          issuerUrl: env.OAUTH_PROXY_ISSUER_URL,
          serviceDocumentationUrl: env.OAUTH_PROXY_SERVICE_DOCUMENTATION_URL,
          defaultClientRedirectUris:
            env.OAUTH_PROXY_DEFAULT_CLIENT_REDIRECT_URIS?.split(",")
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

export const logLevel: string = config.logLevel;
export const environment: string = config.environment;

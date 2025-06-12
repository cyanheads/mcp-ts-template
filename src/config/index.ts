/**
 * @fileoverview Loads, validates, and exports application configuration.
 * This module centralizes configuration management, sourcing values from
 * environment variables and `package.json`. It uses Zod for schema validation
 * to ensure type safety and correctness of configuration parameters.
 *
 * Key responsibilities:
 * - Load environment variables from a `.env` file.
 * - Read `package.json` for default server name and version.
 * - Define a Zod schema for all expected environment variables.
 * - Validate environment variables against the schema.
 * - Construct and export a comprehensive `config` object.
 * - Export individual configuration values like `logLevel` and `environment` for convenience.
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
/**
 * Finds the project root directory by searching upwards for package.json.
 * @param startDir The directory to start searching from.
 * @returns The absolute path to the project root, or throws an error if not found.
 */
const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  while (true) {
    const packageJsonPath = join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached the root of the filesystem without finding package.json
      throw new Error(
        `Could not find project root (package.json) starting from ${startDir}`,
      );
    }
    currentDir = parentDir;
  }
};

let projectRoot: string;
try {
  // For ESM, __dirname is not available directly.
  // import.meta.url gives the URL of the current module.
  const currentModuleDir = dirname(fileURLToPath(import.meta.url));
  projectRoot = findProjectRoot(currentModuleDir);
} catch (error: any) {
  console.error(`FATAL: Error determining project root: ${error.message}`);
  // Fallback to process.cwd() if project root cannot be determined.
  // This might happen in unusual execution environments.
  projectRoot = process.cwd();
  console.warn(
    `Warning: Using process.cwd() (${projectRoot}) as fallback project root.`,
  );
}
// --- End Determine Project Root ---

const pkgPath = join(projectRoot, "package.json"); // Use determined projectRoot
let pkg = { name: "mcp-ts-template", version: "0.0.0" };

try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
} catch (error) {
  if (process.stdout.isTTY) {
    console.error(
      "Warning: Could not read package.json for default config values. Using hardcoded defaults.",
      error,
    );
  }
}

/**
 * Zod schema for validating environment variables.
 * Provides type safety, validation, defaults, and clear error messages.
 * @private
 */
const EnvSchema = z.object({
  /** Optional. The desired name for the MCP server. Defaults to `package.json` name. */
  MCP_SERVER_NAME: z.string().optional(),
  /** Optional. The version of the MCP server. Defaults to `package.json` version. */
  MCP_SERVER_VERSION: z.string().optional(),
  /** Minimum logging level. See `McpLogLevel` in logger utility. Default: "debug". */
  MCP_LOG_LEVEL: z.string().default("debug"),
  /** Directory for log files. Defaults to "logs" in project root. */
  LOGS_DIR: z.string().default(path.join(projectRoot, "logs")),
  /** Runtime environment (e.g., "development", "production"). Default: "development". */
  NODE_ENV: z.string().default("development"),
  /** MCP communication transport ("stdio" or "http"). Default: "stdio". */
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http"]).default("stdio"),
  /** HTTP server port (if MCP_TRANSPORT_TYPE is "http"). Default: 3010. */
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3010),
  /** HTTP server host (if MCP_TRANSPORT_TYPE is "http"). Default: "127.0.0.1". */
  MCP_HTTP_HOST: z.string().default("127.0.0.1"),
  /** Optional. Comma-separated allowed origins for CORS (HTTP transport). */
  MCP_ALLOWED_ORIGINS: z.string().optional(),
  /** Optional. Secret key (min 32 chars) for auth tokens (HTTP transport). CRITICAL for production. */
  MCP_AUTH_SECRET_KEY: z
    .string()
    .min(
      32,
      "MCP_AUTH_SECRET_KEY must be at least 32 characters long for security reasons.",
    )
    .optional(),
  /** The authentication mode to use. 'jwt' for internal simple JWTs, 'oauth' for OAuth 2.1. Default: 'jwt'. */
  MCP_AUTH_MODE: z.enum(["jwt", "oauth"]).default("jwt"),
  /** The expected issuer URL for OAuth 2.1 access tokens. CRITICAL for validation. */
  OAUTH_ISSUER_URL: z.string().url().optional(),
  /** The JWKS (JSON Web Key Set) URI for the OAuth 2.1 provider. If not provided, it's often discoverable from the issuer URL. */
  OAUTH_JWKS_URI: z.string().url().optional(),
  /** The audience claim for the OAuth 2.1 access tokens. This server will reject tokens not intended for it. */
  OAUTH_AUDIENCE: z.string().optional(),

  /** Optional. Application URL for OpenRouter integration. */
  OPENROUTER_APP_URL: z
    .string()
    .url("OPENROUTER_APP_URL must be a valid URL (e.g., http://localhost:3000)")
    .optional(),
  /** Optional. Application name for OpenRouter. Defaults to MCP_SERVER_NAME or package name. */
  OPENROUTER_APP_NAME: z.string().optional(),
  /** Optional. API key for OpenRouter services. */
  OPENROUTER_API_KEY: z.string().optional(),
  /** Default LLM model. Default: "google/gemini-2.5-flash-preview-05-20". */
  LLM_DEFAULT_MODEL: z
    .string()
    .default("google/gemini-2.5-flash-preview-05-20"),
  /** Optional. Default LLM temperature (0.0-2.0). */
  LLM_DEFAULT_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),
  /** Optional. Default LLM top_p (0.0-1.0). */
  LLM_DEFAULT_TOP_P: z.coerce.number().min(0).max(1).optional(),
  /** Optional. Default LLM max tokens (positive integer). */
  LLM_DEFAULT_MAX_TOKENS: z.coerce.number().int().positive().optional(),
  /** Optional. Default LLM top_k (non-negative integer). */
  LLM_DEFAULT_TOP_K: z.coerce.number().int().nonnegative().optional(),
  /** Optional. Default LLM min_p (0.0-1.0). */
  LLM_DEFAULT_MIN_P: z.coerce.number().min(0).max(1).optional(),

  /** Optional. OAuth provider authorization endpoint URL. */
  OAUTH_PROXY_AUTHORIZATION_URL: z
    .string()
    .url("OAUTH_PROXY_AUTHORIZATION_URL must be a valid URL.")
    .optional(),
  /** Optional. OAuth provider token endpoint URL. */
  OAUTH_PROXY_TOKEN_URL: z
    .string()
    .url("OAUTH_PROXY_TOKEN_URL must be a valid URL.")
    .optional(),
  /** Optional. OAuth provider revocation endpoint URL. */
  OAUTH_PROXY_REVOCATION_URL: z
    .string()
    .url("OAUTH_PROXY_REVOCATION_URL must be a valid URL.")
    .optional(),
  /** Optional. OAuth provider issuer URL. */
  OAUTH_PROXY_ISSUER_URL: z
    .string()
    .url("OAUTH_PROXY_ISSUER_URL must be a valid URL.")
    .optional(),
  /** Optional. OAuth service documentation URL. */
  OAUTH_PROXY_SERVICE_DOCUMENTATION_URL: z
    .string()
    .url("OAUTH_PROXY_SERVICE_DOCUMENTATION_URL must be a valid URL.")
    .optional(),
  /** Optional. Comma-separated default OAuth client redirect URIs. */
  OAUTH_PROXY_DEFAULT_CLIENT_REDIRECT_URIS: z.string().optional(),

  /** Supabase Project URL. From `SUPABASE_URL`. */
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL.").optional(),
  /** Supabase Anon Key (public). From `SUPABASE_ANON_KEY`. */
  SUPABASE_ANON_KEY: z.string().optional(),
  /** Supabase Service Role Key (secret). From `SUPABASE_SERVICE_ROLE_KEY`. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  if (process.stdout.isTTY) {
    console.error(
      "❌ Invalid environment variables found:",
      parsedEnv.error.flatten().fieldErrors,
    );
  }
  // Consider throwing an error in production for critical misconfigurations.
}

const env = parsedEnv.success ? parsedEnv.data : EnvSchema.parse({});

// --- Directory Ensurance Function ---
/**
 * Ensures a directory exists and is within the project root.
 * @param dirPath The desired path for the directory (can be relative or absolute).
 * @param rootDir The root directory of the project to contain the directory.
 * @param dirName The name of the directory type for logging (e.g., "logs").
 * @returns The validated, absolute path to the directory, or null if invalid.
 */
const ensureDirectory = (
  dirPath: string,
  rootDir: string,
  dirName: string,
): string | null => {
  const resolvedDirPath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(rootDir, dirPath);

  // Ensure the resolved path is within the project root boundary
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
    } catch (statError: any) {
      if (process.stdout.isTTY) {
        console.error(
          `Error accessing ${dirName} path ${resolvedDirPath}: ${statError.message}`,
        );
      }
      return null;
    }
  }
  return resolvedDirPath;
};
// --- End Directory Ensurance Function ---

// --- Logs Directory Handling ---
const validatedLogsPath = ensureDirectory(env.LOGS_DIR, projectRoot, "logs");

if (!validatedLogsPath) {
  if (process.stdout.isTTY) {
    console.error(
      "FATAL: Logs directory configuration is invalid or could not be created. Please check permissions and path. Exiting.",
    );
  }
  process.exit(1); // Exit if logs directory is not usable
}
// --- End Logs Directory Handling ---

/**
 * Main application configuration object.
 * Aggregates settings from validated environment variables and `package.json`.
 */
export const config = {
  /** Information from package.json. */
  pkg,
  /** MCP server name. Env `MCP_SERVER_NAME` > `package.json` name > "mcp-ts-template". */
  mcpServerName: env.MCP_SERVER_NAME || pkg.name,
  /** MCP server version. Env `MCP_SERVER_VERSION` > `package.json` version > "0.0.0". */
  mcpServerVersion: env.MCP_SERVER_VERSION || pkg.version,
  /** Logging level. From `MCP_LOG_LEVEL` env var. Default: "debug". */
  logLevel: env.MCP_LOG_LEVEL,
  /** Absolute path to the logs directory. From `LOGS_DIR` env var. */
  logsPath: validatedLogsPath,
  /** Runtime environment. From `NODE_ENV` env var. Default: "development". */
  environment: env.NODE_ENV,
  /** MCP transport type ('stdio' or 'http'). From `MCP_TRANSPORT_TYPE` env var. Default: "stdio". */
  mcpTransportType: env.MCP_TRANSPORT_TYPE,
  /** HTTP server port (if http transport). From `MCP_HTTP_PORT` env var. Default: 3010. */
  mcpHttpPort: env.MCP_HTTP_PORT,
  /** HTTP server host (if http transport). From `MCP_HTTP_HOST` env var. Default: "127.0.0.1". */
  mcpHttpHost: env.MCP_HTTP_HOST,
  /** Array of allowed CORS origins (http transport). From `MCP_ALLOWED_ORIGINS` (comma-separated). */
  mcpAllowedOrigins: env.MCP_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Auth secret key (JWTs, http transport). From `MCP_AUTH_SECRET_KEY`. CRITICAL. */
  mcpAuthSecretKey: env.MCP_AUTH_SECRET_KEY,
  /** The authentication mode ('jwt' or 'oauth'). From `MCP_AUTH_MODE`. */
  mcpAuthMode: env.MCP_AUTH_MODE,
  /** OAuth 2.1 Issuer URL. From `OAUTH_ISSUER_URL`. */
  oauthIssuerUrl: env.OAUTH_ISSUER_URL,
  /** OAuth 2.1 JWKS URI. From `OAUTH_JWKS_URI`. */
  oauthJwksUri: env.OAUTH_JWKS_URI,
  /** OAuth 2.1 Audience. From `OAUTH_AUDIENCE`. */
  oauthAudience: env.OAUTH_AUDIENCE,
  /** OpenRouter App URL. From `OPENROUTER_APP_URL`. Default: "http://localhost:3000". */
  openrouterAppUrl: env.OPENROUTER_APP_URL || "http://localhost:3000",
  /** OpenRouter App Name. From `OPENROUTER_APP_NAME`. Defaults to `mcpServerName`. */
  openrouterAppName: env.OPENROUTER_APP_NAME || pkg.name || "MCP TS App",
  /** OpenRouter API Key. From `OPENROUTER_API_KEY`. */
  openrouterApiKey: env.OPENROUTER_API_KEY,
  /** Default LLM model. From `LLM_DEFAULT_MODEL`. */
  llmDefaultModel: env.LLM_DEFAULT_MODEL,
  /** Default LLM temperature. From `LLM_DEFAULT_TEMPERATURE`. */
  llmDefaultTemperature: env.LLM_DEFAULT_TEMPERATURE,
  /** Default LLM top_p. From `LLM_DEFAULT_TOP_P`. */
  llmDefaultTopP: env.LLM_DEFAULT_TOP_P,
  /** Default LLM max tokens. From `LLM_DEFAULT_MAX_TOKENS`. */
  llmDefaultMaxTokens: env.LLM_DEFAULT_MAX_TOKENS,
  /** Default LLM top_k. From `LLM_DEFAULT_TOP_K`. */
  llmDefaultTopK: env.LLM_DEFAULT_TOP_K,
  /** Default LLM min_p. From `LLM_DEFAULT_MIN_P`. */
  llmDefaultMinP: env.LLM_DEFAULT_MIN_P,

  /** OAuth Proxy configurations. Undefined if no related env vars are set. */
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

  /** Supabase configuration. Undefined if no related env vars are set. */
  supabase:
    env.SUPABASE_URL && env.SUPABASE_ANON_KEY
      ? {
          url: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        }
      : undefined,
};

/**
 * Configured logging level for the application.
 * Exported for convenience.
 */
export const logLevel: string = config.logLevel;

/**
 * Configured runtime environment ("development", "production", etc.).
 * Exported for convenience.
 */
export const environment: string = config.environment;

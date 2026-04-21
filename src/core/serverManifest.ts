/**
 * @fileoverview Server manifest — the single source of truth consumed by the
 * HTTP transport's three surfaces: the bespoke `/mcp` status JSON, the
 * SEP-1649 Server Card at `/.well-known/mcp.json`, and the HTML landing page
 * at `/`. `buildServerManifest()` is a pure function: feed it config + the
 * definition arrays that were already passed to `createApp()` and it produces
 * everything the surfaces need to render without re-reading registries or
 * inspecting Zod schemas a second time.
 *
 * Landing-page content limits (tagline/logo/links/repoRoot shape) are
 * enforced at build time here and surfaced through the definition linter —
 * surprising input fails loudly at startup instead of quietly at render.
 * @module src/core/serverManifest
 */

import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape } from 'zod';
import { toJSONSchema } from 'zod/v4/core';

import type { AppConfig } from '@/config/index.js';
import { FRAMEWORK_NAME, FRAMEWORK_VERSION } from '@/config/index.js';
import type { AnyPromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';
import type { AnyResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import type { AnyToolDef } from '@/mcp-server/tools/tool-registration.js';
import type { AnyToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';

// ---------------------------------------------------------------------------
// Public config surface (accepted by createApp({ landing }))
// ---------------------------------------------------------------------------

/** Entry in `landing.links` — rendered in the footer link cluster. */
export interface LandingLink {
  /** When true, opens with `target="_blank" rel="noopener noreferrer"`. */
  external?: boolean;
  /** Absolute URL or same-origin path. */
  href: string;
  /** Visible label. */
  label: string;
}

/** Consumer-supplied landing page configuration. */
export interface LandingConfig {
  /** When true (default), footer shows "Built on @cyanheads/mcp-ts-core". */
  attribution?: boolean;
  /**
   * Full URL to the changelog. Defaults to `${repoRoot}/blob/main/CHANGELOG.md`
   * when `repoRoot` is known. Override for projects with a non-standard location.
   */
  changelogUrl?: string;
  /** Default: true when HTTP transport is active. */
  enabled?: boolean;
  /** Footer link cluster. Max 6 entries. */
  links?: LandingLink[];
  /** Data URI (`data:image/...`) or same-origin path. ≤24KB when data URI. */
  logo?: string;
  /**
   * Canonical GitHub repository root, e.g. `https://github.com/owner/repo`.
   * Unlocks per-definition "view source" links, release linking on the
   * version badge, and the GitHub footer cluster (changelog, issues, source).
   * Auto-derived from `mcpServerHomepage` when that URL matches the pattern.
   */
  repoRoot?: string;
  /** When true, unauthenticated callers receive a reduced landing body. */
  requireAuth?: boolean;
  /** One-line tagline under the server name. ≤120 chars. */
  tagline?: string;
  /** Brand accent color (any CSS color); hover/active pairs derived via `color-mix()`. */
  theme?: { accent?: string };
}

// ---------------------------------------------------------------------------
// Content limits (enforced by the linter)
// ---------------------------------------------------------------------------

/** Max tagline length. Longer strings break the hero layout. */
export const LANDING_MAX_TAGLINE_LENGTH = 120;
/** Max logo size when supplied as a data URI (bytes). */
export const LANDING_MAX_LOGO_BYTES = 24 * 1024;
/** Max footer link count. Beyond this the cluster wraps unreadably. */
export const LANDING_MAX_LINKS = 6;
/** `repoRoot` must match `https://github.com/{owner}/{repo}` with no trailing path. */
export const GITHUB_REPO_ROOT_PATTERN = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+?)\/?$/;

// ---------------------------------------------------------------------------
// Manifest shape (the thing consumed by `/mcp`, Server Card, landing page)
// ---------------------------------------------------------------------------

export interface ManifestServer {
  description?: string;
  environment: string;
  homepage?: string;
  name: string;
  version: string;
}

export interface ManifestTransport {
  endpointPath: string;
  sessionMode: string;
  type: 'http' | 'stdio';
}

export interface ManifestProtocol {
  latestVersion: string;
  supportedVersions: readonly string[];
}

export interface ManifestCapabilities {
  logging: boolean;
  prompts: boolean;
  resources: boolean;
  tools: boolean;
}

export interface ManifestAuth {
  /** JWKS URI, when configured. */
  jwksUri?: string;
  mode: 'none' | 'jwt' | 'oauth';
  /** OAuth audience, when mode = 'oauth'. */
  oauthAudience?: string;
  /** OAuth issuer URL, when mode = 'oauth'. */
  oauthIssuer?: string;
  /** Resource identifier for RFC 9728 discovery. */
  resourceIdentifier?: string;
}

export interface ManifestFramework {
  homepage: string;
  name: string;
  version: string;
}

/** Detected GitHub repository. */
export interface GitHubRepo {
  owner: string;
  repo: string;
  url: string;
}

/** Pre-release classification derived from semver. */
export interface PreReleaseInfo {
  isPreRelease: boolean;
  /** `beta`, `rc`, `alpha`, `pre-1.0`, or undefined when stable. */
  label?: 'alpha' | 'beta' | 'rc' | 'pre-1.0';
}

export interface DefinitionCounts {
  prompts: number;
  resources: number;
  tools: number;
}

export interface ManifestTool {
  annotations?: Record<string, unknown>;
  /** Auth scopes required by the tool, if any. */
  auth?: string[];
  description: string;
  /** JSON Schema for the input (when Zod → JSON Schema succeeds). */
  inputSchema?: unknown;
  /** True when `_meta.ui.resourceUri` is set (MCP Apps). */
  isApp: boolean;
  /** True when `task: true` on the definition. */
  isTask: boolean;
  name: string;
  /** JSON Schema for the output (when Zod → JSON Schema succeeds). */
  outputSchema?: unknown;
  /** Required field names from the input schema — used for invocation snippets. */
  requiredFields: string[];
  /** View-source URL; auto-derived from `landing.repoRoot` or per-definition override. */
  sourceUrl?: string;
  title: string;
}

export interface ManifestResource {
  annotations?: Record<string, unknown>;
  auth?: string[];
  description: string;
  mimeType?: string;
  name: string;
  sourceUrl?: string;
  title: string;
  uriTemplate: string;
}

export interface ManifestPromptArg {
  description?: string;
  name: string;
  required: boolean;
}

export interface ManifestPrompt {
  args: ManifestPromptArg[];
  description: string;
  name: string;
  sourceUrl?: string;
  title: string;
}

export interface ManifestDefinitions {
  prompts: ManifestPrompt[];
  resources: ManifestResource[];
  tools: ManifestTool[];
}

/** Derived landing state — what the renderer actually consumes. */
export interface ManifestLanding {
  attribution: boolean;
  changelogUrl?: string;
  enabled: boolean;
  links: Array<Required<Pick<LandingLink, 'href' | 'label' | 'external'>>>;
  logo?: string;
  /** Registry / scoped npm package auto-link, when derivable. */
  npmPackage?: { name: string; url: string };
  /** Pre-release classification for version badge. */
  preRelease: PreReleaseInfo;
  repoRoot?: GitHubRepo;
  requireAuth: boolean;
  tagline?: string;
  theme: { accent: string };
}

/**
 * Full server manifest — the single source of truth for every HTTP surface.
 * Built once at startup, passed to the transport, consumed by `/mcp`,
 * `/.well-known/mcp.json`, and `/`.
 */
export interface ServerManifest {
  auth: ManifestAuth;
  /** Timestamp the manifest was built (ISO 8601). Informational only. */
  builtAt: string;
  capabilities: ManifestCapabilities;
  definitionCounts: DefinitionCounts;
  definitions: ManifestDefinitions;
  extensions?: Record<string, object>;
  framework: ManifestFramework;
  landing: ManifestLanding;
  protocol: ManifestProtocol;
  server: ManifestServer;
  transport: ManifestTransport;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRE_RELEASE_PATTERNS: Array<[RegExp, NonNullable<PreReleaseInfo['label']>]> = [
  [/-alpha/i, 'alpha'],
  [/-beta/i, 'beta'],
  [/-rc/i, 'rc'],
];

/** Classifies a semver string — anything pre-1.0 or with a `-tag` is a pre-release. */
export function classifyPreRelease(version: string): PreReleaseInfo {
  for (const [pattern, label] of PRE_RELEASE_PATTERNS) {
    if (pattern.test(version)) return { isPreRelease: true, label };
  }
  // `0.x.y` signals unstable per semver convention
  if (/^0\./.test(version)) return { isPreRelease: true, label: 'pre-1.0' };
  return { isPreRelease: false };
}

/** Parses `https://github.com/{owner}/{repo}` into structured form. */
export function detectGitHubRepo(url: string | undefined): GitHubRepo | undefined {
  if (!url) return;
  const match = GITHUB_REPO_ROOT_PATTERN.exec(url.trim());
  if (!match) return;
  const [, owner, repo] = match;
  if (!owner || !repo) return;
  return { url: `https://github.com/${owner}/${repo}`, owner, repo };
}

/** Converts snake_case or kebab-case to Title Case. */
export function deriveTitleFromName(name: string): string {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

/** snake_case → kebab-case (for source-link path derivation). */
export function snakeToKebab(name: string): string {
  return name.replace(/_/g, '-').toLowerCase();
}

/** Safe Zod → JSON Schema. Returns undefined if the schema isn't serializable. */
function safeToJsonSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return;
  try {
    return toJSONSchema(schema as ZodObject<ZodRawShape>);
  } catch {
    return;
  }
}

/** Extract required field names from a Zod object schema. Silent on failure. */
function extractRequiredFields(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object') return [];
  try {
    const asObj = schema as { shape?: Record<string, { isOptional?: () => boolean }> };
    if (!asObj.shape || typeof asObj.shape !== 'object') return [];
    const fields: string[] = [];
    for (const [key, field] of Object.entries(asObj.shape)) {
      if (typeof field?.isOptional === 'function' && !field.isOptional()) {
        fields.push(key);
      }
    }
    return fields;
  } catch {
    return [];
  }
}

/** Detect whether a tool's `_meta.ui.resourceUri` flags it as an MCP App tool. */
function isMcpAppTool(def: AnyToolDef): boolean {
  const meta = (def as unknown as Record<string, unknown>)._meta as
    | { ui?: { resourceUri?: string } }
    | undefined;
  return typeof meta?.ui?.resourceUri === 'string' && meta.ui.resourceUri.length > 0;
}

/**
 * Build a canonical source-link URL for a definition by convention:
 *   `${repoRoot}/blob/main/src/mcp-server/<kind>/definitions/<kebab-name>.<suffix>.ts`
 *
 * Returns undefined if `repoRoot` isn't set or the name is empty.
 */
export function deriveSourceUrl(
  repoRoot: GitHubRepo | undefined,
  kind: 'tools' | 'resources' | 'prompts',
  name: string,
): string | undefined {
  if (!repoRoot || !name) return;
  const suffix = kind === 'tools' ? 'tool' : kind === 'resources' ? 'resource' : 'prompt';
  const fileName = `${snakeToKebab(name)}.${suffix}.ts`;
  return `${repoRoot.url}/blob/main/src/mcp-server/${kind}/definitions/${fileName}`;
}

/** Normalize `landing.links` to a concrete array with `external` defaulted. */
function normalizeLinks(links: LandingLink[] | undefined): ManifestLanding['links'] {
  if (!Array.isArray(links) || links.length === 0) return [];
  return links.slice(0, LANDING_MAX_LINKS).map((link) => ({
    href: link.href,
    label: link.label,
    external: link.external ?? /^https?:\/\//i.test(link.href),
  }));
}

/** Discover an npm package auto-link from consumer package.json metadata. */
function detectNpmPackage(pkgName: string | undefined): ManifestLanding['npmPackage'] {
  if (!pkgName) return;
  // Only link scoped packages or names that look like published packages.
  // Avoids false-positive links for internal `my-mcp-server`-style names.
  if (!pkgName.startsWith('@') && !pkgName.includes('/')) return;
  return {
    name: pkgName,
    url: `https://www.npmjs.com/package/${encodeURIComponent(pkgName)}`,
  };
}

// ---------------------------------------------------------------------------
// buildServerManifest
// ---------------------------------------------------------------------------

export interface BuildServerManifestInput {
  config: AppConfig;
  extensions?: Record<string, object>;
  landing?: LandingConfig;
  prompts: AnyPromptDefinition[];
  resources: AnyResourceDefinition[];
  tools: AnyToolDef[];
}

/**
 * Build the server manifest. Pure — same inputs produce the same output.
 * Called once at startup from `composeServices()`.
 */
export function buildServerManifest(input: BuildServerManifestInput): ServerManifest {
  const { config, tools, resources, prompts, extensions, landing = {} } = input;

  const protocolVersions = SUPPORTED_PROTOCOL_VERSIONS;
  const latestProtocol = protocolVersions[0] ?? '2025-06-18';

  // Auto-derive repoRoot from homepage when the consumer didn't set it explicitly.
  const repoRoot = detectGitHubRepo(landing.repoRoot ?? config.mcpServerHomepage);

  const accent = landing.theme?.accent ?? '#6366f1'; // indigo-500 — used by tokens when unset
  const attribution = landing.attribution ?? true;
  const requireAuth = landing.requireAuth ?? false;

  // Source URL resolution order: per-definition override → repo-convention derivation.
  const toolList: ManifestTool[] = tools.map((def) => {
    const d = def as AnyToolDefinition & { sourceUrl?: string };
    const name = d.name ?? '';
    const inputSchema = safeToJsonSchema(d.input);
    const outputSchema = safeToJsonSchema(d.output);
    const requiredFields = extractRequiredFields(d.input);
    const override = d.sourceUrl;
    const sourceUrl = override ?? deriveSourceUrl(repoRoot, 'tools', name);

    return {
      name,
      title: d.title ?? d.annotations?.title ?? deriveTitleFromName(name),
      description: d.description ?? '',
      ...(d.annotations && { annotations: d.annotations as Record<string, unknown> }),
      isTask: d.task === true,
      isApp: isMcpAppTool(def),
      ...(d.auth && d.auth.length > 0 && { auth: d.auth }),
      ...(inputSchema !== undefined && { inputSchema }),
      ...(outputSchema !== undefined && { outputSchema }),
      requiredFields,
      ...(sourceUrl && { sourceUrl }),
    };
  });

  const resourceList: ManifestResource[] = resources.map((def) => {
    const d = def as AnyResourceDefinition & { sourceUrl?: string };
    const name = d.name ?? d.uriTemplate ?? '';
    const override = d.sourceUrl;
    const sourceUrl = override ?? deriveSourceUrl(repoRoot, 'resources', name);

    return {
      name,
      title: d.title ?? deriveTitleFromName(name),
      description: d.description ?? '',
      uriTemplate: d.uriTemplate ?? '',
      ...(d.mimeType && { mimeType: d.mimeType }),
      ...(d.annotations && { annotations: d.annotations as Record<string, unknown> }),
      ...(d.auth && d.auth.length > 0 && { auth: d.auth }),
      ...(sourceUrl && { sourceUrl }),
    };
  });

  const promptList: ManifestPrompt[] = prompts.map((def) => {
    const d = def as AnyPromptDefinition & { sourceUrl?: string };
    const name = d.name ?? '';
    const override = d.sourceUrl;
    const sourceUrl = override ?? deriveSourceUrl(repoRoot, 'prompts', name);
    const args = extractPromptArgs(d.args);

    return {
      name,
      title: deriveTitleFromName(name),
      description: d.description ?? '',
      args,
      ...(sourceUrl && { sourceUrl }),
    };
  });

  return {
    server: {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      ...(config.mcpServerDescription && { description: config.mcpServerDescription }),
      ...(config.mcpServerHomepage && { homepage: config.mcpServerHomepage }),
      environment: config.environment,
    },
    transport: {
      type: config.mcpTransportType,
      endpointPath: config.mcpHttpEndpointPath,
      sessionMode: config.mcpSessionMode,
    },
    protocol: {
      supportedVersions: protocolVersions,
      latestVersion: latestProtocol,
    },
    definitionCounts: {
      tools: tools.length,
      resources: resources.length,
      prompts: prompts.length,
    },
    capabilities: {
      logging: true,
      tools: tools.length > 0,
      resources: resources.length > 0,
      prompts: prompts.length > 0,
    },
    ...(extensions && { extensions }),
    framework: {
      name: FRAMEWORK_NAME,
      version: FRAMEWORK_VERSION,
      homepage: 'https://github.com/cyanheads/mcp-ts-core',
    },
    auth: {
      mode: config.mcpAuthMode,
      ...(config.oauthIssuerUrl && { oauthIssuer: config.oauthIssuerUrl }),
      ...(config.oauthAudience && { oauthAudience: config.oauthAudience }),
      ...(config.oauthJwksUri && { jwksUri: config.oauthJwksUri }),
      ...(config.mcpServerResourceIdentifier && {
        resourceIdentifier: config.mcpServerResourceIdentifier,
      }),
    },
    definitions: {
      tools: toolList,
      resources: resourceList,
      prompts: promptList,
    },
    landing: buildManifestLanding({
      landing,
      accent,
      repoRoot,
      requireAuth,
      attribution,
      // mcpServerName is derived from the consumer's package.json > MCP_SERVER_NAME > options.name.
      // detectNpmPackage filters to scoped/slashed names, so unscoped server names yield no link.
      packageName: config.mcpServerName,
      version: config.mcpServerVersion,
    }),
    builtAt: new Date().toISOString(),
  };
}

/** Build the derived `landing` branch of the manifest, respecting exactOptionalPropertyTypes. */
function buildManifestLanding(input: {
  landing: LandingConfig;
  accent: string;
  repoRoot: GitHubRepo | undefined;
  requireAuth: boolean;
  attribution: boolean;
  packageName: string | undefined;
  version: string;
}): ManifestLanding {
  const { landing, accent, repoRoot, requireAuth, attribution, packageName, version } = input;
  const npmPackage = detectNpmPackage(packageName);
  const changelogUrl =
    landing.changelogUrl ?? (repoRoot ? `${repoRoot.url}/blob/main/CHANGELOG.md` : undefined);

  return {
    enabled: landing.enabled !== false,
    ...(landing.tagline && { tagline: landing.tagline }),
    ...(landing.logo && { logo: landing.logo }),
    links: normalizeLinks(landing.links),
    theme: { accent },
    ...(repoRoot && { repoRoot }),
    ...(changelogUrl && { changelogUrl }),
    requireAuth,
    attribution,
    ...(npmPackage && { npmPackage }),
    preRelease: classifyPreRelease(version),
  };
}

/** Extract prompt args (name/description/required) from a Zod object. */
function extractPromptArgs(schema: unknown): ManifestPromptArg[] {
  if (!schema || typeof schema !== 'object') return [];
  try {
    const asObj = schema as {
      shape?: Record<
        string,
        {
          isOptional?: () => boolean;
          description?: string;
          _def?: { description?: string };
        }
      >;
    };
    if (!asObj.shape) return [];
    const args: ManifestPromptArg[] = [];
    for (const [name, field] of Object.entries(asObj.shape)) {
      const required = typeof field?.isOptional === 'function' ? !field.isOptional() : true;
      const description = field?.description ?? field?._def?.description;
      args.push({ name, required, ...(description && { description }) });
    }
    return args;
  } catch {
    return [];
  }
}

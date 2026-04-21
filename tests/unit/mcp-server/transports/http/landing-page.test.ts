/**
 * @fileoverview Tests for the HTML landing page renderer.
 * Covers rendering correctness, the automatic-polish derivations (GitHub link
 * cluster, pre-release pill, auth banner, tool grouping), and safety
 * invariants (escape behavior under adversarial input).
 * @module tests/mcp-server/transports/http/landing-page.test
 */

import { Hono } from 'hono';
import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import type { AppConfig } from '@/config/index.js';
import type { ManifestTool, ServerManifest } from '@/core/serverManifest.js';
import { buildServerManifest } from '@/core/serverManifest.js';
import {
  createLandingPageHandler,
  renderLandingPage,
} from '@/mcp-server/transports/http/landing-page.js';
import { ADVERSARIAL_STRINGS } from '@/testing/fuzz.js';
import { defaultServerManifest } from '../../../../helpers/fixtures.js';

vi.mock('@/utils/internal/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn((x) => ({ requestId: 'test', ...x })),
  },
}));

function stubConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    mcpServerName: 'test-server',
    mcpServerVersion: '1.0.0',
    mcpServerDescription: 'A test server',
    environment: 'test',
    mcpTransportType: 'http',
    mcpHttpEndpointPath: '/mcp',
    mcpSessionMode: 'stateless',
    mcpAuthMode: 'none',
    ...overrides,
  } as AppConfig;
}

function makeTool(name: string, extra: Partial<ManifestTool> = {}): ManifestTool {
  return {
    name,
    title: name,
    description: `Description of ${name}`,
    isTask: false,
    isApp: false,
    requiredFields: [],
    ...extra,
  };
}

describe('renderLandingPage — structure', () => {
  test('returns a complete HTML document', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  test('includes the server name in the hero', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toContain('test-mcp-server');
    expect(html).toContain('v1.0.0');
  });

  test('includes the MCP Server Card alternate link', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toContain('<link rel="alternate"');
    expect(html).toContain('/.well-known/mcp.json');
  });

  test('emits the auth-status banner', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toContain('Public access');
  });

  test('emits a "Requires OAuth" banner when auth.mode is oauth', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      auth: { mode: 'oauth', oauthIssuer: 'https://auth.example.com' },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('Requires OAuth');
    expect(html).toContain('https://auth.example.com');
  });

  test('renders the connect snippet tabs', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toContain('connect-tab-http');
    expect(html).toContain('mcp-remote');
    expect(html).toContain('curl');
  });
});

describe('renderLandingPage — polish derivations', () => {
  test('emits GitHub link cluster when repoRoot is set', () => {
    const manifest = buildServerManifest({
      config: stubConfig({
        mcpServerHomepage: 'https://github.com/acme/x',
        mcpServerVersion: '2.5.0',
      }),
      tools: [],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('https://github.com/acme/x/blob/main/CHANGELOG.md');
    expect(html).toContain('https://github.com/acme/x/issues');
    expect(html).toContain('https://github.com/acme/x/releases/tag/v2.5.0');
  });

  test('version badge links to release tag when repo is known', () => {
    const manifest = buildServerManifest({
      config: stubConfig({
        mcpServerHomepage: 'https://github.com/acme/x',
        mcpServerVersion: '1.2.3',
      }),
      tools: [],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toMatch(
      /<a class="badge badge-version" href="https:\/\/github\.com\/acme\/x\/releases\/tag\/v1\.2\.3">v1\.2\.3<\/a>/,
    );
  });

  test('renders pre-release pill when version is pre-release', () => {
    const manifest = buildServerManifest({
      config: stubConfig({ mcpServerVersion: '1.0.0-beta.1' }),
      tools: [],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('badge-pre');
    expect(html).toContain('beta');
  });

  test('does not render pre-release pill for stable versions', () => {
    const manifest = buildServerManifest({
      config: stubConfig({ mcpServerVersion: '1.0.0' }),
      tools: [],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    // Stylesheet declares `.badge-pre` regardless; assert the class isn't applied to a DOM node.
    expect(html).not.toMatch(/<span class="badge badge-pre"/);
  });

  test('includes npm registry link when scoped package name is provided', () => {
    const manifest = buildServerManifest({
      config: stubConfig({ mcpServerName: '@acme/demo' }),
      tools: [],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('npmjs.com/package/%40acme%2Fdemo');
  });

  test('renders shields-style framework badge in hero by default', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toMatch(/<div class="hero-badges">/);
    expect(html).toMatch(/<a class="badge-shield"/);
    expect(html).toContain('Built on');
    expect(html).toContain(defaultServerManifest.framework.name);
    expect(html).toContain(
      `npmjs.com/package/${encodeURIComponent(defaultServerManifest.framework.name)}`,
    );
  });

  test('hides framework badge when attribution is disabled', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      landing: { ...defaultServerManifest.landing, attribution: false },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).not.toMatch(/<div class="hero-badges">/);
    expect(html).not.toMatch(/<a class="badge-shield"/);
  });

  test('footer attribution links to both GitHub homepage and npm', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).toContain(defaultServerManifest.framework.homepage);
    expect(html).toContain(
      `npmjs.com/package/${encodeURIComponent(defaultServerManifest.framework.name)}`,
    );
    expect(html).toMatch(/footer-attrib/);
  });

  test('emits section count in headers', () => {
    const tools = [makeTool('a_one'), makeTool('a_two'), makeTool('a_three')];
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('Tools');
    expect(html).toContain('(3)');
  });

  test('groups tools by shared prefix when 3+ tools have a common prefix', () => {
    const tools = [
      makeTool('user_list'),
      makeTool('user_create'),
      makeTool('user_delete'),
      makeTool('singleton_tool'),
    ];
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('group-heading');
    expect(html).toContain('User');
    expect(html).toContain('Other');
  });

  test('does not group when fewer than 3 tools exist', () => {
    const tools = [makeTool('user_list'), makeTool('user_create')];
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    // Stylesheet has `.group-heading` rule; assert no heading element actually renders.
    expect(html).not.toMatch(/<h4 class="group-heading">/);
  });

  test('renders extensions section when extensions present', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      extensions: { 'vendor/widget': { mode: 'advanced' } },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('Extensions');
    expect(html).toContain('vendor/widget');
  });

  test('omits extensions section when none present', () => {
    const html = renderLandingPage(defaultServerManifest, 'https://example.com');
    expect(html).not.toContain('section-extensions');
  });

  test('renders tool invocation snippet with required fields', () => {
    const tool = makeTool('my_action', { requiredFields: ['target', 'mode'] });
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools: [tool] },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    // JSON interpolated through html`` is HTML-escaped — `"` becomes `&quot;`.
    expect(html).toContain('&quot;method&quot;: &quot;tools/call&quot;');
    expect(html).toContain('&quot;name&quot;: &quot;my_action&quot;');
    expect(html).toContain('&quot;target&quot;: &quot;&lt;target&gt;&quot;');
    expect(html).toContain('&quot;mode&quot;: &quot;&lt;mode&gt;&quot;');
  });

  test('renders per-tool source link when sourceUrl set', () => {
    const tool = makeTool('x', { sourceUrl: 'https://github.com/acme/x/blob/main/tool.ts' });
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools: [tool] },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('view source');
    expect(html).toContain('https://github.com/acme/x/blob/main/tool.ts');
  });

  test('omits view-source link when sourceUrl absent', () => {
    const tool = makeTool('x');
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools: [tool] },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).not.toContain('view source');
  });

  test('renders annotation pills for readOnly / destructive / openWorld / task / app', () => {
    const tools = [
      makeTool('read_tool', { annotations: { readOnlyHint: true } }),
      makeTool('destroy_tool', { annotations: { destructiveHint: true } }),
      makeTool('search_tool', { annotations: { openWorldHint: true } }),
      makeTool('long_task', { isTask: true }),
      makeTool('ui_tool', { isApp: true }),
    ];
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('pill-readonly');
    expect(html).toContain('pill-destructive');
    expect(html).toContain('pill-openworld');
    expect(html).toContain('pill-task');
    expect(html).toContain('pill-app');
  });
});

describe('renderLandingPage — degraded mode', () => {
  test('renders reduced body when degraded=true', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: {
        tools: [makeTool('hidden_tool')],
        resources: [],
        prompts: [],
      },
    };
    const html = renderLandingPage(manifest, 'https://example.com', true);
    expect(html).not.toContain('hidden_tool');
    expect(html).toContain('authenticated');
  });
});

describe('createLandingPageHandler — HTTP behavior', () => {
  test('serves HTML with proper headers (public mode)', async () => {
    const app = new Hono();
    app.get('/', createLandingPageHandler(defaultServerManifest));
    const response = await app.fetch(new Request('https://example.com/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('vary')).toBeNull();
  });

  test('emits private Cache-Control + Vary when requireAuth is set', async () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      landing: { ...defaultServerManifest.landing, requireAuth: true },
    };
    const app = new Hono();
    app.get('/', createLandingPageHandler(manifest));
    const response = await app.fetch(new Request('https://example.com/'));
    expect(response.headers.get('cache-control')).toBe('private, max-age=60');
    expect(response.headers.get('vary')).toBe('Authorization');
  });

  test('serves full body to authenticated callers when gated', async () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      landing: { ...defaultServerManifest.landing, requireAuth: true },
      definitions: {
        tools: [makeTool('hidden')],
        resources: [],
        prompts: [],
      },
    };
    const app = new Hono();
    app.get('/', createLandingPageHandler(manifest));
    const response = await app.fetch(
      new Request('https://example.com/', { headers: { Authorization: 'Bearer x' } }),
    );
    const body = await response.text();
    expect(body).toContain('hidden');
  });

  test('serves degraded body to unauthenticated callers when gated', async () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      landing: { ...defaultServerManifest.landing, requireAuth: true },
      definitions: {
        tools: [makeTool('hidden_tool')],
        resources: [],
        prompts: [],
      },
    };
    const app = new Hono();
    app.get('/', createLandingPageHandler(manifest));
    const response = await app.fetch(new Request('https://example.com/'));
    const body = await response.text();
    // The tool's card anchor shouldn't render when degraded.
    expect(body).not.toContain('tool-hidden_tool');
    expect(body).not.toContain('Description of hidden_tool');
  });
});

describe('renderLandingPage — safety', () => {
  test('escapes adversarial strings in server name', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      server: { ...defaultServerManifest.server, name: '<script>alert(1)</script>' },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('escapes adversarial strings in tool descriptions', () => {
    const evil = '"><img src=x onerror=alert(1)>';
    const tool = makeTool('x', { description: evil });
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools: [tool] },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  test.each(ADVERSARIAL_STRINGS)('survives adversarial string: %s', (evil) => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      server: { ...defaultServerManifest.server, name: evil, description: evil },
      landing: { ...defaultServerManifest.landing, tagline: evil },
      definitions: {
        tools: [makeTool(evil || 'x', { description: evil })],
        resources: [],
        prompts: [],
      },
    };
    const html = renderLandingPage(manifest, 'https://example.com');

    // Strip our own legitimate scripts (copy helper + JSON-LD block); those
    // are known-safe and contain `<script>` by design.
    const scrubbed = html
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
      .replace(/<script>[\s\S]*?<\/script>/g, '');

    // After scrubbing, no further `<script` element may exist.
    expect(scrubbed).not.toMatch(/<script[\s>]/i);

    // When the adversarial payload contains `<`, it must be escaped in the
    // rendered output — no literal `<script` or `<img` injection.
    if (/<(script|img|iframe|svg|object|embed)/i.test(evil)) {
      expect(scrubbed).not.toMatch(/<(script|img|iframe|svg|object|embed)[\s>]/i);
    }

    // Document structure is preserved.
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  test('escapes accent color input', () => {
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      landing: {
        ...defaultServerManifest.landing,
        theme: { accent: `red; } body { background: red; /* attack */` },
      },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    // The accent is written into a CSS var — content-escaped, not CSS-safe,
    // but the HTML escape prevents </style> from being injected.
    expect(html).not.toContain('</style><script>');
  });
});

describe('renderLandingPage — tool schema preview and args', () => {
  test('renders input schema in collapsible details', () => {
    const tool = makeTool('t', {
      inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
    });
    const manifest: ServerManifest = {
      ...defaultServerManifest,
      definitions: { ...defaultServerManifest.definitions, tools: [tool] },
    };
    const html = renderLandingPage(manifest, 'https://example.com');
    expect(html).toContain('<details>');
    expect(html).toContain('Input schema');
  });

  test('preserves built schema data through Zod → JSON Schema path', () => {
    const manifest = buildServerManifest({
      config: stubConfig(),
      tools: [
        {
          name: 'my_tool',
          description: 'x',
          input: z.object({
            q: z.string().describe('query'),
            limit: z.number().optional(),
          }),
          output: z.object({ r: z.string() }),
          handler: async () => ({ r: '' }),
        },
      ] as Parameters<typeof buildServerManifest>[0]['tools'],
      resources: [],
      prompts: [],
    });
    const html = renderLandingPage(manifest, 'https://example.com');
    // `"q"` → `&quot;q&quot;` after HTML-escaping through html``.
    expect(html).toContain('&quot;q&quot;');
    expect(html).toContain('&quot;limit&quot;');
  });
});

/**
 * @fileoverview Extensions section — rendered when SEP-2133 extensions are
 * advertised in `serverInfo.capabilities`. Each extension key gets a card
 * with a JSON preview of its config.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/extensions
 */

import { html, type SafeHtml } from '@/utils/formatting/html.js';

import { renderSectionHeading } from '../primitives.js';

export function renderExtensionsSection(extensions: Record<string, object> | undefined): SafeHtml {
  if (!extensions || Object.keys(extensions).length === 0) return html``;
  const entries = Object.entries(extensions);
  return html`
    <section aria-labelledby="section-extensions">
      ${renderSectionHeading('section-extensions', 'Extensions', entries.length)}
      <div class="card-grid">
        ${entries.map(
          ([key, value]) => html`
            <article class="card ext-card">
              <div class="card-head">
                <h3 class="card-title ext-key">${key}</h3>
              </div>
              <pre class="ext-preview"><code>${JSON.stringify(value, null, 2)}</code></pre>
            </article>
          `,
        )}
      </div>
    </section>
  `;
}

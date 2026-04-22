/**
 * @fileoverview Inlined copy-to-clipboard script. Single delegated click
 * handler triggered by any element carrying `[data-copy]`; the copy target is
 * either a CSS selector (`[data-copy-target]`) or the literal `data-copy`
 * value. Renders under 1 KB so it ships inline with the page.
 *
 * @module src/mcp-server/transports/http/landing-page/assets/copy-script
 */

import { type SafeHtml, unsafeRaw } from '@/utils/formatting/html.js';

export function renderCopyScript(): SafeHtml {
  const js = `
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-copy]');
  if (!btn) return;
  var selector = btn.getAttribute('data-copy-target');
  var text = '';
  if (selector) {
    var node = document.querySelector(selector);
    if (node) text = node.textContent || '';
  } else {
    text = btn.getAttribute('data-copy') || '';
  }
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(function() {
    var prev = btn.textContent;
    btn.setAttribute('data-copied', 'true');
    btn.textContent = 'Copied';
    setTimeout(function() {
      btn.removeAttribute('data-copied');
      btn.textContent = prev;
    }, 1500);
  });
});`;
  return unsafeRaw(`<script>${js}</script>`);
}

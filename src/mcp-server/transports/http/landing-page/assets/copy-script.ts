/**
 * @fileoverview Inlined client-side scripts for the landing page. Two
 * delegated handlers, both keyed by data attributes:
 *
 *  - Copy-to-clipboard: any element carrying `[data-copy]` triggers a copy
 *    of the target's `textContent` (CSS selector via `[data-copy-target]`)
 *    or the literal `data-copy` value.
 *  - Tool filtering: chip clicks toggle a mutability filter, the search
 *    input filters by `data-name` + indexed `data-search` substring, and
 *    cards/groups update via `hidden`. No framework, no transitions,
 *    fully accessible (chips use `aria-pressed`).
 *
 * The whole bundle stays well under 2 KB so it ships inline alongside the
 * page HTML.
 *
 * @module src/mcp-server/transports/http/landing-page/assets/copy-script
 */

import { type SafeHtml, unsafeRaw } from '@/utils/formatting/html.js';

export function renderCopyScript(): SafeHtml {
  const js = `
(function() {
  // ---------- Copy to clipboard ----------
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
  });

  // ---------- Tool filter + search ----------
  var section = document.querySelector('[data-tools-section]');
  if (!section) return;
  var cards = Array.prototype.slice.call(section.querySelectorAll('[data-tool-card]'));
  if (cards.length === 0) return;
  var chips = Array.prototype.slice.call(section.querySelectorAll('[data-filter-mutability]'));
  var searchInput = section.querySelector('[data-tool-search]');
  var groups = Array.prototype.slice.call(section.querySelectorAll('[data-group]'));
  var grids = Array.prototype.slice.call(section.querySelectorAll('[data-grid]'));
  var emptyState = section.querySelector('.tools-empty');

  var activeMutability = 'all';
  var query = '';

  function apply() {
    var visibleCount = 0;
    var perGroup = Object.create(null);
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var m = card.getAttribute('data-mutability') || '';
      var search = card.getAttribute('data-search') || '';
      var matchesMutability = activeMutability === 'all' || m === activeMutability;
      var matchesSearch = query === '' || search.indexOf(query) !== -1;
      var visible = matchesMutability && matchesSearch;
      card.hidden = !visible;
      if (visible) {
        visibleCount++;
        perGroup[m] = (perGroup[m] || 0) + 1;
      }
    }
    // Hide group headings + grids whose buckets are now empty.
    for (var g = 0; g < groups.length; g++) {
      var key = groups[g].getAttribute('data-group');
      groups[g].hidden = !perGroup[key];
    }
    for (var k = 0; k < grids.length; k++) {
      var gk = grids[k].getAttribute('data-grid');
      grids[k].hidden = !perGroup[gk];
    }
    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  for (var c = 0; c < chips.length; c++) {
    chips[c].addEventListener('click', function(ev) {
      var target = ev.currentTarget;
      var value = target.getAttribute('data-filter-mutability') || 'all';
      activeMutability = value;
      for (var j = 0; j < chips.length; j++) {
        var pressed = chips[j] === target;
        chips[j].setAttribute('aria-pressed', pressed ? 'true' : 'false');
      }
      apply();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function(ev) {
      query = (ev.currentTarget.value || '').trim().toLowerCase();
      apply();
    });
  }
})();`;
  return unsafeRaw(`<script>${js}</script>`);
}

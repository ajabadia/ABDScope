/**
 * ABDScope Mount DOM Builders
 * ===========================
 * Stateless HTML string builders for the shared scope shell (header, layout
 * buttons, toolbar buttons, VU column). Kept separate from MountBase so every
 * mount file respects the 200-code-line budget.
 */

import { parseLaneCount } from './mountLayout.js';

/** Layout switcher buttons ([1] [2] [3] [4]), mirroring maxLanes. */
export function buildLayoutGroupHtml({ maxLanes, layout }) {
  const activeCount = parseLaneCount(layout, maxLanes);
  if (maxLanes <= 1) {
    return `<button class="abd-scope-layout-btn active" data-layout="1" disabled title="Single lane configured">1</button>`;
  }
  let html = '';
  for (let i = 1; i <= maxLanes; ++i) {
    const isActive = activeCount === i;
    html += `<button class="abd-scope-layout-btn ${isActive ? 'active' : ''}" data-layout="${i}">${i}</button>`;
  }
  return html;
}

/** Global FREEZE / Snapshot toolbar buttons. */
export function buildToolButtonsHtml({ showFreeze, showSnapshot }) {
  let html = '';
  if (showFreeze) {
    html += '<button class="abd-scope-freeze-btn" id="scope-freeze-btn">FREEZE</button>';
  }
  if (showSnapshot !== false) {
    html += `
      <button class="abd-scope-snapshot-btn" id="scope-snapshot-btn" title="Capture PNG Snapshot">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    `;
  }
  return html;
}

/** Full header markup (title, layout switcher, tools, optional close button). */
export function buildHeaderHtml({
  options, maxLanes, layout,
  always = false, dragHandle = false, closeButton = false, titleFallback = 'TELEMETRY'
}) {
  const showHeader = always || options.title
    || options.showFreeze || options.showLayoutSwitcher !== false;
  if (!showHeader) return '';

  const closeBtn = closeButton
    ? `<button class="abd-scope-close-btn" title="Close Scope" aria-label="Close">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
           <line x1="18" y1="6" x2="6" y2="18"/>
           <line x1="6" y1="6" x2="18" y2="18"/>
         </svg>
       </button>`
    : '';

  return `
    <div class="abd-scope-header${dragHandle ? ' abd-scope-drag-handle' : ''}">
      <div class="abd-scope-title">
        <span class="abd-scope-indicator"></span>
        <span class="abd-scope-title-text">${options.title || titleFallback}</span>
      </div>
      <div class="abd-scope-controls">
        <div class="abd-scope-layout-group" title="Split View Lanes (Max: ${maxLanes})">
          ${buildLayoutGroupHtml({ maxLanes, layout })}
        </div>
        ${buildToolButtonsHtml({ showFreeze: options.showFreeze, showSnapshot: options.showSnapshot })}
        ${closeBtn}
      </div>
    </div>
  `;
}

/** Lane grid + optional VU column body shared by every mount. */
export function buildShellHtml({ showVuMeters, headerHtml }) {
  const vuDisplay = showVuMeters ? 'flex' : 'none';
  return `
    ${headerHtml}
    <div class="abd-scope-body">
      <div class="abd-scope-lanes-container"></div>
      <div class="abd-scope-vu-container" style="display: ${vuDisplay};"></div>
    </div>
  `;
}

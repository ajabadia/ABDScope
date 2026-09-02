/**
 * ABDScope Embedded Mount Strategy
 * ================================
 * Inlines the visualizer directly into a synthesizer panel or dashboard container.
 * Manages responsive ResizeObserver and auto-collapsing mode tabs.
 *
 * Constraints:
 * - Pure DOM mount wrapper, zero audio processing logic.
 * - Under 150 lines of code (Single Responsibility Principle).
 */

export class EmbeddedMount {
  /**
   * @param {HTMLElement|string} container - Target container element or ID
   * @param {Object} options - Mount options (enabledModes, showVuMeters, etc.)
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!this.container) {
      throw new Error('[ABDScope:EmbeddedMount] Target container element not found');
    }

    this.options = options;
    this.onModeSelect = options.onModeSelect || (() => {});
    this.onResize = options.onResize || (() => {});
    this.onFreezeToggle = options.onFreezeToggle || (() => {});

    this.wrapper = null;
    this.canvas = null;
    this.vuContainer = null;
    this.tabsContainer = null;
    this.resizeObserver = null;
    this.isDestroyed = false;

    this._createDOM();
    this._initResizeObserver();
  }

  _createDOM() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'abd-scope-root abd-scope-embedded';

    const enabledModes = this.options.enabledModes || ['oscilloscope'];
    const showHeader = enabledModes.length > 1 || this.options.title || this.options.showFreeze;

    let headerHtml = '';
    if (showHeader) {
      headerHtml = `
        <div class="abd-scope-header">
          <div class="abd-scope-title">
            <span class="abd-scope-indicator"></span>
            <span class="abd-scope-title-text">${this.options.title || 'TELEMETRY'}</span>
            <span class="abd-scope-note-tag" id="scope-note-tag"></span>
          </div>
          <div class="abd-scope-tabs">
            ${enabledModes.length > 1 ? enabledModes.map(m => `
              <button class="abd-scope-tab-btn" data-mode="${m}">${m.toUpperCase()}</button>
            `).join('') : ''}
            ${this.options.showFreeze ? '<button class="abd-scope-freeze-btn" id="scope-freeze-btn">FREEZE</button>' : ''}
          </div>
        </div>
      `;
    }

    this.wrapper.innerHTML = `
      ${headerHtml}
      <div class="abd-scope-body">
        <canvas class="abd-scope-canvas"></canvas>
        <div class="abd-scope-vu-container" style="display: ${this.options.showVuMeters ? 'flex' : 'none'};"></div>
      </div>
    `;

    this.container.appendChild(this.wrapper);
    this.canvas = this.wrapper.querySelector('.abd-scope-canvas');
    this.vuContainer = this.wrapper.querySelector('.abd-scope-vu-container');
    this.tabsContainer = this.wrapper.querySelector('.abd-scope-tabs');
    this.noteTag = this.wrapper.querySelector('#scope-note-tag');

    // Bind tab clicks
    if (this.tabsContainer) {
      this.tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.abd-scope-tab-btn');
        if (btn) {
          const mode = btn.dataset.mode;
          this.setActiveTab(mode);
          this.onModeSelect(mode);
        }
        if (e.target.id === 'scope-freeze-btn') {
          const isFrozen = e.target.classList.toggle('active');
          e.target.textContent = isFrozen ? 'RESUME' : 'FREEZE';
          this.onFreezeToggle(isFrozen);
        }
      });
    }

    if (this.options.defaultMode) {
      this.setActiveTab(this.options.defaultMode);
    }
  }

  setActiveTab(modeName) {
    if (!this.tabsContainer) return;
    const btns = this.tabsContainer.querySelectorAll('.abd-scope-tab-btn');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeName);
    });
  }

  setNoteTag(text) {
    if (this.noteTag) {
      this.noteTag.textContent = text || '';
      this.noteTag.style.display = text ? 'inline-block' : 'none';
    }
  }

  _initResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.isDestroyed || !entries[0]) return;
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        this.onResize(rect.width, rect.height, dpr);
      }
    });

    const bodyElem = this.wrapper.querySelector('.abd-scope-body') || this.wrapper;
    this.resizeObserver.observe(bodyElem);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.wrapper = null;
    this.canvas = null;
    this.container = null;
    this.onModeSelect = null;
    this.onResize = null;
    this.onFreezeToggle = null;
  }
}

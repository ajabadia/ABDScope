/**
 * ABDScope Floating Modal Mount
 * =============================
 * Renders the scope inside a draggable, resizable, floating desktop modal with close button,
 * multi-mode tab navigation, and multi-tap telemetry selection.
 *
 * Constraints:
 * - Pure view coordinator, under 180 lines of code.
 */

export class FloatingMount {
  constructor(options = {}) {
    this.options = options;
    this.isOpen = false;
    this.isDestroyed = false;

    this.onModeSelect = options.onModeSelect || (() => {});
    this.onResize = options.onResize || (() => {});
    this.onClose = options.onClose || (() => {});
    this.onFreezeToggle = options.onFreezeToggle || (() => {});
    this.onSnapshot = options.onSnapshot || (() => {});
    this.onTapChange = options.onTapChange || (() => {});

    this.widget = null;
    this.canvas = null;
    this.tabsContainer = null;
    this.tapSelect = null;
    this.resizeObserver = null;

    this._createDOM();
    this._initDragging();
    this._initResizeObserver();
  }

  _createDOM() {
    this.widget = document.createElement('div');
    this.widget.className = 'abd-scope-root abd-scope-floating';
    this.widget.style.display = 'none';

    const enabledModes = this.options.enabledModes || ['oscilloscope', 'spectrum'];
    const hasTaps = this.options.availableTaps && this.options.availableTaps.length > 1;
    const title = this.options.title || 'OSCILLOSCOPE & SPECTRUM';

    this.widget.innerHTML = `
      <div class="abd-scope-header abd-scope-drag-handle">
        <div class="abd-scope-header-top">
          <div class="abd-scope-title">
            <span class="abd-scope-indicator"></span>
            <span class="abd-scope-title-text">${title}</span>
            <span class="abd-scope-note-tag" id="scope-note-tag"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${hasTaps ? `
              <select class="abd-scope-tap-select" id="scope-tap-select" title="Telemetry Tap">
                ${this.options.availableTaps.map(t => `
                  <option value="${t.id}" ${t.id === (this.options.defaultTap || this.options.availableTaps[0].id) ? 'selected' : ''}>
                    ${t.name || t.id}
                  </option>
                `).join('')}
              </select>
            ` : ''}
            <button class="abd-scope-close-btn" title="Close Scope" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="abd-scope-header-bottom">
          <div class="abd-scope-tabs">
            ${enabledModes.map(m => `
              <button class="abd-scope-tab-btn" data-mode="${m}">${m.toUpperCase()}</button>
            `).join('')}
          </div>
          <div class="abd-scope-actions">
            ${this.options.showFreeze ? '<button class="abd-scope-freeze-btn" id="scope-freeze-btn">FREEZE</button>' : ''}
            ${this.options.showSnapshot !== false ? `
              <button class="abd-scope-snapshot-btn" id="scope-snapshot-btn" title="Capture PNG Snapshot">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="abd-scope-body">
        <canvas class="abd-scope-canvas" width="450" height="180"></canvas>
      </div>
    `;

    const targetContainer = this.options.containerId
      ? document.getElementById(this.options.containerId) || document.body
      : document.body;

    targetContainer.appendChild(this.widget);
    this.canvas = this.widget.querySelector('.abd-scope-canvas');
    this.tabsContainer = this.widget.querySelector('.abd-scope-tabs');
    this.tapSelect = this.widget.querySelector('#scope-tap-select');
    this.noteTag = this.widget.querySelector('#scope-note-tag');

    // Controls
    this.widget.querySelector('.abd-scope-close-btn').onclick = () => this.close();

    this.widget.querySelector('.abd-scope-header-bottom').addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.abd-scope-tab-btn');
      if (tabBtn) {
        const mode = tabBtn.dataset.mode;
        this.setActiveTab(mode);
        this.onModeSelect(mode);
        return;
      }
      if (e.target.closest('#scope-freeze-btn')) {
        const btn = e.target.closest('#scope-freeze-btn');
        const isFrozen = btn.classList.toggle('active');
        btn.textContent = isFrozen ? 'RESUME' : 'FREEZE';
        this.onFreezeToggle(isFrozen);
        return;
      }
      if (e.target.closest('#scope-snapshot-btn')) {
        this.onSnapshot();
      }
    });

    if (this.tapSelect) {
      this.tapSelect.addEventListener('change', (e) => {
        this.onTapChange(e.target.value);
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

  setActiveTap(tapId) {
    if (this.tapSelect) {
      this.tapSelect.value = tapId;
    }
  }

  setNoteTag(text) {
    if (this.noteTag) {
      this.noteTag.textContent = text || '';
      this.noteTag.style.display = text ? 'inline-block' : 'none';
    }
  }

  _initDragging() {
    const handle = this.widget.querySelector('.abd-scope-drag-handle');
    if (!handle) return;

    let startX = 0, startY = 0;

    const onPointerMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      this.widget.style.top = `${this.widget.offsetTop + dy}px`;
      this.widget.style.left = `${this.widget.offsetLeft + dx}px`;
      this.widget.style.right = 'auto';
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.target.closest('select')) return;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  _initResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.isDestroyed || !this.isOpen || !entries[0]) return;
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        this.onResize(rect.width, rect.height, dpr);
      }
    });

    const bodyElem = this.widget.querySelector('.abd-scope-body') || this.widget;
    this.resizeObserver.observe(bodyElem);
  }

  open() {
    if (this.isDestroyed) return;
    this.isOpen = true;
    this.widget.style.display = 'flex';
    this.widget.classList.add('active');

    const rect = this.widget.querySelector('.abd-scope-body').getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.onResize(rect.width || 450, rect.height || 180, dpr);
  }

  close() {
    this.isOpen = false;
    if (this.widget) {
      this.widget.style.display = 'none';
      this.widget.classList.remove('active');
    }
    this.onClose();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  destroy() {
    this.isDestroyed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.close();
    if (this.widget && this.widget.parentNode) {
      this.widget.parentNode.removeChild(this.widget);
    }
    this.widget = null;
    this.canvas = null;
  }
}

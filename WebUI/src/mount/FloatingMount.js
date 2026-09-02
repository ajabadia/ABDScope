/**
 * ABDScope Floating Modal Mount Strategy
 * ======================================
 * Renders a draggable, floating modal widget into the DOM (e.g. document.body).
 * Provides open(), close(), and toggle() methods with header drag support.
 *
 * Constraints:
 * - Pure DOM wrapper, zero audio processing logic.
 * - Under 170 lines of code (Single Responsibility Principle).
 */

export class FloatingMount {
  /**
   * @param {Object} options - Mount configuration
   */
  constructor(options = {}) {
    this.options = options;
    this.isOpen = false;
    this.isDestroyed = false;

    this.onModeSelect = options.onModeSelect || (() => {});
    this.onResize = options.onResize || (() => {});
    this.onClose = options.onClose || (() => {});

    this.widget = null;
    this.canvas = null;
    this.tabsContainer = null;

    this._createDOM();
    this._initDragging();
  }

  _createDOM() {
    this.widget = document.createElement('div');
    this.widget.className = 'abd-scope-root abd-scope-floating';
    this.widget.style.display = 'none';

    const enabledModes = this.options.enabledModes || ['oscilloscope', 'spectrum'];
    const title = this.options.title || 'OSCILLOSCOPE & SPECTRUM';

    this.widget.innerHTML = `
      <div class="abd-scope-header abd-scope-drag-handle">
        <div class="abd-scope-title">
          <span class="abd-scope-indicator"></span>
          <span>${title}</span>
          <span class="abd-scope-note-tag" id="scope-note-tag"></span>
        </div>
        <div class="abd-scope-controls">
          <div class="abd-scope-tabs">
            ${enabledModes.map(m => `
              <button class="abd-scope-tab-btn" data-mode="${m}">${m.toUpperCase()}</button>
            `).join('')}
          </div>
          <button class="abd-scope-close-btn" title="Close Scope">&times;</button>
        </div>
      </div>
      <div class="abd-scope-body">
        <canvas class="abd-scope-canvas" width="400" height="150"></canvas>
      </div>
    `;

    const targetContainer = this.options.containerId
      ? document.getElementById(this.options.containerId) || document.body
      : document.body;

    targetContainer.appendChild(this.widget);
    this.canvas = this.widget.querySelector('.abd-scope-canvas');
    this.tabsContainer = this.widget.querySelector('.abd-scope-tabs');
    this.noteTag = this.widget.querySelector('#scope-note-tag');

    // Controls
    this.widget.querySelector('.abd-scope-close-btn').onclick = () => this.close();

    if (this.tabsContainer) {
      this.tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.abd-scope-tab-btn');
        if (btn) {
          const mode = btn.dataset.mode;
          this.setActiveTab(mode);
          this.onModeSelect(mode);
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
      if (e.target.closest('button')) return;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  open() {
    if (this.isDestroyed) return;
    this.isOpen = true;
    this.widget.style.display = 'flex';
    this.widget.classList.add('active');

    const rect = this.widget.querySelector('.abd-scope-body').getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.onResize(rect.width || 400, rect.height || 150, dpr);
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
    this.close();
    if (this.widget && this.widget.parentNode) {
      this.widget.parentNode.removeChild(this.widget);
    }
    this.widget = null;
    this.canvas = null;
    this.onModeSelect = null;
    this.onResize = null;
    this.onClose = null;
  }
}

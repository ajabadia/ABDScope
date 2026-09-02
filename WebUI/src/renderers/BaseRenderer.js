/**
 * ABDScope Base Renderer Contract
 * ===============================
 * Abstract base class and common rendering infrastructure for all scope view modes.
 * Enforces strict HiDPI backing-store scaling, theme resolution, and explicit lifecycle destruction.
 *
 * Constraints:
 * - Zero allocations in steady-state render() loops.
 * - Under 150 lines of code (Single Responsibility Principle).
 */

export class BaseRenderer {
  /**
   * @param {string} modeName - Mode identifier ('oscilloscope', 'spectrum', etc.)
   */
  constructor(modeName) {
    this.modeName = modeName;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.isDestroyed = false;
  }

  /**
   * Initialize renderer with a target HTML5 canvas.
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @param {Object} [options] - Initial configuration
   */
  init(canvas, options = {}) {
    if (!canvas) {
      throw new Error(`[ABDScope:${this.modeName}] Canvas element is required`);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.options = { ...options };
    this.isDestroyed = false;

    const w = options.width || canvas.clientWidth || 300;
    const h = options.height || canvas.clientHeight || 150;
    const dpr = options.dpr || (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    this.resize(w, h, dpr);
  }

  /**
   * Resize canvas backing store for crisp HiDPI (Retina / 4K) rendering.
   * @param {number} width - CSS width in px
   * @param {number} height - CSS height in px
   * @param {number} [dpr=1] - Window devicePixelRatio
   */
  resize(width, height, dpr = 1) {
    if (!this.canvas || this.isDestroyed) return;

    this.width = Math.max(10, Math.floor(width));
    this.height = Math.max(10, Math.floor(height));
    this.dpr = Math.max(1, dpr);

    // HiDPI Backing Store Multiplication
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Reset transform and scale to CSS pixels
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  /**
   * Clear canvas surface with optional background color.
   * @param {string} [fillColor] - CSS color or transparent
   */
  clear(fillColor = null) {
    if (!this.ctx || this.isDestroyed) return;

    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Draw standard oscilloscope reticle / grid.
   * @param {Object} [gridOptions] - Grid style options
   */
  drawGrid(gridOptions = {}) {
    if (!this.ctx || this.isDestroyed) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const divisionsX = gridOptions.divisionsX || 8;
    const divisionsY = gridOptions.divisionsY || 4;
    const color = gridOptions.color || 'rgba(255, 255, 255, 0.07)';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical divisions
    for (let x = 1; x < divisionsX; ++x) {
      const px = Math.floor((w / divisionsX) * x) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }

    // Horizontal divisions
    for (let y = 1; y < divisionsY; ++y) {
      const py = Math.floor((h / divisionsY) * y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }

    ctx.stroke();

    // Center crosshairs (subtle emphasis)
    ctx.strokeStyle = gridOptions.centerColor || 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, Math.floor(h / 2) + 0.5);
    ctx.lineTo(w, Math.floor(h / 2) + 0.5);
    ctx.moveTo(Math.floor(w / 2) + 0.5, 0);
    ctx.lineTo(Math.floor(w / 2) + 0.5, h);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Abstract render method — implemented by mode renderers.
   * @param {Object} frame - ScopeDataFrame
   * @param {Object} [options] - Mode render options
   */
  render(frame, options = {}) {
    throw new Error(`[ABDScope:${this.modeName}] render() must be implemented by subclass`);
  }

  /**
   * Clean up resources and unbind canvas.
   */
  destroy() {
    this.isDestroyed = true;
    this.canvas = null;
    this.ctx = null;
    this.options = null;
  }
}

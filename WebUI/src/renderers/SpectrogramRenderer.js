/**
 * ABDScope Spectrogram / Waterfall Renderer
 * ==========================================
 * Time-Frequency 2D density waterfall cascade using logarithmic frequency mapping
 * and a high-performance scrolling ImageData heat map.
 *
 * Constraints:
 * - Zero allocations in steady-state render() loops.
 * - Under 180 lines of code (Single Responsibility Principle).
 */

import { BaseRenderer } from './BaseRenderer.js';

const MIN_FREQ = 20.0;
const MAX_FREQ = 20000.0;
const LOG_MIN_FREQ = Math.log10(MIN_FREQ);
const LOG_MAX_FREQ = Math.log10(MAX_FREQ);
const LOG_RANGE = LOG_MAX_FREQ - LOG_MIN_FREQ;

export class SpectrogramRenderer extends BaseRenderer {
  constructor() {
    super('spectrogram');
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.minDb = -96.0;
    this.maxDb = 0.0;
  }

  init(canvas, options = {}) {
    super.init(canvas, options);
    this._initOffscreen();
  }

  resize(w, h, dpr = 1) {
    super.resize(w, h, dpr);
    this._initOffscreen();
  }

  _initOffscreen() {
    if (typeof document === 'undefined') return;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    if (this.offscreenCtx) {
      this.offscreenCtx.fillStyle = '#06090e';
      this.offscreenCtx.fillRect(0, 0, this.width, this.height);
    }
  }

  render(frame, options = {}) {
    if (!this.ctx || this.isDestroyed || !frame) return;

    const spectrumDb = frame.spectrumDb;
    const bins = spectrumDb ? spectrumDb.length : 0;
    if (bins < 8 || !this.offscreenCtx) return;

    const w = this.width;
    const h = this.height;
    const sampleRate = frame.sampleRate || 44100;
    const binWidthHz = (sampleRate / 2) / bins;

    // 1. Scroll previous offscreen canvas 2px down
    const scrollSpeed = options.speed || 2;
    this.offscreenCtx.drawImage(this.offscreenCanvas, 0, 0, w, h - scrollSpeed, 0, scrollSpeed, w, h - scrollSpeed);

    // 2. Draw new top line (1 slice)
    const imgData = this.offscreenCtx.createImageData(w, scrollSpeed);
    const data = imgData.data;
    const minDb = options.minDb ?? this.minDb;
    const maxDb = options.maxDb ?? this.maxDb;
    const dbRange = maxDb - minDb;

    for (let x = 0; x < w; ++x) {
      const normX = x / w;
      const freqHz = Math.pow(10, LOG_MIN_FREQ + normX * LOG_RANGE);
      const binIdx = Math.min(bins - 1, Math.max(0, Math.floor(freqHz / binWidthHz)));

      let db = spectrumDb[binIdx];
      if (isNaN(db) || db < minDb) db = minDb;
      if (db > maxDb) db = maxDb;

      const normY = (db - minDb) / dbRange; // 0.0 to 1.0 intensity

      // Inferno / Plasma style color gradient
      const r = Math.min(255, Math.floor(normY * normY * 300));
      const g = Math.min(255, Math.floor(Math.sin(normY * Math.PI) * 230));
      const b = Math.min(255, Math.floor((1.0 - normY) * normY * 350 + (normY > 0.8 ? 200 : 0)));

      for (let y = 0; y < scrollSpeed; ++y) {
        const offset = (y * w + x) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
      }
    }

    this.offscreenCtx.putImageData(imgData, 0, 0);

    // 3. Blit offscreen canvas to active screen
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, w, h);
  }

  destroy() {
    super.destroy();
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}

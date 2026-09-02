/**
 * ABDScope Oscilloscope Renderer
 * ==============================
 * Real-time time-domain waveform visualizer with zero-crossing stabilization.
 * Supports mono, stereo overlay, timebase scaling, and frozen frame holds.
 *
 * Constraints:
 * - Zero heap allocations in render() loop.
 * - Under 150 lines of code (Single Responsibility Principle).
 */

import { BaseRenderer } from './BaseRenderer.js';

export class OscilloscopeRenderer extends BaseRenderer {
  constructor() {
    super('oscilloscope');
    this.gain = 1.0;
    this.timebase = 1.0;
  }

  /**
   * Render time-domain waveform from ScopeDataFrame.
   * @param {Object} frame - ScopeDataFrame
   * @param {Object} [options] - Render options
   */
  render(frame, options = {}) {
    if (!this.ctx || this.isDestroyed || !frame) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const midY = Math.floor(h / 2);

    // 1. Clear with subtle background fill
    this.clear(options.bgColor || 'rgba(8, 12, 18, 0.92)');

    // 2. Reticle / Grid
    if (options.grid !== false) {
      this.drawGrid({
        divisionsX: 8,
        divisionsY: 4,
        color: options.gridColor || 'rgba(255, 255, 255, 0.06)',
        centerColor: 'rgba(255, 255, 255, 0.12)'
      });
    }

    const timeDataL = frame.timeDataL;
    const timeDataR = frame.timeDataR;
    const numSamples = frame.numSamples || timeDataL?.length || 0;
    if (numSamples === 0) return;

    const triggerOffset = frame.triggerIndex || 0;
    const visibleSamples = Math.min(numSamples - triggerOffset, Math.floor(numSamples * (options.timebase || this.timebase)));
    if (visibleSamples <= 2) return;

    const stepX = w / visibleSamples;

    // 3. Render Channel R (if stereo)
    if (timeDataR && options.channel !== 'Left') {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = options.traceR || 'var(--scope-trace-r, #ff007f)';
      ctx.beginPath();

      for (let i = 0; i < visibleSamples; ++i) {
        const sampleIdx = triggerOffset + i;
        const v = (timeDataR[sampleIdx] || 0.0) * (options.gain || this.gain);
        const y = midY - (v * midY * 0.9);
        const x = i * stepX;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Render Channel L / Mono
    if (timeDataL && options.channel !== 'Right') {
      ctx.save();
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = options.traceL || 'var(--scope-trace-l, #00c3ff)';
      ctx.beginPath();

      for (let i = 0; i < visibleSamples; ++i) {
        const sampleIdx = triggerOffset + i;
        const v = (timeDataL[sampleIdx] || 0.0) * (options.gain || this.gain);
        const y = midY - (v * midY * 0.9);
        const x = i * stepX;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

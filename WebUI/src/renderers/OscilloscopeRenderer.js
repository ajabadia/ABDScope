/**
 * ABDScope Oscilloscope Renderer
 * ==============================
 * High-performance time-domain visualizer with analog phosphor persistence,
 * stereo overlay, timebase scaling, volts/div gain, and control signal adaptation.
 *
 * Constraints:
 * - Zero allocations in steady-state render() loops.
 * - Under 180 lines of code (Single Responsibility Principle).
 */

import { BaseRenderer } from './BaseRenderer.js';

export class OscilloscopeRenderer extends BaseRenderer {
  constructor() {
    super('oscilloscope');
    this.gain = 1.0;
    this.timebase = 1.0;
    this.persistence = 0.0; // 0.0 = sharp clear, 0.8 = analog CRT phosphor trail
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
    const isControl = frame.signalType === 'control';
    const midY = isControl ? Math.floor(h * 0.8) : Math.floor(h / 2);
    const scaleY = isControl ? h * 0.7 : midY * 0.9;

    // 1. Clear or Apply Analog Phosphor Trail
    const persist = options.persistence ?? this.persistence;
    if (persist > 0.01) {
      ctx.fillStyle = `rgba(8, 12, 18, ${Math.max(0.08, 1.0 - persist)})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      this.clear(options.bgColor || 'rgba(8, 12, 18, 0.94)');
    }

    // 2. Reticle / Grid
    if (options.grid !== false) {
      this.drawGrid({
        divisionsX: 8,
        divisionsY: isControl ? 5 : 4,
        color: options.gridColor || 'rgba(255, 255, 255, 0.06)',
        centerColor: isControl ? 'transparent' : 'rgba(255, 255, 255, 0.12)'
      });
    }

    const timeDataL = frame.timeDataL;
    const timeDataR = frame.timeDataR;
    const numSamples = frame.numSamples || timeDataL?.length || 0;
    if (numSamples === 0) return;

    // Trigger offset (bypassed for CV/control signals)
    const triggerOffset = isControl ? 0 : (frame.triggerIndex || 0);
    const timebaseFactor = options.timebase || this.timebase;
    const visibleSamples = Math.min(
      numSamples - triggerOffset,
      Math.max(8, Math.floor(numSamples * timebaseFactor))
    );
    if (visibleSamples <= 2) return;

    const gainFactor = options.gain || this.gain;
    const stepX = w / (visibleSamples - 1);

    // 3. Render Channel R (if stereo audio)
    if (timeDataR && options.channel !== 'Left' && !isControl) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = options.traceR || 'var(--scope-trace-r, #ff007f)';
      ctx.beginPath();

      for (let i = 0; i < visibleSamples; ++i) {
        const v = (timeDataR[triggerOffset + i] || 0.0) * gainFactor;
        const y = midY - (v * scaleY);
        const x = i * stepX;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Render Channel L / Mono / CV Signal
    if (timeDataL && options.channel !== 'Right') {
      ctx.save();
      ctx.lineWidth = isControl ? 2.5 : 2.0;
      ctx.strokeStyle = isControl
        ? (options.traceCv || '#ffaa00')
        : (options.traceL || 'var(--scope-trace-l, #00c3ff)');
      ctx.beginPath();

      for (let i = 0; i < visibleSamples; ++i) {
        const v = (timeDataL[triggerOffset + i] || 0.0) * gainFactor;
        const y = midY - (v * scaleY);
        const x = i * stepX;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Subtle glow effect when phosphor active
      if (persist > 0.3) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

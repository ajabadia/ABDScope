/**
 * ABDScope Analyser Input Adapter
 * ===============================
 * Automatically pumps and samples a Web Audio API AnalyserNode at 60 FPS.
 * Pre-allocates Float32Arrays once to guarantee zero GC stutter.
 *
 * Constraints:
 * - Pure adapter, zero DOM dependencies.
 * - Under 150 lines (Single Responsibility Principle).
 */

import { createDataFrame } from '../frame.js';

export class AnalyserInput {
  /**
   * @param {AnalyserNode} analyser - Web Audio AnalyserNode instance
   * @param {Object} [options] - Configuration
   * @param {number} [options.sampleRate=44100] - AudioContext sample rate
   * @param {string} [options.signalType='audio'] - 'audio' | 'control'
   */
  constructor(analyser, options = {}) {
    if (!analyser) {
      throw new Error('[ABDScope:AnalyserInput] A valid AnalyserNode must be provided');
    }

    this.analyser = analyser;
    this.sampleRate = options.sampleRate ?? analyser.context?.sampleRate ?? 44100;
    this.signalType = options.signalType ?? 'audio';

    const fftSize = analyser.fftSize || 2048;
    const binCount = analyser.frequencyBinCount || (fftSize / 2);

    // Pre-allocated typed arrays (Zero-allocation during render loops)
    this.timeBuffer = new Float32Array(fftSize);
    this.freqBuffer = new Float32Array(binCount);

    this.isRunning = false;
    this.animationId = null;
    this.onFrameCallback = null;
    this._boundLoop = this._renderLoop.bind(this);
  }

  /**
   * Start sampling the AnalyserNode on animation frames.
   * @param {Function} onFrameCallback - Receives ScopeDataFrame
   */
  start(onFrameCallback) {
    if (typeof onFrameCallback !== 'function') {
      throw new Error('[ABDScope:AnalyserInput] onFrameCallback must be a function');
    }

    this.onFrameCallback = onFrameCallback;
    if (!this.isRunning) {
      this.isRunning = true;
      this._scheduleNext();
    }
  }

  /**
   * Stop sampling loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
  }

  /**
   * Capture a single frame immediately on-demand.
   * @returns {Object} ScopeDataFrame
   */
  sample() {
    if (typeof this.analyser.getFloatTimeDomainData === 'function') {
      this.analyser.getFloatTimeDomainData(this.timeBuffer);
    }
    if (this.signalType === 'audio' && typeof this.analyser.getFloatFrequencyData === 'function') {
      this.analyser.getFloatFrequencyData(this.freqBuffer);
    }

    return createDataFrame({
      signalType: this.signalType,
      sampleRate: this.sampleRate,
      timeDataL: this.timeBuffer,
      timeDataR: null,
      spectrumDb: this.signalType === 'audio' ? this.freqBuffer : null
    });
  }

  _renderLoop() {
    if (!this.isRunning) return;

    if (this.onFrameCallback) {
      const frame = this.sample();
      this.onFrameCallback(frame);
    }

    this._scheduleNext();
  }

  _scheduleNext() {
    if (typeof requestAnimationFrame === 'function') {
      this.animationId = requestAnimationFrame(this._boundLoop);
    } else {
      // Fallback for node test environments
      this.animationId = setTimeout(this._boundLoop, 16);
    }
  }

  /**
   * Explicit lifecycle cleanup to prevent memory leaks.
   */
  destroy() {
    this.stop();
    this.analyser = null;
    this.timeBuffer = null;
    this.freqBuffer = null;
    this.onFrameCallback = null;
  }
}

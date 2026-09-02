/**
 * ABDScope Data Frame Engine
 * ==========================
 * Normalizes incoming audio/telemetry packets into structured ScopeDataFrame contracts.
 * Computes RMS, Peak, and stereo Phase Correlation metrics.
 *
 * Constraints:
 * - Pure mathematical transformations, zero DOM dependencies.
 * - Under 200 lines of code (Single Responsibility Principle).
 */

import { processTrigger } from './trigger.js';

/**
 * Calculate Root-Mean-Square (RMS) amplitude of a buffer segment.
 * @param {Float32Array} buffer - Sample buffer
 * @param {number} [start=0] - Start sample index
 * @param {number} [length] - Number of samples to process
 * @returns {number} RMS amplitude (0.0 to 1.0)
 */
export function calculateRms(buffer, start = 0, length = null) {
  if (!buffer || buffer.length === 0) return 0.0;
  const len = length !== null ? Math.min(length, buffer.length - start) : buffer.length - start;
  if (len <= 0) return 0.0;

  let sumSquares = 0.0;
  const end = start + len;
  for (let i = start; i < end; ++i) {
    const s = buffer[i];
    sumSquares += s * s;
  }

  return Math.sqrt(sumSquares / len);
}

/**
 * Calculate absolute peak amplitude of a buffer segment.
 * @param {Float32Array} buffer - Sample buffer
 * @param {number} [start=0] - Start sample index
 * @param {number} [length] - Number of samples to process
 * @returns {number} Peak amplitude (0.0 to 1.0+)
 */
export function calculatePeak(buffer, start = 0, length = null) {
  if (!buffer || buffer.length === 0) return 0.0;
  const len = length !== null ? Math.min(length, buffer.length - start) : buffer.length - start;
  if (len <= 0) return 0.0;

  let max = 0.0;
  const end = start + len;
  for (let i = start; i < end; ++i) {
    const abs = Math.abs(buffer[i]);
    if (abs > max) max = abs;
  }

  return max;
}

/**
 * Compute stereo phase correlation coefficient between Left and Right channels.
 * Formula: sum(L * R) / sqrt(sum(L^2) * sum(R^2))
 * @param {Float32Array} bufferL - Left channel samples
 * @param {Float32Array} bufferR - Right channel samples
 * @param {number} [length] - Number of samples to process
 * @returns {number} Correlation coefficient [-1.0 (Anti-phase), 0.0 (Wide Stereo), +1.0 (Mono)]
 */
export function calculatePhaseCorrelation(bufferL, bufferR, length = null) {
  if (!bufferL || !bufferR) return 1.0;
  const len = length !== null
    ? Math.min(length, bufferL.length, bufferR.length)
    : Math.min(bufferL.length, bufferR.length);

  if (len <= 0) return 1.0;

  let sumLR = 0.0;
  let sumL2 = 0.0;
  let sumR2 = 0.0;

  for (let i = 0; i < len; ++i) {
    const l = bufferL[i];
    const r = bufferR[i];
    sumLR += l * r;
    sumL2 += l * l;
    sumR2 += r * r;
  }

  const denominator = Math.sqrt(sumL2 * sumR2);
  if (denominator < 0.000001) return 1.0; // Silence considered correlated

  const coeff = sumLR / denominator;
  return Math.max(-1.0, Math.min(1.0, coeff));
}

/**
 * Build and normalize a complete ScopeDataFrame from raw inputs.
 * @param {Object} raw - Raw input properties
 * @param {Float32Array} raw.timeDataL - Left or Mono time domain samples
 * @param {Float32Array} [raw.timeDataR] - Right time domain samples (optional)
 * @param {Float32Array} [raw.spectrumDb] - FFT frequency magnitudes in dB (optional)
 * @param {string} [raw.signalType='audio'] - 'audio' | 'control'
 * @param {number} [raw.sampleRate=44100] - Audio sample rate in Hz
 * @param {Object} [options] - Normalization and trigger options
 * @returns {Object} Normalized ScopeDataFrame
 */
export function createDataFrame(raw = {}, options = {}) {
  const safeRaw = raw || {};
  const safeOpts = options || {};
  const signalType = safeRaw.signalType ?? (safeOpts.signalType === 'control' ? 'control' : 'audio');
  const sampleRate = safeRaw.sampleRate ?? 44100;

  const timeDataL = raw.timeDataL instanceof Float32Array ? raw.timeDataL : new Float32Array(0);
  const timeDataR = raw.timeDataR instanceof Float32Array ? raw.timeDataR : null;
  const numSamples = timeDataL.length;

  const spectrumDb = raw.spectrumDb instanceof Float32Array ? raw.spectrumDb : null;
  const spectrumBins = spectrumDb ? spectrumDb.length : 0;

  // Trigger and Frequency Estimation
  const trigger = processTrigger(timeDataL, sampleRate, { ...options, signalType });

  // Amplitude and Phase Metrics
  const rmsL = raw.rmsL ?? calculateRms(timeDataL);
  const rmsR = raw.rmsR ?? (timeDataR ? calculateRms(timeDataR) : rmsL);
  const peakL = raw.peakL ?? calculatePeak(timeDataL);
  const peakR = raw.peakR ?? (timeDataR ? calculatePeak(timeDataR) : peakL);

  const phaseCorrelation = raw.phaseCorrelation ?? (
    timeDataR ? calculatePhaseCorrelation(timeDataL, timeDataR) : 1.0
  );

  return {
    signalType,
    timeDataL,
    timeDataR,
    numSamples,
    sampleRate,
    triggerIndex: trigger.triggerIndex,
    triggerFraction: trigger.triggerFraction ?? 0.0,
    estimatedFrequencyHz: trigger.estimatedFrequencyHz,
    detectedNoteName: trigger.detectedNoteName,
    spectrumDb,
    spectrumBins,
    rmsL,
    rmsR,
    peakL,
    peakR,
    phaseCorrelation
  };
}

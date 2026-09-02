/**
 * ABDScope Trigger Engine
 * =======================
 * Pure mathematical algorithms for zero-crossing detection with hysteresis,
 * fundamental frequency tracking, and MIDI note identification.
 *
 * Constraints:
 * - Pure functions, zero DOM dependencies, zero allocations in steady loops.
 * - Under 200 lines of code (Single Responsibility Principle).
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Detect zero-crossing index with hysteresis to prevent false triggers from noise/harmonics.
 * @param {Float32Array} buffer - PCM audio samples (-1.0 to 1.0)
 * @param {Object} [options] - Detection configuration
 * @param {number} [options.triggerLevel=0.0] - Target crossing amplitude
 * @param {number} [options.hysteresis=0.03] - Noise rejection band (+/-)
 * @param {number} [options.searchStart=0] - Start sample index
 * @param {number} [options.searchEnd] - Max sample index to search
 * @returns {number} Sample index where positive zero-crossing occurs, or 0 if not found
 */
export function findZeroCrossing(buffer, options = {}) {
  const len = buffer?.length ?? 0;
  if (len < 4) return 0;

  const triggerLevel = options.triggerLevel ?? 0.0;
  const hysteresis = Math.max(0.001, options.hysteresis ?? 0.03);
  const armThreshold = triggerLevel - hysteresis;
  const fireThreshold = triggerLevel + hysteresis;

  const start = Math.max(0, options.searchStart ?? 0);
  const end = Math.min(len - 1, options.searchEnd ?? Math.floor(len * 0.75));

  let isArmed = false;

  for (let i = start; i < end; ++i) {
    const sample = buffer[i];

    if (!isArmed) {
      if (sample < armThreshold) {
        isArmed = true;
      }
    } else {
      if (sample >= fireThreshold) {
        // Linear interpolation for sub-sample trigger precision
        const prev = buffer[i - 1];
        const denom = sample - prev;
        if (denom > 0.00001) {
          const frac = (triggerLevel - prev) / denom;
          return i - 1 + Math.max(0, Math.min(1, frac));
        }
        return i;
      }
    }
  }

  return 0;
}

/**
 * Estimate the fundamental frequency (Hz) using zero-crossing period analysis.
 * @param {Float32Array} buffer - PCM audio samples
 * @param {number} [sampleRate=44100] - Audio sample rate in Hz
 * @param {Object} [options] - Configuration
 * @returns {number} Estimated frequency in Hz (0 if silence or undetectable)
 */
export function estimateFundamentalFrequency(buffer, sampleRate = 44100, options = {}) {
  const len = buffer?.length ?? 0;
  if (len < 32 || sampleRate <= 0) return 0;

  const hysteresis = options.hysteresis ?? 0.04;
  const armThreshold = -hysteresis;
  const fireThreshold = hysteresis;

  const crossings = [];
  let isArmed = false;

  const maxSearch = Math.min(len - 1, 2048);

  for (let i = 0; i < maxSearch && crossings.length < 16; ++i) {
    const sample = buffer[i];

    if (!isArmed) {
      if (sample < armThreshold) isArmed = true;
    } else {
      if (sample >= fireThreshold) {
        const prev = buffer[i - 1];
        const frac = (sample - prev) > 0.0001 ? (0 - prev) / (sample - prev) : 0;
        crossings.push(i - 1 + Math.max(0, Math.min(1, frac)));
        isArmed = false;
      }
    }
  }

  if (crossings.length < 2) return 0;

  // Calculate average period distance between consecutive crossings
  let totalPeriod = 0;
  const numPeriods = crossings.length - 1;
  for (let i = 0; i < numPeriods; ++i) {
    totalPeriod += (crossings[i + 1] - crossings[i]);
  }

  const avgPeriodSamples = totalPeriod / numPeriods;
  if (avgPeriodSamples <= 1.0) return 0;

  const freq = sampleRate / avgPeriodSamples;
  return (freq >= 15 && freq <= 22000) ? Math.round(freq * 10) / 10 : 0;
}

/**
 * Convert frequency in Hz to nearest MIDI note name with octave (e.g. 440 Hz -> "A4").
 * @param {number} freqHz - Frequency in Hz
 * @returns {string} Formatted note name (e.g. "A4", "C#3") or empty string if invalid
 */
export function frequencyToNoteName(freqHz) {
  if (freqHz < 16.0 || freqHz > 20000.0) return '';

  const midiNum = 69 + 12 * Math.log2(freqHz / 440.0);
  const roundedMidi = Math.round(midiNum);
  if (roundedMidi < 0 || roundedMidi > 127) return '';

  const noteIdx = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  return `${NOTE_NAMES[noteIdx]}${octave}`;
}

/**
 * High-level trigger processor for a single audio frame.
 * @param {Float32Array} buffer - PCM audio buffer
 * @param {number} [sampleRate=44100] - Audio sample rate in Hz
 * @param {Object} [options] - Options (signalType, hysteresis, etc.)
 * @returns {{ triggerIndex: number, estimatedFrequencyHz: number, detectedNoteName: string }}
 */
export function processTrigger(buffer, sampleRate = 44100, options = {}) {
  if (options.signalType === 'control' || !buffer || buffer.length === 0) {
    return { triggerIndex: 0, estimatedFrequencyHz: 0, detectedNoteName: '' };
  }

  const triggerIndex = Math.floor(findZeroCrossing(buffer, options));
  const estimatedFrequencyHz = estimateFundamentalFrequency(buffer, sampleRate, options);
  const detectedNoteName = estimatedFrequencyHz > 0 ? frequencyToNoteName(estimatedFrequencyHz) : '';

  return {
    triggerIndex,
    estimatedFrequencyHz,
    detectedNoteName
  };
}

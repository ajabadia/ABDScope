# ABDScope Data Contract & Wire Protocol

> **Version:** 1.0.0  
> **Target:** C++ DSP Engine ↔ WebUI IPC Bridge / WASM

---

## 1. ScopeDataFrame Specification

The canonical data structure delivered to renderers on every visual frame:

```typescript
interface ScopeDataFrame {
  /** Signal domain type ('audio' for bipolar PCM, 'control' for unipolar/bipolar CV) */
  signalType: 'audio' | 'control';

  /** Left / Mono time domain PCM samples (-1.0 to +1.0) */
  timeDataL: Float32Array;

  /** Right time domain PCM samples (-1.0 to +1.0). Null for mono signals. */
  timeDataR: Float32Array | null;

  /** Number of valid samples in time buffers (typically 512, 1024 or 2048) */
  numSamples: number;

  /** Audio sample rate in Hz (e.g. 44100, 48000, 96000) */
  sampleRate: number;

  /** Sample index where positive zero-crossing occurred (0 if no trigger or control signal) */
  triggerIndex: number;

  /** Fundamental frequency detected in Hz (0 if undetected or control signal) */
  estimatedFrequencyHz: number;

  /** Nearest musical note name (e.g. 'A4', 'C#3') */
  detectedNoteName: string;

  /** Logarithmic or linear FFT magnitudes in dB (-96.0 to 0.0 dB). Null if not computed. */
  spectrumDb: Float32Array | null;

  /** Number of FFT frequency bins */
  spectrumBins: number;

  /** Root-Mean-Square (RMS) amplitude [0.0 to 1.0] */
  rmsL: number;
  rmsR: number;

  /** Absolute peak amplitude [0.0 to 1.0+] */
  peakL: number;
  peakR: number;

  /** Stereo phase correlation coefficient [-1.0 to +1.0] */
  phaseCorrelation: number;
}
```

---

## 2. C++ JUCE IPC Wire Protocol (JSON over Bridge)

In VST3/AU plugins using JUCE WebView2, the C++ message thread serializes frames at a fixed 30 Hz rate:

```json
{
  "type": "scopeFrame",
  "signalType": "audio",
  "timeDataL": [0.0, 0.12, 0.23, 0.31, ...],
  "timeDataR": [0.0, 0.11, 0.22, 0.30, ...],
  "numSamples": 512,
  "sampleRate": 44100,
  "rmsL": 0.34,
  "rmsR": 0.31,
  "peakL": 0.78,
  "peakR": 0.72,
  "phaseCorrelation": 0.92
}
```

### Consumption in WebUI:
```javascript
bridge.on('scopeFrame', (data) => {
  scope.pushFrame(data);
});
```

---

## 3. Web Audio API Direct Ingestion (`connectAnalyser`)

When running in browser / standalone WASM mode:
```javascript
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
scope.connectAnalyser(analyser);
```
`AnalyserInput` automatically samples the node on `requestAnimationFrame` at 60 FPS without garbage collector churn.

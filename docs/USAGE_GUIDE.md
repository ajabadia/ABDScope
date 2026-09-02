# ABDScope Developer & API Usage Guide

> **Version:** 0.1.0  
> **Module:** `@abdsynths/scope`

---

## 1. Quick Initialization

```javascript
import { createScope } from './src/scope.js';
import { OscilloscopeRenderer } from './src/renderers/OscilloscopeRenderer.js';
import { SpectrumRenderer } from './src/renderers/SpectrumRenderer.js';
import { LissajousRenderer } from './src/renderers/LissajousRenderer.js';
import { PhaseMeterRenderer } from './src/renderers/PhaseMeterRenderer.js';
import { SpectrogramRenderer } from './src/renderers/SpectrogramRenderer.js';

const scope = createScope({
  containerId: 'scope-container',
  mountMode: 'embedded', // 'embedded' | 'floating'
  title: 'MS2000 TELEMETRY',
  enabledModes: ['oscilloscope', 'spectrum', 'lissajous', 'phase', 'spectrogram'],
  defaultMode: 'oscilloscope',
  showFreeze: true,
  showSnapshot: true,
  showVuMeters: true,
  availableTaps: [
    { id: 'master', name: 'Master Out', type: 'audio' },
    { id: 'osc1', name: 'Osc 1 (DWGS)', type: 'audio' },
    { id: 'filter', name: 'Filter Out', type: 'audio' },
    { id: 'lfo1', name: 'LFO 1 (CV)', type: 'control' }
  ],
  defaultTap: 'master',
  onTapChange: (tapId) => {
    // Notify host C++ backend over IPC
    window.chrome?.webview?.postMessage({ type: 'SET_ACTIVE_TAP', tapId });
  }
});

// Register required visual modes
scope.registerRenderer('oscilloscope', new OscilloscopeRenderer());
scope.registerRenderer('spectrum', new SpectrumRenderer());
scope.registerRenderer('lissajous', new LissajousRenderer());
scope.registerRenderer('phase', new PhaseMeterRenderer());
scope.registerRenderer('spectrogram', new SpectrogramRenderer());
```

---

## 2. Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `mountMode` | `'embedded' \| 'floating'` | `'embedded'` | Inline container panel or draggable floating modal window |
| `containerId` | `string` | `''` | DOM element ID for embedded mount |
| `enabledModes` | `string[]` | `['oscilloscope']` | List of active view tabs |
| `defaultMode` | `string` | `'oscilloscope'` | Initial active view tab |
| `showFreeze` | `boolean` | `true` | Show pause / freeze button beside tabs |
| `showSnapshot` | `boolean` | `true` | Show camera PNG snapshot export button |
| `showVuMeters` | `boolean` | `false` | Show stereo vertical VU level meters beside canvas |
| `title` | `string` | `'ABDScope'` | Modal title in header |
| `availableTaps` | `Array<{id, name, type}>` | `[]` | Multi-tap telemetry probe list |
| `defaultTap` | `string` | `''` | Initial selected tap ID |
| `onTapChange` | `(tapId: string) => void` | `noop` | Callback triggered when user changes active tap probe |
| `onClose` | `() => void` | `noop` | Callback when floating modal is closed |

---

## 3. Public API Methods

### Input Data Pumping
- `scope.connectAnalyser(analysers, options)`: Connects Web Audio `AnalyserNode` or `{ analyserL, analyserR }` for 60 FPS pump.
- `scope.pushFrame(rawPacket)`: Delivers streaming C++ JSON wire-protocol frame or raw data object.

### Mode, Tap & State Management
- `scope.setMode(modeName)`: Programmatically switch active mode tab (`'oscilloscope'`, `'spectrum'`, etc.).
- `scope.setActiveTap(tapId)`: Programmatically switch active telemetry tap dropdown selection.
- `scope.captureFrame()`: Copies high-resolution PNG snapshot to OS clipboard.
- `scope.downloadFrame(filename)`: Triggers immediate browser PNG file download.

### Modal Controls (Floating Mode)
- `scope.open()`: Displays floating modal with smooth fade-in and autofocus.
- `scope.close()`: Hides floating modal and calls `onClose`.
- `scope.toggle()`: Toggles modal visibility.

### Lifecycle Cleanup
- `scope.destroy()`: Disconnects observers, stops rAF animation loops, unbinds events, removes DOM elements, and cleans up heap buffers.

---

## 4. Visual Renderers Catalog

1. **`OscilloscopeRenderer`**: Time-domain waveform visualizer with zero-crossing sub-sample phase locking, octave-adaptive cycle scaling, volts/div gain, stereo overlay, and analog CRT phosphor persistence.
2. **`SpectrumRenderer`**: Logarithmic FFT spectrum analyzer (20 Hz to 20 kHz) with dB grid (-96 to 0 dB), translucent gradient filling, and ballistic peak-hold decay (~30 dB/s).
3. **`LissajousRenderer`**: Real-time goniometer / vectorscope rotated 45° (Mid/Side) with analog phosphor persistence.
4. **`PhaseMeterRenderer`**: Stereo phase correlation meter (-1.0 to +1.0) with ballistic damping and compatibility color zones.
5. **`SpectrogramRenderer`**: Time-frequency 2D waterfall cascade scrolling continuously with theme-adaptive color palettes (`inferno`, `viridis`, `crt`, `cyberpunk`, `amber`).
6. **`VuMeterRenderer`**: Companion vertical stereo level bars with RMS gradient and peak-hold ticks.

---

## 5. Theming & Design Tokens (CSS)

ABDScope automatically adapts to host theme tokens or explicit data-attributes:

```html
<!-- Applies MS2000 Cyan Theme -->
<body data-theme="ms2000">

<!-- Applies CZ-101 Red Theme -->
<body data-theme="cz101">

<!-- Applies DeepMind Amber Theme -->
<body data-theme="deepmind">

<!-- Applies AudioLab Emerald Theme -->
<body data-theme="audiolab">
```

```css
/* Custom host override example */
:root {
  --scope-bg: #080c14;
  --scope-surface: #0f1622;
  --scope-accent: #00c3ff;
  --scope-trace-l: #00c3ff;
  --scope-trace-r: #ff007f;
  --scope-spectrum: #00e676;
  --scope-border: rgba(0, 195, 255, 0.25);
}
```

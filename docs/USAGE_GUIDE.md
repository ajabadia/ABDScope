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
  enabledModes: ['oscilloscope', 'spectrum', 'lissajous', 'phase', 'spectrogram'],
  defaultMode: 'oscilloscope',
  showFreeze: true,
  showVuMeters: true
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
| `showFreeze` | `boolean` | `true` | Show pause / freeze button |
| `showVuMeters` | `boolean` | `false` | Show stereo vertical VU level meters beside canvas |
| `title` | `string` | `'ABDScope'` | Modal title (floating mode only) |

---

## 3. Public API Methods

### Input Data Pumping
- `scope.connectAnalyser(analyserNode, options)`: Connects native Web Audio `AnalyserNode` for 60 FPS pump.
- `scope.pushFrame(rawPacket)`: Delivers C++ JSON wire-protocol frame or raw data object.

### Mode & State Management
- `scope.setMode(modeName)`: Programmatically switch active mode tab.
- `scope.captureFrame()`: Copies high-resolution PNG snapshot to OS clipboard.
- `scope.downloadFrame(filename)`: Triggers immediate browser PNG file download.

### Modal Controls (Floating Mode)
- `scope.open()`: Displays floating modal with smooth fade-in.
- `scope.close()`: Hides floating modal.
- `scope.toggle()`: Toggles modal visibility.

### Lifecycle Cleanup
- `scope.destroy()`: Disconnects observers, stops rAF animation loops, removes DOM elements, and cleans up heap buffers.

---

## 4. Visual Renderers Catalog

1. **`OscilloscopeRenderer`**: Time-domain waveform visualizer with zero-crossing hysteresis stabilization, timebase scaling, volts/div gain, stereo overlay (Cian L / Magenta R), and analog CRT phosphor persistence.
2. **`SpectrumRenderer`**: Logarithmic FFT spectrum analyzer (20 Hz to 20 kHz) with dB grid (-96 to 0 dB), translucent gradient filling, and ballistic peak-hold decay (~30 dB/s).
3. **`LissajousRenderer`**: Real-time goniometer / vectorscope rotated 45° (Mid/Side) with analog phosphor persistence.
4. **`PhaseMeterRenderer`**: Stereo phase correlation meter (-1.0 to +1.0) with ballistic damping and compatibility color zones.
5. **`SpectrogramRenderer`**: Time-frequency 2D waterfall cascade scrolling continuously with plasma/inferno color palettes.
6. **`VuMeterRenderer`**: Companion vertical stereo level bars with RMS gradient and peak-hold ticks.

---

## 5. Theming & Design Tokens (CSS)

ABDScope automatically inherits theme tokens from `ABDSharedAssets`:

```css
/* Custom host override example */
:root {
  --scope-bg: #0b0f19;
  --scope-trace-l: #00c3ff;
  --scope-trace-r: #ff007f;
  --scope-spectrum: #00e676;
  --scope-grid: rgba(255, 255, 255, 0.08);
}
```

# ABDScope Developer & API Usage Guide

> **Version:** 0.3.1  
> **Module:** `@abdsynths/scope`

---

## 1. Quick Initialization

```javascript
import { createScope } from './src/scope.js';

const scope = createScope({
  containerId: 'scope-container',
  mountMode: 'embedded', // 'embedded' | 'floating'
  title: 'MS2000 TELEMETRY',
  maxLanes: 4,           // Max simultaneous lanes allowed (default: 1)
  layout: '1',           // Initial layout: '1', '2', '3', '4'
  enabledModes: ['oscilloscope', 'spectrum', 'lissajous', 'phase', 'spectrogram'],
  defaultMode: 'oscilloscope',
  showFreeze: true,
  showSnapshot: true,
  showVuMeters: true,
  availableTaps: [
    { id: 'master', name: 'Master Out' },
    { id: 'osc1',   name: 'Osc 1 (DWGS)' },
    { id: 'filter', name: 'Filter Out' },
    { id: 'lfo1',   name: 'LFO 1 (CV)' }
  ],
  defaultTap: 'master',
  onTapChange: (tapId, laneIdx) => {
    // Notify host C++ backend over IPC
    window.chrome?.webview?.postMessage({ type: 'SET_ACTIVE_TAP', tapId, laneIdx });
  }
});
```

---

## 2. Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `mountMode` | `'embedded' \| 'floating'` | `'embedded'` | Inline container panel or draggable floating modal window |
| `containerId` | `string` | `''` | DOM element ID for embedded mount |
| `maxLanes` | `number` | `1` | Maximum number of simultaneous visual lanes supported (`1` to `4+`) |
| `layout` | `string` | `'1'` | Initial layout lane count (`'1'`, `'2'`, `'3'`, `'4'`) |
| `minLaneHeight` | `number` | `130` | Minimum vertical height in px per lane before enabling scroll |
| `enabledModes` | `string[]` | `['oscilloscope', ...]` | List of active view modes available in each lane |
| `defaultMode` | `string` | `'oscilloscope'` | Initial active mode for primary lane |
| `showFreeze` | `boolean` | `true` | Show pause / freeze button in header |
| `showSnapshot` | `boolean` | `true` | Show camera PNG snapshot export button |
| `showVuMeters` | `boolean` | `false` | Show stereo vertical VU level meters beside canvas |
| `title` | `string` | `'ABDScope'` | Modal title in header |
| `availableTaps` | `Array<{id, name}>` | `[{ id: 'master', name: 'Master Out' }]` | Multi-tap telemetry probe list from synth |
| `defaultTap` | `string` | `'master'` | Initial selected tap ID |
| `onTapChange` | `(tapId: string, laneIdx: number) => void` | `noop` | Callback triggered when a lane subscribes to a tap probe (on mount, layout change, or user change) — notify the C++ bridge so only needed taps stay active |
| `onModeSelect` | `(mode: string, laneIdx: number) => void` | `noop` | Callback triggered when user changes mode in a lane |
| `onClose` | `() => void` | `noop` | Callback when floating modal is closed |

---

## 3. Public API Methods

### Multi-Lane & 2-Column Responsive Grid
- **2-Column Responsive Grid**: Lanes utilize an intelligent 2-column CSS Grid. Panoramic modes (`OSC`, `FFT`, `WATERFALL`) occupy 2 columns (100% width) by default; compact modes (`LISS`, `PHASE`) occupy 1 column (50% width).
- **Auto-Expansion for Solitary Lanes**: If a 1-column lane sits alone on its row (no adjacent 1-column partner), it automatically expands to 2 columns (100% width) to eliminate empty gaps.
- **Intelligent Non-Duplicated Assignment**: Adding new lanes automatically picks the first unused visualization mode and signal probe (`availableTaps`), while preserving all existing lane configurations.
- **Manual Width Toggle**: `[ ½ ]` (50% half-width) vs `[ 1 ]` (100% full-width) per lane.
- `scope.setLayout('1' | '2' | '3' | '4')`: Switch active number of stacked diagnostic lanes.
- `scope.getLane(index)`: Access individual `LaneController` instance.
- `scope.setLaneConfig(index, { mode, tapId })`: Programmatically configure lane mode and input probe.
- `scope.layout`: Returns currently active layout (`'1'`, `'2'`, etc.).

### Input Data Pumping
- `scope.connectAnalyser(analysers, options)`: Connects Web Audio `AnalyserNode` or `{ analyserL, analyserR }` for 60 FPS pump.
- `scope.pushFrame(rawPacket)`: Delivers streaming C++ JSON wire-protocol frame or raw multi-tap data object.

### Mode, Tap & State Management
- `scope.setMode(modeName)`: Programmatically switch active mode on primary lane (`'oscilloscope'`, `'spectrum'`, etc.).
- `scope.setActiveTap(tapId)`: Programmatically switch active telemetry tap dropdown selection on primary lane.
- `scope.captureFrame()`: Copies high-resolution PNG snapshot to OS clipboard.
- `scope.downloadFrame(filename)`: Triggers immediate browser PNG file download.

### Modal Controls (Floating Mode)
- `scope.open()`: Displays floating modal with smooth fade-in and autofocus.
- `scope.close()`: Hides floating modal and calls `onClose`.
- `scope.toggle()`: Toggles modal visibility.

### Lifecycle Cleanup
- `scope.destroy()`: Disconnects observers, stops animation loops, unbinds events, removes DOM elements, and cleans up heap buffers.

---

## 4. Visual Renderers Catalog

1. **`OscilloscopeRenderer`**: Time-domain waveform visualizer with zero-crossing sub-sample phase locking, sub-bass adaptive hysteresis (< 140 Hz down to 20 Hz), octave-adaptive cycle scaling, and analog CRT phosphor persistence.
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

<!-- Applies AudioLab Emerald Dark Theme -->
<body data-theme="audiolab">

<!-- Applies AudioLab Clean Light Theme (Precision Lab / Sonarworks) -->
<body data-theme="audiolab-light">
```

### Dynamic Switching from C++ (`JuceWebScopeComponent`)
Themes can be set at any time from C++ via:
```cpp
scopeComponent->setTheme("audiolab-light"); // or "audiolab", "ms2000", "cz101", "deepmind"
```
The component passes the active theme in the URL query string (`?theme=...`) and synchronizes reactively on the `pageLoaded` event. The embedded `ScopeResourceProvider` automatically strips query strings and fragments before resolving binary resources, ensuring robust loading without 404 errors. Canvas renderers dynamically adapt backgrounds, reticles, and traces to match dark and light themes seamlessly.

---

## 6. Debugging & Telemetry Logs

- The production embedded host page (`WebUI/index.html`) is **silent by default**: IPC parsing errors are only logged when the host enables the debug gate **before** the page script runs:

```html
<script>window.__ABDSCOPE_DEBUG__ = true;</script>
```

- The only other `console.log` output in the project lives in the **demo harness** (`WebUI/demo/index.html`), which is a standalone test bed and is never bundled into production assets (see `docs/INTEGRATION_GUIDE.md` §7).

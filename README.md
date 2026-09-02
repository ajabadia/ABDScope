# ABDScope

> **Universal, lock-free, zero-copy audio visualizer and analysis engine** for the ABDSynths plugin ecosystem and scientific diagnostic tools.

[![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Pipeline-blue.svg)](ARCHITECTURE_SPEC.md)
[![Status](https://img.shields.io/badge/Status-Phase%201%20In%20Progress-yellow.svg)](ROADMAP.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

---

## 🚀 Features

- **Dual-Input Engine**:
  - **Direct Web Audio**: Auto-pumps `AnalyserNode` for standalone web/WASM environments.
  - **Bridge / Push**: Real-time streaming from C++ JUCE engines via 30 Hz IPC wire protocol.
- **Lock-Free Multi-Tap On-Demand**: Zero audio-thread overhead for inactive measuring points (`isTapActive` atomic flag).
- **Studio-Grade Analysis Algorithms**:
  - Zero-crossing triggering with configurable hysteresis for jitter-free waveform stabilization.
  - Logarithmic FFT spectrum analyzer (20 Hz - 20 kHz) with ballistics and peak-hold.
  - Stereo Lissajous / Goniometer ($M/S$ rotated $45^\circ$) with analog phosphor persistence.
  - Stereo Phase correlation meter & companion VU meters.
  - Pitch & fundamental frequency detector with MIDI note label display.
- **Embeddable & Floating**: Seamlessly mounts as an inline panel or a draggable floating modal widget.
- **High-DPI / Retina Ready**: Crisp, sub-millisecond drawing using `ResizeObserver` and `devicePixelRatio` scaling.
- **Zero-Copy & DRY**: Integrates across instruments using NTFS Directory Junctions and CMake subdirectories without duplicating code.

---

## 📂 Repository Structure

```text
ABDScope/
├── Source/                       # C++ Engine & JUCE wrappers
│   ├── Core/                     # Pure C++20 lock-free SPSC multi-tap collectors & DSP
│   └── JUCE/                     # Native JUCE components for ABDAudioLab
├── WebUI/                        # Modern WebUI Frontend (ES Modules)
│   ├── src/                      # Core JS engine, inputs, mounts, and renderers
│   ├── demo/                     # Standalone interactive test harness & signal generator
│   └── tests/                    # Vitest unit test suite
├── docs/                         # Integration guides and wire protocol specs
├── ARCHITECTURE_SPEC.md          # Technical architectural specification
├── ROADMAP.md                    # Milestone roadmap & DoD tracking
├── HANDOFF.md                    # Continuous context handoff document
└── CHANGELOG.md                  # Semantic release history
```

---

## 📦 Quick Start (WebUI)

```javascript
import { createScope } from './components/scope/scope.js';

// Embedded scope with oscilloscope and FFT spectrum
const scope = createScope({
  containerId: 'scope-container',
  mountMode: 'embedded',
  enabledModes: ['oscilloscope', 'spectrum'],
  defaultMode: 'oscilloscope',
  showVuMeters: true
});

// Connect to Web Audio AnalyserNode (Standalone / Web mode):
scope.connectAnalyser(myAnalyserNode);

// Or push frames from C++ JUCE IPC Bridge (Plugin mode):
bridge.on('scopeFrame', (frame) => scope.pushFrame(frame));
```

---

## 🧪 Testing

```bash
npm install
npm test
```

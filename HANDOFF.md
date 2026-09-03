# ABDScope — Developer Context & Handoff Document

> **Last Updated:** September 2, 2026  
> **Current Version:** 0.2.0-beta  
> **Status:** Phase 1 through Phase 4, Phase 6.1 & Phase 6.4 completed with 100% test passing (56/56 tests) and C++ MSVC smoke verification.

---

## 1. Project Essence & Mission

`ABDScope` is the unified, high-performance audio visualizer component for the entire `ABDSynths` instrument suite (e.g. `ABDMS2000`, `ABDCZ101`, `ABDEep`, `ABDJUNiO601`) and the scientific diagnostic suite `ABDAudioLab`.

### Core Capabilities:
1. **DRY & Zero-Copy**: Reusable via NTFS Junctions (`mklink /J`) for WebUI and CMake `add_subdirectory` for C++.
2. **Multi-Lane Responsive 2-Column Grid**: Stacked independent visual channels with auto-expansion for solitary lanes, intelligent non-duplicated mode and tap selection, manual column width toggles (`[ ½ ]` / `[ 1 ]`), per-lane Freeze (A/B reference comparison), and per-lane Snapshot.
3. **Sub-Bass Pitch Lock**: Peak-adaptive hysteresis and 4096-sample window for jitter-free trigger stabilization on deep sub-bass (< 140 Hz down to 20 Hz).
4. **Dual-Input Pipeline**: Support both native Web Audio `AnalyserNode` (standalone web/WASM) and streaming `pushFrame()` (C++ VST3 IPC bridge).
5. **Lock-Free Multi-Tap**: In C++, inactive taps have zero CPU/memory overhead (`isTapActive`).

---

## 2. Key Architecture Standards

- **File Size Constraint**: Maximum 200 lines for JS files, 300 lines for C++ files.
- **Single Responsibility Principle**: One file = one concern. Avoid bloated single-file monolithic traps.
- **Language**: 100% English for code, schemas, and comments.
- **Styling**: CSS Custom Properties only (`--scope-bg`, `--color-accent`, etc.).
- **Memory Safety**: No allocations in audio thread, explicit `destroy()` for all event listeners, rAF, observers, and nodes.

---

## 3. Milestones Accomplished

- [x] **Phase 1 (Core Engine & Web Base)**: Scaffold, trigger, frame normalizer, dual inputs, HiDPI base renderer, mounts, demo harness, wire protocol.
- [x] **Phase 2 (Fundamental Renderers)**: Oscilloscope, Logarithmic FFT Spectrum, stereo VuMeter.
- [x] **Phase 3 (Advanced Modes & Theming)**: Lissajous 45° Vectorscope, Phase Correlation Meter, Spectrogram Waterfall, Frame Capture to Clipboard/PNG, Theme Presets.
- [x] **Phase 4 (C++ Core & JUCE Lock-Free Multi-Tap)**:
  - `Source/Core/SpscRingBuffer.h`, `ScopeTap.h` & `ScopeDataCollector.h`.
  - `Source/Core/ScopeFrameSerializer.h`.
  - `Source/Core/TriggerDetector.h`.
  - `Source/JUCE/JuceScopeComponent.h`.
  - `Source/StandaloneDemo/Main.cpp` (`ABDScope Native GUI Demo.exe`).
- [x] **Phase 6.1 (Multi-Lane Responsive 2-Column Grid & Per-Lane Controls)**:
  - `LaneController` with independent canvas, mode buttons group, probe dropdown, colSpan width toggle, per-lane Freeze, and Snapshot.
  - Auto-expansion for solitary 1-column lanes (`colSpan = 2`).
  - Intelligent non-duplicated mode and tap picking on newly added lanes.
  - Responsive CSS Grid (`span 1` / `span 2`) with container query fallback on narrow viewports.
  - Dynamic `maxLanes` configuration (default: 1, demo: 4).
  - Vertical scrolling with `minLaneHeight: 130px`.
- [x] **Phase 6.4 (Sub-Bass Pitch Lock & Extended Trigger Window)**:
  - Peak-adaptive hysteresis in JS and C++20 with 4096-sample analysis buffer.

---

## 4. Next Tasks: FASE 5 (Integration into Target Projects)

When opening sessions in target projects:
- **Phase 5.1**: Integrate into `ABDMS2000` (Junction NTFS `WebUI/src/scope`, replace `OscilloscopeModal.js` and `panelScope.js`, wire C++ multi-tap in `processBlock`).
- **Phase 5.2**: Integrate into `ABDAudioLab` (CMake `add_subdirectory`, replace `LiveSpectrumAnalyzer` and `SoundIdCurvePlotter`).
- **Phase 5.3**: Rapid integration pattern for `ABDCZ101`, `ABDEep`, `ABDJUNiO601`.

---

## 5. Key Reference Documents

- [README.md](README.md): Quick start and feature summary.
- [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md): Full technical specification.
- [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md): 5-minute integration guide.
- [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md): Developer API manual.
- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md): Wire protocol & ScopeDataFrame contract.
- [ROADMAP.md](ROADMAP.md): Detailed phase breakdown and definition of done.
- [CHANGELOG.md](CHANGELOG.md): Semantic release history.

# ABDScope — Developer Context & Handoff Document

> **Last Updated:** September 2, 2026  
> **Current Phase:** Phase 1 (Core Engine & Web Base Setup)  
> **Target Version:** 0.1.0-alpha  

---

## 1. Project Essence & Mission

`ABDScope` is the unified, high-performance audio visualizer component for the entire `ABDSynths` instrument suite (e.g. `ABDMS2000`, `ABDCZ101`, `ABDEep`, `ABDJUNiO601`) and the scientific diagnostic suite `ABDAudioLab`.

### Core Goals:
1. **DRY & Zero-Copy**: Reusable via NTFS Junctions (`mklink /J`) for WebUI and CMake `add_subdirectory` for C++.
2. **Replace Placeholder/Fake Scopes**: Swap out synthetic fallback canvas loops with genuine real-time DSP data.
3. **Dual-Input Pipeline**: Support both native Web Audio `AnalyserNode` (standalone web/WASM) and streaming `pushFrame()` (C++ VST3 IPC bridge).
4. **Lock-Free Multi-Tap**: In C++, inactive taps have zero CPU/memory overhead (`isTapActive`).

---

## 2. Key Architecture Standards

- **File Size Constraint**: Maximum 200 lines for JS files, 300 lines for C++ files.
- **Single Responsibility Principle**: One file = one concern. Avoid bloated single-file monolithic traps.
- **Language**: 100% English for code, schemas, and comments.
- **Styling**: CSS Custom Properties only (`--scope-bg`, `--color-accent`, etc.). No hardcoded HEX/RGB in component JS.
- **Memory Safety**: No allocations in audio thread, explicit `destroy()` for all event listeners, rAF, observers, and nodes.

---

## 3. Current Phase & Next Tasks

- [x] **Phase 1 (Core Engine & Web Base)**: Completed (Scaffold, trigger, frame normalizer, dual inputs, HiDPI base renderer, mounts, demo harness, wire protocol).
- [x] **Phase 2 (Fundamental Renderers)**: Completed (Oscilloscope, Logarithmic FFT Spectrum, stereo VuMeter).
- [x] **Phase 3 (Advanced Modes, Theming & Extras)**: Completed:
  - [x] **Phase 3.1**: `LissajousRenderer.js` (Rotated 45° M/S Goniometer & Vectorscope with CRT phosphor).
  - [x] **Phase 3.2**: `PhaseMeterRenderer.js` (Ballistic stereo phase correlation meter).
  - [x] **Phase 3.3**: Theming presets (MS2000, CZ-101, DeepMind, AudioLab).
  - [x] **Phase 3.4**: `SpectrogramRenderer.js` (Time-frequency waterfall cascade).
  - [x] **Phase 3.5**: `exportImage.js` (`captureFrame()` to clipboard & `downloadFrame()` to PNG).

### Next Target: FASE 4 (C++ Core & JUCE Lock-Free Multi-Tap)
- [ ] **Phase 4.1**: Implement `Source/Core/ScopeTap.h` & `ScopeDataCollector.h` (C++20 lock-free SPSC multi-tap on-demand buffer).
- [ ] **Phase 4.2**: Implement `Source/Core/ScopeFrameSerializer.h` (JSON serialization & sample decimation).
- [ ] **Phase 4.3**: Implement `Source/Core/TriggerDetector.h` (Pure C++ zero-crossing detector).
- [ ] **Phase 4.4**: Implement `Source/JUCE/JuceScopeComponent.h` (Native JUCE C++ component for ABDAudioLab).
- [ ] **Phase 4.5**: Create `Source/CMakeLists.txt` (`ABDScope::ABDScopeCore` library target).
- [ ] **Phase 4.6**: Setup `docs/INTEGRATION_GUIDE.md` & `docs/USAGE_GUIDE.md`.

---

## 4. Key Reference Documents

- [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md): Full technical specification.
- [ROADMAP.md](ROADMAP.md): Detailed phase breakdown and definition of done.
- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md): Wire protocol & ScopeDataFrame contract.

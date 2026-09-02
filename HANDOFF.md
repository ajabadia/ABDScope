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

- [x] **Phase 1.1**: Repository initialization, directory structure, `package.json`, `vitest.config.js`, mandatory docs.
- [x] **Phase 1.2**: Implement `trigger.js` (hysteresis zero-crossing + pitch tracker) with full unit test suite.
- [x] **Phase 1.3**: Implement `frame.js` (ScopeDataFrame normalization, RMS, Peak, Phase correlation) with unit tests.
- [x] **Phase 1.4**: Implement dual input adapters (`AnalyserInput.js`, `PushInput.js`).
- [x] **Phase 1.5**: Implement `BaseRenderer.js` with explicit `destroy()` and HiDPI handling.
- [x] **Phase 1.6**: Implement mount strategies (`EmbeddedMount.js`, `FloatingMount.js`).
- [x] **Phase 1.7**: Implement `scope.js` main factory.
- [x] **Phase 1.8**: Standalone interactive test harness (`WebUI/demo/index.html`).
- [x] **Phase 1.9**: Wire Protocol data contract documentation (`docs/DATA_CONTRACT.md`).

### Next Target: FASE 2 (Fundamental Renderers)
- [ ] **Phase 2.1**: Complete `OscilloscopeRenderer.js` (reticle grid, timebase/volts controls, freeze, phosphor persistence, mono/stereo overlay).
- [ ] **Phase 2.2**: Implement `SpectrumRenderer.js` (logarithmic FFT 20Hz-20kHz, dB scale grid, peak-hold with exponential decay).
- [ ] **Phase 2.3**: Implement `VuMeterRenderer.js` (companion vertical stereo meter).

---

## 4. Key Reference Documents

- [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md): Full technical specification.
- [ROADMAP.md](ROADMAP.md): Detailed phase breakdown and definition of done.
- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md): Wire protocol & ScopeDataFrame contract.

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
- [x] **Phase 2 (Fundamental Renderers)**: Completed:
  - [x] **Phase 2.1**: Complete `OscilloscopeRenderer.js` with phosphor trail, stereo overlay, volts/div, and CV signal adaptations.
  - [x] **Phase 2.2**: Complete `SpectrumRenderer.js` with logarithmic FFT mapping (20 Hz - 20 kHz), gradient filling, and ballistic peak-hold.
  - [x] **Phase 2.3**: Complete `VuMeterRenderer.js` companion vertical stereo level meters.

### Next Target: FASE 3 (Advanced Modes, Theming & Extras)
- [ ] **Phase 3.1**: Implement `LissajousRenderer.js` (Goniometer / X-Y Vectorescope rotated 45° M/S with analog phosphor persistence).
- [ ] **Phase 3.2**: Implement `PhaseMeterRenderer.js` (stereo phase correlation bar).
- [ ] **Phase 3.3**: Preconfigured theme presets (cyberpunk, phosphor-crt, amber, nordic).
- [ ] **Phase 3.4**: `SpectrogramRenderer.js` (waterfall time-frequency cascade).
- [ ] **Phase 3.5**: Export frame capture to clipboard/PNG.

---

## 4. Key Reference Documents

- [ARCHITECTURE_SPEC.md](ARCHITECTURE_SPEC.md): Full technical specification.
- [ROADMAP.md](ROADMAP.md): Detailed phase breakdown and definition of done.
- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md): Wire protocol & ScopeDataFrame contract.

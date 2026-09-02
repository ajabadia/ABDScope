import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OscilloscopeRenderer } from '../src/renderers/OscilloscopeRenderer.js';
import { SpectrumRenderer } from '../src/renderers/SpectrumRenderer.js';
import { VuMeterRenderer } from '../src/renderers/VuMeterRenderer.js';
import { createDataFrame } from '../src/frame.js';

function createMockCanvas(w = 300, h = 150) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: h, configurable: true });
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    setTransform: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
  };
  canvas.getContext = vi.fn(() => ctx);
  return canvas;
}

describe('Renderers: OscilloscopeRenderer', () => {
  let canvas;
  let renderer;

  beforeEach(() => {
    canvas = createMockCanvas(300, 150);
    renderer = new OscilloscopeRenderer();
    renderer.init(canvas, { width: 300, height: 150 });
  });

  it('should initialize and resize canvas backing store with HiDPI scale', () => {
    renderer.resize(400, 200, 2);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(400);
    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('200px');
  });

  it('should render standard audio frame without throwing', () => {
    const frame = createDataFrame({
      timeDataL: new Float32Array(512).fill(0.5),
      timeDataR: new Float32Array(512).fill(-0.5)
    });

    expect(() => renderer.render(frame)).not.toThrow();
    expect(renderer.ctx.stroke).toHaveBeenCalled();
  });

  it('should render control signals (CV/LFO) with adapted scale', () => {
    const frame = createDataFrame({
      timeDataL: new Float32Array(512).fill(0.8),
      signalType: 'control'
    });

    expect(() => renderer.render(frame, { traceCv: '#ffaa00' })).not.toThrow();
    expect(renderer.ctx.stroke).toHaveBeenCalled();
  });

  it('should clean up on destroy()', () => {
    renderer.destroy();
    expect(renderer.isDestroyed).toBe(true);
    expect(renderer.canvas).toBeNull();
  });
});

describe('Renderers: SpectrumRenderer', () => {
  let canvas;
  let renderer;

  beforeEach(() => {
    canvas = createMockCanvas(300, 150);
    renderer = new SpectrumRenderer();
    renderer.init(canvas, { width: 300, height: 150 });
  });

  it('should render logarithmic spectrum with peak hold', () => {
    const spectrum = new Float32Array(512).fill(-20.0);
    spectrum[40] = -6.0; // peak at ~1.7 kHz

    const frame = createDataFrame({
      timeDataL: new Float32Array(512),
      spectrumDb: spectrum,
      sampleRate: 44100
    });

    expect(() => renderer.render(frame)).not.toThrow();
    expect(renderer.peakHoldBuffer).not.toBeNull();
    expect(renderer.peakHoldBuffer.length).toBe(300);
    expect(renderer.ctx.fill).toHaveBeenCalled();
  });

  it('should bypass spectrum rendering for control signals', () => {
    const frame = createDataFrame({
      timeDataL: new Float32Array(512),
      signalType: 'control'
    });

    expect(() => renderer.render(frame)).not.toThrow();
  });

  it('should clean up buffers on destroy()', () => {
    renderer.destroy();
    expect(renderer.isDestroyed).toBe(true);
    expect(renderer.peakHoldBuffer).toBeNull();
  });
});

describe('Renderers: VuMeterRenderer', () => {
  let container;
  let vuMeter;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vuMeter = new VuMeterRenderer(container);
    if (vuMeter.canvas) {
      const mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        setTransform: vi.fn(),
        scale: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
      };
      vuMeter.ctx = mockCtx;
    }
  });

  it('should create canvas inside container and render stereo VU levels', () => {
    const frame = createDataFrame({
      timeDataL: new Float32Array(512),
      rmsL: 0.7,
      rmsR: 0.5,
      peakL: 0.9,
      peakR: 0.8
    });

    expect(() => vuMeter.render(frame)).not.toThrow();
    expect(vuMeter.peakL).toBe(0.9);
    expect(vuMeter.peakR).toBe(0.8);
    expect(vuMeter.ctx.fillRect).toHaveBeenCalled();
  });

  it('should clean up and remove canvas on destroy()', () => {
    vuMeter.destroy();
    expect(vuMeter.isDestroyed).toBe(true);
    expect(container.querySelector('.abd-scope-vu-canvas')).toBeNull();
  });
});

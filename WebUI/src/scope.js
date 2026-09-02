/**
 * ABDScope Main Factory
 * =====================
 * Primary entry point for instantiating universal audio scopes in any ABDSynths project.
 * Decouples input ingestion, mount presentation, and view rendering.
 *
 * Constraints:
 * - Pure orchestrator, zero hardcoded rendering loops.
 * - Under 190 lines of code (Single Responsibility Principle).
 */

import { EmbeddedMount } from './mount/EmbeddedMount.js';
import { FloatingMount } from './mount/FloatingMount.js';
import { AnalyserInput } from './input/AnalyserInput.js';
import { PushInput } from './input/PushInput.js';
import { VuMeterRenderer } from './renderers/VuMeterRenderer.js';
import { copyCanvasToClipboard, downloadCanvasAsPng } from './utils/exportImage.js';

/**
 * Factory to create an ABDScope instance.
 * @param {Object} config - Configuration options
 * @returns {Object} Scope instance controller
 */
export function createScope(config = {}) {
  const mountMode = config.mountMode || 'embedded';
  const enabledModes = config.enabledModes || ['oscilloscope'];
  let currentMode = config.defaultMode || enabledModes[0] || 'oscilloscope';

  let activeInput = null;
  let isFrozen = false;
  let isDestroyed = false;
  const renderers = new Map();

  // Handle mode selection callback
  const onModeSelect = (mode) => {
    if (renderers.has(mode)) {
      currentMode = mode;
      const r = renderers.get(mode);
      if (mount.canvas) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        r.resize(mount.canvas.clientWidth || 300, mount.canvas.clientHeight || 150, dpr);
      }
    }
  };

  // Handle resize callback
  const onResize = (w, h, dpr) => {
    const r = renderers.get(currentMode);
    if (r) r.resize(w, h, dpr);
    if (vuMeter && mount.vuContainer) {
      vuMeter.resize(mount.vuContainer.clientWidth || 24, h, dpr);
    }
  };

  const onFreezeToggle = (frozen) => {
    isFrozen = frozen;
  };

  const onSnapshot = () => {
    if (mount && mount.canvas) {
      downloadCanvasAsPng(mount.canvas, 'abd-scope-capture.png');
    }
  };

  // Mount instantiation
  const mountOptions = {
    ...config,
    enabledModes,
    defaultMode: currentMode,
    onModeSelect,
    onResize,
    onFreezeToggle,
    onSnapshot
  };

  const mount = mountMode === 'floating'
    ? new FloatingMount(mountOptions)
    : new EmbeddedMount(config.containerId, mountOptions);

  const vuMeter = (config.showVuMeters && mount.vuContainer)
    ? new VuMeterRenderer(mount.vuContainer)
    : null;

  let smoothedFreq = 0;
  let lastNoteUpdateTime = 0;

  // Frame processing and dispatch
  const handleFrame = (frame) => {
    if (isDestroyed || isFrozen || !frame) return;

    if (mount.setNoteTag) {
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (frame.detectedNoteName && frame.estimatedFrequencyHz > 0) {
        if (smoothedFreq === 0) smoothedFreq = frame.estimatedFrequencyHz;
        else smoothedFreq += (frame.estimatedFrequencyHz - smoothedFreq) * 0.25;

        if (now - lastNoteUpdateTime > 100) {
          lastNoteUpdateTime = now;
          mount.setNoteTag(`${frame.detectedNoteName} (${Math.round(smoothedFreq)} Hz)`);
        }
      } else if (!frame.detectedNoteName && now - lastNoteUpdateTime > 200) {
        smoothedFreq = 0;
        lastNoteUpdateTime = now;
        mount.setNoteTag('');
      }
    }

    const renderer = renderers.get(currentMode);
    if (renderer) {
      renderer.render(frame, config.renderOptions || {});
    }

    if (vuMeter) {
      vuMeter.render(frame);
    }
  };

  // Controller API
  const instance = {
    mount,
    get currentMode() { return currentMode; },
    get isDestroyed() { return isDestroyed; },
    get isOpen() { return mount.isOpen ?? true; },

    registerRenderer(modeName, rendererInstance) {
      if (!rendererInstance) return;
      renderers.set(modeName, rendererInstance);
      if (mount.canvas) {
        rendererInstance.init(mount.canvas, config.rendererOptions || {});
      }
    },

    setMode(modeName) {
      if (renderers.has(modeName)) {
        mount.setActiveTab?.(modeName);
        onModeSelect(modeName);
      }
    },

    connectAnalyser(analyserNode, options = {}) {
      if (activeInput) activeInput.destroy();
      activeInput = new AnalyserInput(analyserNode, { ...config, ...options });
      activeInput.start(handleFrame);
      return activeInput;
    },

    pushFrame(rawPacket) {
      if (!activeInput || !(activeInput instanceof PushInput)) {
        if (activeInput) activeInput.destroy();
        activeInput = new PushInput(config);
        activeInput.start(handleFrame);
      }
      return activeInput.push(rawPacket);
    },

    async captureFrame() {
      return mount.canvas ? copyCanvasToClipboard(mount.canvas) : false;
    },

    downloadFrame(filename) {
      if (mount.canvas) downloadCanvasAsPng(mount.canvas, filename);
    },

    setActiveTap(tapId) {
      if (mount.setActiveTap) mount.setActiveTap(tapId);
      if (config.onTapChange) config.onTapChange(tapId);
    },

    open() {
      if (mount.open) mount.open();
    },

    close() {
      if (mount.close) mount.close();
    },

    toggle() {
      if (mount.toggle) mount.toggle();
    },

    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;

      if (activeInput) {
        activeInput.destroy();
        activeInput = null;
      }

      if (vuMeter) {
        vuMeter.destroy();
      }

      renderers.forEach(r => r.destroy());
      renderers.clear();

      mount.destroy();
    }
  };

  return instance;
}

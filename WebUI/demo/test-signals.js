/**
 * ABDScope Standalone Test Signal Generator
 * =========================================
 * Generates synthetic tones (Sine, Saw, Square, Triangle, Noise, FM, Mic)
 * and simulates C++ Bridge IPC packets for offline testing.
 */

export class TestSignalGenerator {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.analyser = null;
    this.osc = null;
    this.fmOsc = null;
    this.fmGain = null;
    this.noiseNode = null;
    this.micStream = null;
    this.micSource = null;

    this.waveform = 'sine';
    this.frequency = 440;
    this.level = 0.5;
    this.fmAmount = 0;
  }

  async init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.level, this.audioCtx.currentTime);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.4;

    this.masterGain.connect(this.analyser);
    this.masterGain.connect(this.audioCtx.destination);

    this._startOscillator();
    return this.analyser;
  }

  _startOscillator() {
    this._stopAllSources();
    if (!this.audioCtx) return;

    if (this.waveform === 'noise') {
      this._startNoise();
      return;
    }

    const t = this.audioCtx.currentTime;
    this.osc = this.audioCtx.createOscillator();
    this.osc.type = this.waveform;
    this.osc.frequency.setValueAtTime(this.frequency, t);

    // Optional FM Modulator
    if (this.fmAmount > 0) {
      this.fmOsc = this.audioCtx.createOscillator();
      this.fmGain = this.audioCtx.createGain();
      this.fmOsc.frequency.setValueAtTime(this.frequency * 2, t);
      this.fmGain.gain.setValueAtTime(this.fmAmount * 500, t);
      this.fmOsc.connect(this.fmGain);
      this.fmGain.connect(this.osc.frequency);
      this.fmOsc.start();
    }

    this.osc.connect(this.masterGain);
    this.osc.start();
  }

  _startNoise() {
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    this.noiseNode = this.audioCtx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.masterGain);
    this.noiseNode.start();
  }

  async startMic() {
    this._stopAllSources();
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Microphone API not supported on this browser');
      return;
    }
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.micSource.connect(this.analyser);
  }

  _stopAllSources() {
    if (this.osc) {
      try { this.osc.stop(); this.osc.disconnect(); } catch (e) {}
      this.osc = null;
    }
    if (this.fmOsc) {
      try { this.fmOsc.stop(); this.fmOsc.disconnect(); } catch (e) {}
      this.fmOsc = null;
    }
    if (this.noiseNode) {
      try { this.noiseNode.stop(); this.noiseNode.disconnect(); } catch (e) {}
      this.noiseNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  setWaveform(type) {
    this.waveform = type;
    this._startOscillator();
  }

  setFrequency(hz) {
    this.frequency = Math.max(20, Math.min(20000, hz));
    if (this.osc && this.audioCtx) {
      this.osc.frequency.setTargetAtTime(this.frequency, this.audioCtx.currentTime, 0.02);
      if (this.fmOsc) {
        this.fmOsc.frequency.setTargetAtTime(this.frequency * 2, this.audioCtx.currentTime, 0.02);
      }
    }
  }

  setLevel(level) {
    this.level = Math.max(0, Math.min(1, level));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.level, this.audioCtx.currentTime, 0.02);
    }
  }

  setFmAmount(amt) {
    this.fmAmount = Math.max(0, Math.min(1, amt));
    this._startOscillator();
  }

  /**
   * Helper to simulate a streaming C++ IPC packet.
   * @param {number} [timeMs] - Elapsed time
   * @returns {Object} Raw packet ready for scope.pushFrame()
   */
  generateSimulatedBridgePacket(timeMs = 0) {
    const numSamples = 512;
    const sampleRate = 44100;
    const timeDataL = new Float32Array(numSamples);
    const timeDataR = new Float32Array(numSamples);

    const freq = this.frequency;
    const tSec = timeMs * 0.001;

    for (let i = 0; i < numSamples; ++i) {
      const phase = 2 * Math.PI * freq * ((i / sampleRate) + tSec);
      timeDataL[i] = this.level * Math.sin(phase);
      timeDataR[i] = this.level * Math.cos(phase); // Quadrature stereo
    }

    return {
      signalType: 'audio',
      timeDataL,
      timeDataR,
      numSamples,
      sampleRate,
      rmsL: this.level * 0.7071,
      rmsR: this.level * 0.7071,
      peakL: this.level,
      peakR: this.level,
      phaseCorrelation: 0.0
    };
  }
}

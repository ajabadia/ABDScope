/**
 * ABDScope Standalone Test Signal Generator
 * =========================================
 * Generates synthetic tones (Sine, Saw, Square, Triangle, Noise, FM, Mic, True Stereo Phase)
 * and simulates continuous C++ Bridge IPC streams for testing.
 */

export class TestSignalGenerator {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.analyserL = null;
    this.analyserR = null;
    this.delayR = null;
    this.merger = null;
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
    this.stereoPhaseDeg = 0;
    this.simSampleIndex = 0;
  }

  async init() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.level, this.audioCtx.currentTime);

    this.analyserL = this.audioCtx.createAnalyser();
    this.analyserL.fftSize = 2048;
    this.analyserL.smoothingTimeConstant = 0.3;

    this.analyserR = this.audioCtx.createAnalyser();
    this.analyserR.fftSize = 2048;
    this.analyserR.smoothingTimeConstant = 0.3;

    this.delayR = this.audioCtx.createDelay(1.0);
    this.delayR.delayTime.setValueAtTime(0, this.audioCtx.currentTime);

    this.merger = this.audioCtx.createChannelMerger(2);

    this.masterGain.connect(this.analyserL);
    this.masterGain.connect(this.delayR);
    this.delayR.connect(this.analyserR);

    this.analyserL.connect(this.merger, 0, 0);
    this.analyserR.connect(this.merger, 0, 1);
    this.merger.connect(this.audioCtx.destination);

    this._startOscillator();
    this.setStereoPhase(this.stereoPhaseDeg);

    return { analyserL: this.analyserL, analyserR: this.analyserR };
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
      this.fmGain.gain.setValueAtTime(this.fmAmount * 400, t);
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
    if (!navigator.mediaDevices?.getUserMedia || !this.audioCtx) return;

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.micSource.connect(this.masterGain);
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
      this.setStereoPhase(this.stereoPhaseDeg);
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

  setStereoPhase(deg) {
    this.stereoPhaseDeg = parseFloat(deg) || 0;
    if (this.delayR && this.audioCtx && this.frequency > 0) {
      const delaySec = Math.max(0, (this.stereoPhaseDeg / 360.0) / this.frequency);
      this.delayR.delayTime.setTargetAtTime(delaySec, this.audioCtx.currentTime, 0.02);
    }
  }

  /**
   * Helper to simulate a continuous streaming C++ IPC packet.
   * @returns {Object} Raw packet ready for scope.pushFrame()
   */
  generateSimulatedBridgePacket() {
    const numSamples = 1024;
    const sampleRate = 44100;
    const timeDataL = new Float32Array(numSamples);
    const timeDataR = new Float32Array(numSamples);

    const freq = this.frequency;
    const rad = (this.stereoPhaseDeg * Math.PI) / 180.0;
    const startSample = this.simSampleIndex || 0;
    this.simSampleIndex = (startSample + numSamples) % (sampleRate * 100);

    for (let i = 0; i < numSamples; ++i) {
      const sIdx = startSample + i;
      const phase = 2 * Math.PI * freq * (sIdx / sampleRate);
      let valL = Math.sin(phase);
      let valR = Math.sin(phase + rad);

      if (this.waveform === 'sawtooth') {
        valL = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        valR = 2 * (((phase + rad) / (2 * Math.PI)) % 1) - 1;
      } else if (this.waveform === 'square') {
        valL = Math.sin(phase) >= 0 ? 0.9 : -0.9;
        valR = Math.sin(phase + rad) >= 0 ? 0.9 : -0.9;
      } else if (this.waveform === 'triangle') {
        valL = (2 / Math.PI) * Math.asin(Math.sin(phase));
        valR = (2 / Math.PI) * Math.asin(Math.sin(phase + rad));
      } else if (this.waveform === 'noise') {
        valL = (Math.random() * 2 - 1) * 0.5;
        valR = (Math.random() * 2 - 1) * 0.5;
      }

      timeDataL[i] = this.level * valL;
      timeDataR[i] = this.level * valR;
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
      phaseCorrelation: Math.cos(rad)
    };
  }
}

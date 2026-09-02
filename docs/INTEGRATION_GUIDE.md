# ABDScope Integration Guide (Zero-Copy)

> **Objective:** Connect `ABDScope` into any synthesizer plugin (`ABDMS2000`, `ABDCZ101`, `ABDEep`, `ABDJUNiO601`, `ABDAudioLab`) in under 5 minutes without code duplication.

---

## 1. WebUI Linking via NTFS Directory Junction (Zero-Copy)

From your synth's `WebUI/` folder, create a directory junction pointing to `ABDScope/WebUI`:

```cmd
:: Example for ABDMS2000:
cd D:\desarrollos\ABDSynths\ABDMS2000\WebUI\src
mklink /J scope D:\desarrollos\ABDSynths\ABDScope\WebUI\src
```

Now `import { createScope } from './scope/scope.js'` and `<link rel="stylesheet" href="./scope/scope.css">` are immediately available with live hot-reloading.

---

## 2. WebUI Instantiation (5 Lines of Code)

### Embedded Mode (Inside a synth panel or modal):
```javascript
import { createScope } from './scope/scope.js';
import { OscilloscopeRenderer } from './scope/renderers/OscilloscopeRenderer.js';
import { SpectrumRenderer } from './scope/renderers/SpectrumRenderer.js';

const scope = createScope({
  containerId: 'my-scope-container',
  mountMode: 'embedded',
  enabledModes: ['oscilloscope', 'spectrum'],
  defaultMode: 'oscilloscope',
  showFreeze: true,
  showVuMeters: true
});

scope.registerRenderer('oscilloscope', new OscilloscopeRenderer());
scope.registerRenderer('spectrum', new SpectrumRenderer());
```

### Floating Modal Mode:
```javascript
const floatingScope = createScope({
  mountMode: 'floating',
  title: 'MS2000 Oscilloscope & Spectrum Analyzer',
  enabledModes: ['oscilloscope', 'spectrum', 'lissajous', 'phase', 'spectrogram'],
  showVuMeters: true
});
// Open / close on button click
floatingScope.open();
```

---

## 3. C++ Audio Engine Tap Setup (`processBlock`)

### In `PluginProcessor.h`:
```cpp
#include "ABDScope/Source/Core/ScopeDataCollector.h"

class MySynthAudioProcessor : public juce::AudioProcessor {
public:
    abd::scope::ScopeDataCollector scopeCollector;
    abd::scope::ScopeTap* tapMainOut { nullptr };
    abd::scope::ScopeTap* tapFilterOut { nullptr };
    abd::scope::ScopeTap* tapLfo1 { nullptr };
};
```

### In `PluginProcessor.cpp` Constructor:
```cpp
MySynthAudioProcessor::MySynthAudioProcessor() {
    tapMainOut   = scopeCollector.registerTap("Main Output", abd::scope::ScopeTapType::StereoAudio);
    tapFilterOut = scopeCollector.registerTap("Filter Output", abd::scope::ScopeTapType::StereoAudio);
    tapLfo1      = scopeCollector.registerTap("LFO 1", abd::scope::ScopeTapType::ControlSignal);
}
```

### In `processBlock()` (Audio Thread — < 1 ns overhead when inactive):
```cpp
void MySynthAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) {
    juce::ScopedNoDenormals noDenormals;
    const int numSamples = buffer.getNumSamples();

    // 1. Process DSP...
    // ...

    // 2. Stream to active tap (Zero memory allocation, lock-free SPSC buffer)
    tapMainOut->writeStereo(
        buffer.getReadPointer(0),
        buffer.getReadPointer(1),
        static_cast<size_t>(numSamples)
    );
}
```

---

## 4. Bridge Serialization (Message Thread ~30 Hz)

```cpp
#include "ABDScope/Source/Core/ScopeFrameSerializer.h"

// In your WebView message / timer callback (30 FPS):
abd::scope::ScopeFrameSerializer serializer(512);
std::string jsonPacket = serializer.serializeActiveFrame(
    scopeCollector.getActiveTap(),
    getSampleRate()
);

if (!jsonPacket.empty()) {
    // Deliver to WebUI via JUCE WebView bridge:
    webView.emitEventIfBrowserIsVisible("scopeFrame", jsonPacket);
}
```

And in your JavaScript listener:
```javascript
window.__JUCE__.backend.addEventListener('scopeFrame', (jsonPacket) => {
    scope.pushFrame(jsonPacket);
});
```

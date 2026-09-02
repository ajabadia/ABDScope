# ABDScope Integration Guide (Zero-Copy)

> **Objective:** Connect `ABDScope` into any synthesizer plugin (`ABDMS2000`, `ABDCZ101`, `ABDEep`, `ABDJUNiO601`, `ABDAudioLab`) in under 5 minutes with zero code duplication, zero-copy DSP taps, and live hot-reloading.

---

## 1. WebUI Linking via NTFS Directory Junction (Zero-Copy)

From your synthesizer's `WebUI/src` folder, create a directory junction pointing directly to `ABDScope/WebUI/src`:

```cmd
:: Example for ABDMS2000:
cd D:\desarrollos\ABDSynths\ABDMS2000\WebUI\src
mklink /J scope D:\desarrollos\ABDSynths\ABDScope\WebUI\src
```

Now `import { createScope } from './scope/scope.js'` and `<link rel="stylesheet" href="./scope/scope.css">` are immediately available in your synth with live hot-reloading.

---

## 2. CMake Build Configuration (C++ Core)

In your synthesizer's `CMakeLists.txt`:

```cmake
# Add ABDScope as a subproject
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../ABDScope" ABDScope_Build)

# Link ABDScopeCore to your plugin target
target_link_libraries(ABDMS2000 PRIVATE
    ABDScope::ABDScopeCore
)
```

---

## 3. C++ Audio Engine Tap Setup (`processBlock`)

### In `PluginProcessor.h`:
```cpp
#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <Core/ScopeDataCollector.h>
#include <Core/ScopeFrameSerializer.h>

class MySynthAudioProcessor : public juce::AudioProcessor,
                              private juce::Timer
{
public:
    MySynthAudioProcessor();
    ~MySynthAudioProcessor() override;

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override;

    // Multi-tap telemetry collector
    abd::scope::ScopeDataCollector scopeCollector;
    abd::scope::ScopeTap* tapMaster { nullptr };
    abd::scope::ScopeTap* tapVoice1 { nullptr };
    abd::scope::ScopeTap* tapFilter { nullptr };
    abd::scope::ScopeTap* tapLfo1   { nullptr };

    // IPC tap switching handler called from WebView2
    void handleWebUiMessage(const juce::var& message);

private:
    void timerCallback() override; // 30 FPS message thread serializer pump
    abd::scope::ScopeFrameSerializer frameSerializer { 1024 };
};
```

### In `PluginProcessor.cpp` Constructor & Timer:
```cpp
MySynthAudioProcessor::MySynthAudioProcessor()
{
    // Register probes (inactive by default, 0 CPU cost)
    tapMaster = scopeCollector.registerTap(1, "Master Output", abd::scope::ScopeTapType::MasterOutput);
    tapVoice1 = scopeCollector.registerTap(2, "Osc 1 (DWGS)",  abd::scope::ScopeTapType::Voice1);
    tapFilter = scopeCollector.registerTap(3, "Filter Out",    abd::scope::ScopeTapType::FilterOut);
    tapLfo1   = scopeCollector.registerTap(4, "LFO 1 (CV)",    abd::scope::ScopeTapType::Lfo1);

    // Set default active tap
    scopeCollector.setActiveTap(1);

    // Start 30 FPS telemetry decimation pump on the message thread
    startTimerHz(30);
}

MySynthAudioProcessor::~MySynthAudioProcessor()
{
    stopTimer();
}

void MySynthAudioProcessor::timerCallback()
{
    // Decimate and serialize active tap to JSON wire format
    std::string jsonPacket = frameSerializer.serializeActiveFrame(
        scopeCollector.getActiveTap(),
        static_cast<float>(getSampleRate())
    );

    if (!jsonPacket.empty())
    {
        // Emit event to WebUI frontend over WebView2 IPC
        emitWebUiEvent("scopeFrame", jsonPacket);
    }
}

void MySynthAudioProcessor::handleWebUiMessage(const juce::var& message)
{
    if (message["type"].toString() == "SET_ACTIVE_TAP")
    {
        auto tapId = message["tapId"].toString();
        if (tapId == "master") scopeCollector.setActiveTap(1);
        else if (tapId == "osc1") scopeCollector.setActiveTap(2);
        else if (tapId == "filter") scopeCollector.setActiveTap(3);
        else if (tapId == "lfo1") scopeCollector.setActiveTap(4);
    }
}
```

### In `processBlock()` (Audio Thread — < 1 ns overhead when probe inactive):
```cpp
void MySynthAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;
    const size_t numSamples = static_cast<size_t>(buffer.getNumSamples());

    // 1. Process Voice / Oscillator DSP...
    // tapVoice1->writeStereo(voiceL, voiceR, numSamples);

    // 2. Process Filter DSP...
    // tapFilter->writeStereo(filterL, filterR, numSamples);

    // 3. Process Master FX & Output...
    tapMaster->writeStereo(
        buffer.getReadPointer(0),
        buffer.getReadPointer(1),
        numSamples
    );
}
```

---

## 4. WebUI Instantiation (JavaScript)

### Pattern A: Embedded Scope in Chassis Panel
```javascript
import { createScope } from './scope/scope.js';
import { OscilloscopeRenderer } from './scope/renderers/OscilloscopeRenderer.js';
import { SpectrumRenderer } from './scope/renderers/SpectrumRenderer.js';

export function initPanelScope(containerId = 'chassis-scope') {
  const scope = createScope({
    containerId,
    mountMode: 'embedded',
    title: 'MS2000 TELEMETRY',
    enabledModes: ['oscilloscope', 'spectrum'],
    defaultMode: 'oscilloscope',
    showFreeze: true,
    showSnapshot: true,
    showVuMeters: true,
    availableTaps: [
      { id: 'master', name: 'Master Out', type: 'audio' },
      { id: 'osc1', name: 'Osc 1 (DWGS)', type: 'audio' },
      { id: 'filter', name: 'Filter Out', type: 'audio' },
      { id: 'lfo1', name: 'LFO 1 (CV)', type: 'control' }
    ],
    defaultTap: 'master',
    onTapChange: (tapId) => {
      window.chrome?.webview?.postMessage({ type: 'SET_ACTIVE_TAP', tapId });
    }
  });

  scope.registerRenderer('oscilloscope', new OscilloscopeRenderer());
  scope.registerRenderer('spectrum', new SpectrumRenderer());

  // Listen for frames emitted from C++ timerCallback
  window.addEventListener('message', (e) => {
    if (e.data?.event === 'scopeFrame' && e.data?.payload) {
      scope.pushFrame(e.data.payload);
    }
  });

  return scope;
}
```

### Pattern B: Floating Modal Window
```javascript
import { createScope } from './scope/scope.js';
import { OscilloscopeRenderer } from './scope/renderers/OscilloscopeRenderer.js';
import { SpectrumRenderer } from './scope/renderers/SpectrumRenderer.js';
import { LissajousRenderer } from './scope/renderers/LissajousRenderer.js';
import { PhaseMeterRenderer } from './scope/renderers/PhaseMeterRenderer.js';
import { SpectrogramRenderer } from './scope/renderers/SpectrogramRenderer.js';

export function createScopeModal() {
  const modalScope = createScope({
    mountMode: 'floating',
    title: 'MS2000 OSCILLOSCOPE & SPECTRUM ANALYZER',
    enabledModes: ['oscilloscope', 'spectrum', 'lissajous', 'phase', 'spectrogram'],
    defaultMode: 'oscilloscope',
    showFreeze: true,
    showSnapshot: true,
    showVuMeters: true,
    availableTaps: [
      { id: 'master', name: 'Master Out', type: 'audio' },
      { id: 'osc1', name: 'Osc 1 (DWGS)', type: 'audio' },
      { id: 'filter', name: 'Filter Out', type: 'audio' },
      { id: 'lfo1', name: 'LFO 1 (CV)', type: 'control' }
    ],
    defaultTap: 'master',
    onTapChange: (tapId) => {
      window.chrome?.webview?.postMessage({ type: 'SET_ACTIVE_TAP', tapId });
    }
  });

  modalScope.registerRenderer('oscilloscope', new OscilloscopeRenderer());
  modalScope.registerRenderer('spectrum', new SpectrumRenderer());
  modalScope.registerRenderer('lissajous', new LissajousRenderer());
  modalScope.registerRenderer('phase', new PhaseMeterRenderer());
  modalScope.registerRenderer('spectrogram', new SpectrogramRenderer());

  return modalScope;
}
```

---

## 5. Theme Styling

Ensure your host HTML sets its corresponding theme attribute:

```html
<body data-theme="ms2000">
  <link rel="stylesheet" href="./scope/scope.css">
  <div id="chassis-scope" style="width: 320px; height: 140px;"></div>
</body>
```

#pragma once

#if defined(JUCE_VERSION) || __has_include(<juce_gui_extra/juce_gui_extra.h>)
#include <juce_gui_extra/juce_gui_extra.h>
#include "../Core/ScopeDataCollector.h"
#include "../Core/ScopeFrameSerializer.h"
#include "ScopeResourceProvider.h"
#include <atomic>
#include <map>
#include <vector>

namespace abd::scope {

/**
 * @brief High-performance JUCE GUI Component encapsulating ABDScope WebUI inside WebView2.
 *
 * Plug-and-play component ready for immediate integration into audio plugins, standalone
 * analyzers, and synthesizers. Handles WebView2 configuration, embedded binary resource serving,
 * IPC messaging, and 30 FPS telemetry decimation pump automatically.
 */
class JuceWebScopeComponent : public juce::Component,
                              private juce::Timer
{
public:
    explicit JuceWebScopeComponent(ScopeDataCollector& collector,
                                   double initialSampleRate = 44100.0,
                                   int refreshRateHz = 30)
        : scopeCollector(collector),
          sampleRate(initialSampleRate),
          webBrowser(juce::WebBrowserComponent::Options{}
                         .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                         .withNativeIntegrationEnabled(true)
                         .withResourceProvider(abd::scope::scopeResourceProvider)
                         .withEventListener("SET_ACTIVE_TAP", [this](const juce::var& message) {
                             if (message.hasProperty("tapId"))
                             {
                                 auto tapId = message["tapId"].toString().toStdString();
                                 int laneIdx = message.hasProperty("laneIdx") ? static_cast<int>(message["laneIdx"]) : 0;
                                 handleLaneTapChange(laneIdx, tapId);
                             }
                         }))
    {
        addAndMakeVisible(webBrowser);
        reload();

        if (refreshRateHz > 0)
            startTimerHz(refreshRateHz);
    }

    ~JuceWebScopeComponent() override
    {
        stopTimer();
    }

    void resized() override
    {
        webBrowser.setBounds(getLocalBounds());
    }

    void setSampleRate(double newSampleRate) noexcept
    {
        sampleRate.store(newSampleRate, std::memory_order_relaxed);
    }

    void selectTap(const std::string& tapName)
    {
        scopeCollector.selectTap(tapName);
    }

    void reload()
    {
        auto rootUrl = juce::WebBrowserComponent::getResourceProviderRoot();
        webBrowser.goToURL(rootUrl);
    }

    [[nodiscard]] juce::WebBrowserComponent& getWebBrowser() noexcept { return webBrowser; }

private:
    void handleLaneTapChange(int laneIdx, const std::string& tapId)
    {
        laneTaps[laneIdx] = tapId;

        // Keep all taps active that are assigned to at least one lane
        for (size_t i = 0; i < scopeCollector.getTapCount(); ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap == nullptr) continue;
            std::string slug = getTapSlug(tap);

            bool needed = false;
            for (const auto& [lane, assignedTap] : laneTaps)
            {
                if (assignedTap == slug || slug.find(assignedTap) != std::string::npos || assignedTap.find(slug) != std::string::npos)
                {
                    needed = true;
                    break;
                }
            }
            tap->setActive(needed);
        }
    }

    void timerCallback() override
    {
        const size_t count = scopeCollector.getTapCount();
        std::vector<ScopeTap*> activeTaps;
        for (size_t i = 0; i < count; ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap != nullptr && tap->isActive())
                activeTaps.push_back(tap);
        }

        if (activeTaps.empty())
            return;

        const float sr = static_cast<float>(sampleRate.load(std::memory_order_relaxed));

        if (activeTaps.size() == 1)
        {
            std::string jsonPacket = frameSerializer.serializeActiveFrame(activeTaps[0], sr);
            if (!jsonPacket.empty())
            {
                juce::String js = "if (window.__pushScopeFrame) { window.__pushScopeFrame("
                                + juce::String(jsonPacket) + "); }";
                webBrowser.evaluateJavascript(js);
            }
        }
        else
        {
            // Multi-tap bundle: { "taps": { "hardware_in": {...}, "diag_tone": {...} } }
            std::string bundle = "{\"taps\":{";
            bool first = true;
            for (auto* tap : activeTaps)
            {
                std::string tapJson = frameSerializer.serializeActiveFrame(tap, sr);
                if (!tapJson.empty())
                {
                    if (!first) bundle += ",";
                    bundle += "\"" + getTapSlug(tap) + "\":" + tapJson;
                    first = false;
                }
            }
            bundle += "}}";

            if (!first)
            {
                juce::String js = "if (window.__pushScopeFrame) { window.__pushScopeFrame("
                                + juce::String(bundle) + "); }";
                webBrowser.evaluateJavascript(js);
            }
        }
    }

    ScopeDataCollector& scopeCollector;
    ScopeFrameSerializer frameSerializer { 1024 };
    std::atomic<double> sampleRate { 44100.0 };
    std::map<int, std::string> laneTaps;

    juce::WebBrowserComponent webBrowser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(JuceWebScopeComponent)
};

} // namespace abd::scope
#endif

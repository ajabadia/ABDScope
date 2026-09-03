#pragma once

#if defined(JUCE_VERSION) || __has_include(<juce_gui_extra/juce_gui_extra.h>)
#include <juce_gui_extra/juce_gui_extra.h>
#include "../Core/ScopeDataCollector.h"
#include "../Core/ScopeFrameSerializer.h"
#include "ScopeResourceProvider.h"
#include <atomic>
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
                             // Always ensure all registered taps remain active
                             activateAllTaps();
                         }))
    {
        activateAllTaps();
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
    void activateAllTaps() noexcept
    {
        for (size_t i = 0; i < scopeCollector.getTapCount(); ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap != nullptr)
                tap->setActive(true);
        }
    }

    void timerCallback() override
    {
        const size_t count = scopeCollector.getTapCount();
        if (count == 0) return;

        const float sr = static_cast<float>(sampleRate.load(std::memory_order_relaxed));

        // Always bundle all registered taps so every lane receives its respective probe simultaneously
        std::string bundle = "{"taps":{";
        bool first = true;
        for (size_t i = 0; i < count; ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap == nullptr || !tap->isActive()) continue;

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

    ScopeDataCollector& scopeCollector;
    ScopeFrameSerializer frameSerializer { 512 };
    std::atomic<double> sampleRate { 44100.0 };

    juce::WebBrowserComponent webBrowser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(JuceWebScopeComponent)
};

} // namespace abd::scope
#endif

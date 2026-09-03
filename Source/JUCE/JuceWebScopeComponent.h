#pragma once

#if defined(JUCE_VERSION) || __has_include(<juce_gui_extra/juce_gui_extra.h>)
#include <juce_gui_extra/juce_gui_extra.h>
#include "../Core/ScopeDataCollector.h"
#include "../Core/ScopeFrameSerializer.h"
#include "ScopeResourceProvider.h"
#include <atomic>

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
                                 scopeCollector.selectTap(tapId);
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
    void timerCallback() override
    {
        auto* activeTap = scopeCollector.getActiveTap();
        if (activeTap == nullptr || !activeTap->isActive())
            return;

        std::string jsonPacket = frameSerializer.serializeActiveFrame(
            activeTap,
            static_cast<float>(sampleRate.load(std::memory_order_relaxed))
        );

        if (!jsonPacket.empty())
        {
            juce::String js = "if (window.__pushScopeFrame) { window.__pushScopeFrame("
                            + juce::String(jsonPacket) + "); }";
            webBrowser.evaluateJavascript(js);
        }
    }

    ScopeDataCollector& scopeCollector;
    ScopeFrameSerializer frameSerializer { 1024 };
    std::atomic<double> sampleRate { 44100.0 };

    juce::WebBrowserComponent webBrowser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(JuceWebScopeComponent)
};

} // namespace abd::scope
#endif

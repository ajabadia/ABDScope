#pragma once

#if defined(JUCE_VERSION) || __has_include(<juce_gui_extra/juce_gui_extra.h>)
#include <juce_gui_extra/juce_gui_extra.h>
#include "../Core/ScopeDataCollector.h"
#include "../Core/ScopeFrameSerializer.h"
#include "ScopeResourceProvider.h"
#include <atomic>
#include <cstddef>
#include <limits>
#include <string>
#include <vector>

namespace abd::scope {

/**
 * @brief High-performance JUCE GUI Component encapsulating ABDScope WebUI inside WebView2.
 *
 * Plug-and-play component ready for immediate integration into audio plugins, standalone
 * analyzers, and synthesizers. Handles WebView2 configuration, embedded binary resource serving,
 * IPC messaging, and 30 FPS telemetry decimation pump automatically.
 *
 * ## Tap activation policy (on-demand, backwards compatible)
 * - Before the WebUI sends any `SET_ACTIVE_TAP` message, every registered tap stays active so
 *   any lane renders out of the box (all-active fallback).
 * - The first `SET_ACTIVE_TAP { tapId, laneIdx }` message switches the component to on-demand
 *   mode: after that, only taps referenced by at least one lane subscription remain active.
 *   Inactive taps therefore cost ~0 CPU in the audio thread (see ScopeTap).
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
          currentTheme("audiolab-light"),
webBrowser(juce::WebBrowserComponent::Options{}
                          .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                          .withNativeIntegrationEnabled(true)
                          .withResourceProvider(abd::scope::scopeResourceProvider)
                          .withEventListener("pageLoaded", [this](const juce::var&) {
                              applyStoredTheme();
                          })
                          .withEventListener("SET_ACTIVE_TAP", [this](const juce::var& message) {
                              handleTapSubscription(message);
                          }))
    {
        // All-active fallback until the WebUI subscribes lanes (see class docs).
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

    /** @brief Set the visual theme (e.g. "audiolab-light", "audiolab", "ms2000", "cz101", "deepmind"). */
    void setTheme(const std::string& themeName)
    {
        currentTheme = themeName;
        applyStoredTheme();
    }

    void applyStoredTheme()
    {
        if (currentTheme.empty()) return;
        juce::String js = "document.documentElement.setAttribute('data-theme', '" + juce::String(currentTheme) + "');"
                          "if (document.body) { document.body.setAttribute('data-theme', '" + juce::String(currentTheme) + "');"
                          "document.body.className = 'theme-' + '" + juce::String(currentTheme) + "'; }";
        juce::MessageManager::callAsync([this, js]() { webBrowser.evaluateJavascript(js); });
    }

    [[nodiscard]] const std::string& getTheme() const noexcept { return currentTheme; }

    void reload()
    {
        auto rootUrl = juce::WebBrowserComponent::getResourceProviderRoot();
        if (!currentTheme.empty())
        {
            rootUrl += (rootUrl.containsChar('?') ? "&theme=" : "?theme=") + juce::String(currentTheme);
        }
        webBrowser.goToURL(rootUrl);
    }

    [[nodiscard]] juce::WebBrowserComponent& getWebBrowser() noexcept { return webBrowser; }

private:
    static constexpr size_t NO_TAP = (std::numeric_limits<size_t>::max)();

    /**
     * All-active fallback used before any lane subscription arrives.
     */
    void activateAllTaps() noexcept
    {
        for (size_t i = 0; i < scopeCollector.getTapCount(); ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap != nullptr)
                tap->setActive(true);
        }
    }

    /**
     * Handle `SET_ACTIVE_TAP { tapId, laneIdx }` posted by the WebUI when a lane
     * subscribes (or re-subscribes) to a probe. The first message switches the
     * component to on-demand mode; afterwards only lane-referenced taps stay active.
     */
    void handleTapSubscription(const juce::var& message)
    {
        const juce::String tapId = message["tapId"].toString();
        const int laneIdx = static_cast<int>(message["laneIdx"]);

        if (tapId.isEmpty() || laneIdx < 0 || laneIdx > 64) return;

        const size_t tapIndex = scopeCollector.findTapIndex(tapId.toStdString());
        if (tapIndex == ScopeDataCollector::npos) return;

        if (m_laneTaps.size() <= static_cast<size_t>(laneIdx))
            m_laneTaps.resize(static_cast<size_t>(laneIdx) + 1, NO_TAP);

        if (m_laneTaps[static_cast<size_t>(laneIdx)] == tapIndex)
            return; // Lane already subscribed to this tap

        m_laneTaps[static_cast<size_t>(laneIdx)] = tapIndex;
        syncActiveTaps();
    }

    /**
     * Activate exactly the taps referenced by lane subscriptions.
     * No-op while m_laneTaps is empty (all-active fallback).
     */
    void syncActiveTaps() noexcept
    {
        if (m_laneTaps.empty()) return;

        const size_t total = scopeCollector.getTapCount();
        std::vector<size_t> referenceCount(total, 0);
        for (const size_t laneTap : m_laneTaps)
        {
            if (laneTap != NO_TAP && laneTap < total)
                referenceCount[laneTap]++;
        }

        for (size_t i = 0; i < total; ++i)
        {
            auto* tap = const_cast<ScopeTap*>(scopeCollector.getTap(i));
            if (tap != nullptr)
                tap->setActive(referenceCount[i] > 0);
        }
    }

    void timerCallback() override
    {
        const size_t count = scopeCollector.getTapCount();
        if (count == 0) return;

        const float sr = static_cast<float>(sampleRate.load(std::memory_order_relaxed));

        // Bundle every currently active tap so each subscribed lane receives its probe.
        std::string bundle = "{\"taps\":{";
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

    std::vector<size_t> m_laneTaps; ///< laneIdx -> registered tap index (NO_TAP if unsubscribed)
    std::string currentTheme { "audiolab-light" };

    juce::WebBrowserComponent webBrowser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(JuceWebScopeComponent)
};

} // namespace abd::scope
#endif

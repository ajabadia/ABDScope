#pragma once

#if defined(JUCE_VERSION) || __has_include(<juce_gui_basics/juce_gui_basics.h>)
#include <juce_gui_basics/juce_gui_basics.h>
#include "../Core/ScopeTap.h"
#include "../Core/TriggerDetector.h"

namespace abd::scope {

/**
 * Native JUCE GUI Component for pure C++ hosts (e.g. ABDAudioLab).
 */
class JuceScopeComponent : public juce::Component,
                           private juce::Timer
{
public:
    explicit JuceScopeComponent(ScopeTap* tapToMonitor = nullptr, float sampleRate = 44100.0f)
        : m_tap(tapToMonitor),
          m_sampleRate(sampleRate),
          m_samplesL(512, 0.0f),
          m_samplesR(512, 0.0f)
    {
        setOpaque(true);
        startTimerHz(30); // 30 FPS visual refresh
    }

    ~JuceScopeComponent() override {
        stopTimer();
    }

    void setTap(ScopeTap* newTap) noexcept {
        m_tap = newTap;
    }

    void setSampleRate(float sampleRate) noexcept {
        m_sampleRate = sampleRate;
    }

    void paint(juce::Graphics& g) override {
        const auto bounds = getLocalBounds().toFloat();
        const float w = bounds.getWidth();
        const float h = bounds.getHeight();
        const float midY = h * 0.5f;

        // 1. Dark Background
        g.fillAll(juce::Colour(0xff080c12));

        // 2. Reticle Grid
        g.setColour(juce::Colours::white.withAlpha(0.06f));
        for (int x = 1; x < 8; ++x) {
            const float px = (w / 8.0f) * static_cast<float>(x);
            g.drawVerticalLine(static_cast<int>(px), 0.0f, h);
        }
        for (int y = 1; y < 4; ++y) {
            const float py = (h / 4.0f) * static_cast<float>(y);
            g.drawHorizontalLine(static_cast<int>(py), 0.0f, w);
        }
        g.setColour(juce::Colours::white.withAlpha(0.12f));
        g.drawHorizontalLine(static_cast<int>(midY), 0.0f, w);

        // 3. Render Waveform Path
        if (m_samplesL.empty() || m_tap == nullptr) return;

        const size_t numSamples = m_samplesL.size();
        const size_t triggerOffset = m_triggerResult.triggerIndex;
        const size_t visibleSamples = (numSamples > triggerOffset) ? (numSamples - triggerOffset) : numSamples;
        if (visibleSamples < 2) return;

        const float stepX = w / static_cast<float>(visibleSamples - 1);
        const float scaleY = midY * 0.88f;

        juce::Path wavePath;
        for (size_t i = 0; i < visibleSamples; ++i) {
            const float sample = m_samplesL[triggerOffset + i];
            const float x = static_cast<float>(i) * stepX;
            const float y = midY - (sample * scaleY);

            if (i == 0) wavePath.startNewSubPath(x, y);
            else wavePath.lineTo(x, y);
        }

        g.setColour(juce::Colour(0xff00c3ff));
        g.strokePath(wavePath, juce::PathStrokeType(1.8f));

        // 4. Detected Note Badge
        if (!m_triggerResult.noteName.empty()) {
            g.setColour(juce::Colour(0xff00e676));
            g.setFont(11.0f);
            juce::String label = juce::String(m_triggerResult.noteName.data(), m_triggerResult.noteName.size())
                               + " (" + juce::String(static_cast<int>(m_triggerResult.estimatedFrequencyHz)) + " Hz)";
            g.drawText(label, getLocalBounds().reduced(8), juce::Justification::topRight, false);
        }
    }

private:
    void timerCallback() override {
        if (m_tap == nullptr || !m_tap->isActive()) return;

        const size_t available = m_tap->getAvailableRead();
        if (available >= m_samplesL.size()) {
            m_tap->read(m_samplesL.data(), m_samplesR.data(), m_samplesL.size());
            m_triggerResult = TriggerDetector::process(m_samplesL.data(), m_samplesL.size(), m_sampleRate);
            repaint();
        }
    }

    ScopeTap* m_tap { nullptr };
    float m_sampleRate { 44100.0f };
    std::vector<float> m_samplesL;
    std::vector<float> m_samplesR;
    TriggerResult m_triggerResult;
};

} // namespace abd::scope
#endif

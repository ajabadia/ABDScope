#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <iomanip>
#include <cmath>
#include "ScopeTap.h"
#include "TriggerDetector.h"

namespace abd::scope {

/**
 * Message-thread Frame Serializer that decodes SPSC samples, calculates frame metrics,
 * and serializes into wire-protocol JSON for WebUI delivery.
 */
class ScopeFrameSerializer final {
public:
    explicit ScopeFrameSerializer(size_t targetSamples = 512)
        : m_targetSamples(targetSamples),
          m_tempL(targetSamples * 4, 0.0f),
          m_tempR(targetSamples * 4, 0.0f),
          m_decimatedL(targetSamples, 0.0f),
          m_decimatedR(targetSamples, 0.0f)
    {
    }

    /**
     * Poll active tap and serialize frame into JSON wire protocol string.
     * Returns empty string if no new frame is ready.
     */
    std::string serializeActiveFrame(ScopeTap* activeTap, float sampleRate) {
        if (activeTap == nullptr || !activeTap->isActive()) return "";

        const size_t available = activeTap->getAvailableRead();
        if (available < m_targetSamples) return "";

        // 1. Read available samples from ring buffer
        const size_t readCount = std::min(available, m_tempL.size());
        const bool isStereo = (activeTap->getType() == ScopeTapType::StereoAudio);
        activeTap->read(m_tempL.data(), isStereo ? m_tempR.data() : nullptr, readCount);

        // 2. Decimate down to targetSamples if readCount > targetSamples
        const float step = static_cast<float>(readCount) / static_cast<float>(m_targetSamples);
        float sumSqL = 0.0f, sumSqR = 0.0f;
        float peakL = 0.0f, peakR = 0.0f;

        for (size_t i = 0; i < m_targetSamples; ++i) {
            const size_t srcIdx = std::min(static_cast<size_t>(i * step), readCount - 1);
            const float sL = m_tempL[srcIdx];
            m_decimatedL[i] = sL;
            sumSqL += sL * sL;
            peakL = std::max(peakL, std::abs(sL));

            if (isStereo) {
                const float sR = m_tempR[srcIdx];
                m_decimatedR[i] = sR;
                sumSqR += sR * sR;
                peakR = std::max(peakR, std::abs(sR));
            }
        }

        const float rmsL = std::sqrt(sumSqL / static_cast<float>(m_targetSamples));
        const float rmsR = isStereo ? std::sqrt(sumSqR / static_cast<float>(m_targetSamples)) : rmsL;

        // 3. Trigger detection (bypassed for control signals)
        const bool isControl = (activeTap->getType() == ScopeTapType::ControlSignal);
        TriggerResult trigger;
        if (!isControl) {
            trigger = TriggerDetector::process(m_decimatedL.data(), m_targetSamples, sampleRate);
        }

        // 4. Construct Wire Protocol JSON
        std::ostringstream json;
        json << std::fixed << std::setprecision(4);
        json << "{\"signalType\":\"" << toString(activeTap->getType()) << "\","
             << "\"sampleRate\":" << static_cast<int>(sampleRate) << ","
             << "\"triggerIndex\":" << trigger.triggerIndex << ","
             << "\"estimatedFrequencyHz\":" << trigger.estimatedFrequencyHz << ","
             << "\"detectedNoteName\":\"" << trigger.noteName << "\","
             << "\"rmsL\":" << rmsL << ",\"rmsR\":" << rmsR << ","
             << "\"peakL\":" << peakL << ",\"peakR\":" << (isStereo ? peakR : peakL) << ","
             << "\"timeDataL\":[";

        for (size_t i = 0; i < m_targetSamples; ++i) {
            if (i > 0) json << ",";
            json << m_decimatedL[i];
        }
        json << "]";

        if (isStereo) {
            json << ",\"timeDataR\":[";
            for (size_t i = 0; i < m_targetSamples; ++i) {
                if (i > 0) json << ",";
                json << m_decimatedR[i];
            }
            json << "]";
        }

        json << "}";
        return json.str();
    }

private:
    size_t m_targetSamples;
    std::vector<float> m_tempL;
    std::vector<float> m_tempR;
    std::vector<float> m_decimatedL;
    std::vector<float> m_decimatedR;
};

} // namespace abd::scope

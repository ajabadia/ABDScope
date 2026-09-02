#pragma once

#include <cstddef>
#include <cmath>
#include <string_view>
#include <array>

namespace abd::scope {

struct TriggerResult {
    size_t triggerIndex { 0 };
    float estimatedFrequencyHz { 0.0f };
    std::string_view noteName { "" };
};

/**
 * Pure C++ Zero-Crossing Detector with Hysteresis & Fundamental Pitch Estimator.
 */
class TriggerDetector final {
public:
    static constexpr float DEFAULT_HYSTERESIS = 0.035f;

    static TriggerResult process(
        const float* samples,
        size_t numSamples,
        float sampleRate,
        float hysteresis = DEFAULT_HYSTERESIS) noexcept
    {
        TriggerResult result;
        if (samples == nullptr || numSamples < 16) return result;

        bool isArmArmed = false;
        size_t firstTrigger = 0;
        size_t secondTrigger = 0;
        size_t triggerCount = 0;

        for (size_t i = 1; i < numSamples - 1; ++i) {
            const float prev = samples[i - 1];
            const float curr = samples[i];

            // 1. Arm trigger when signal goes below negative hysteresis threshold
            if (curr < -hysteresis) {
                isArmArmed = true;
            }

            // 2. Fire on rising zero-crossing
            if (isArmArmed && prev <= 0.0f && curr > 0.0f) {
                if (triggerCount == 0) {
                    firstTrigger = i;
                    result.triggerIndex = i;
                } else if (triggerCount == 1) {
                    secondTrigger = i;
                }
                triggerCount++;
                isArmArmed = false;

                // Stop early if we have found two consecutive cycle points
                if (triggerCount >= 2 && i > (numSamples / 2)) {
                    break;
                }
            }
        }

        // 3. Estimate fundamental frequency
        if (triggerCount >= 2 && secondTrigger > firstTrigger && sampleRate > 0.0f) {
            const size_t periodSamples = secondTrigger - firstTrigger;
            result.estimatedFrequencyHz = sampleRate / static_cast<float>(periodSamples);
            result.noteName = frequencyToNoteName(result.estimatedFrequencyHz);
        }

        return result;
    }

    static std::string_view frequencyToNoteName(float freqHz) noexcept {
        if (freqHz < 20.0f || freqHz > 20000.0f) return "";

        static constexpr std::array<std::string_view, 12> NOTE_NAMES = {
            "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
        };

        const float midiNum = 69.0f + 12.0f * std::log2(freqHz / 440.0f);
        const int roundedMidi = static_cast<int>(std::round(midiNum));
        if (roundedMidi < 0 || roundedMidi > 127) return "";

        const size_t noteIdx = static_cast<size_t>(roundedMidi % 12);
        return NOTE_NAMES[noteIdx];
    }
};

} // namespace abd::scope

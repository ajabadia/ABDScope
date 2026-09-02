#include <iostream>
#include <vector>
#include <cmath>
#include <cassert>
#include "../Core/SpscRingBuffer.h"
#include "../Core/ScopeTap.h"
#include "../Core/ScopeDataCollector.h"
#include "../Core/TriggerDetector.h"
#include "../Core/ScopeFrameSerializer.h"

int main() {
    std::cout << "============================================" << std::endl;
    std::cout << "  ABDScope Native C++ Standalone Sanity Test" << std::endl;
    std::cout << "============================================" << std::endl;

    // 1. Test SPSC Ring Buffer
    {
        std::cout << "[TEST] Testing SpscRingBuffer...";
        abd::scope::SpscRingBuffer<float> ring(128);
        std::vector<float> input = { 1.0f, 2.0f, 3.0f, 4.0f, 5.0f };
        [[maybe_unused]] size_t written = ring.write(input.data(), input.size());
        assert(written == 5);
        assert(ring.getAvailableRead() == 5);

        std::vector<float> output(5, 0.0f);
        [[maybe_unused]] size_t readCount = ring.read(output.data(), 5);
        assert(readCount == 5);
        assert(output[0] == 1.0f && output[4] == 5.0f);
        std::cout << " PASSED!" << std::endl;
    }

    // 2. Test ScopeTap and ScopeDataCollector
    {
        std::cout << "[TEST] Testing ScopeDataCollector & Multi-Tap...";
        abd::scope::ScopeDataCollector collector;
        auto* tap1 = collector.registerTap("Master Out", abd::scope::ScopeTapType::StereoAudio);
        [[maybe_unused]] auto* tap2 = collector.registerTap("Osc 1", abd::scope::ScopeTapType::StereoAudio);
        assert(tap1 != nullptr && tap2 != nullptr);

        collector.selectTap("Master Out");
        assert(tap1->isActive());
        assert(!tap2->isActive());

        std::vector<float> lSamples(64, 0.5f);
        std::vector<float> rSamples(64, -0.5f);
        tap1->writeStereo(lSamples.data(), rSamples.data(), lSamples.size());
        assert(tap1->getAvailableRead() == 64);
        std::cout << " PASSED!" << std::endl;
    }

    // 3. Test TriggerDetector Sub-sample Precision & Pitch
    {
        std::cout << "[TEST] Testing TriggerDetector Sub-sample Lock & Pitch...";
        const float sampleRate = 44100.0f;
        const float targetFreq = 440.0f;
        const size_t numSamples = 1024;
        std::vector<float> sine(numSamples, 0.0f);

        for (size_t i = 0; i < numSamples; ++i) {
            sine[i] = std::sin(2.0f * 3.1415926535f * targetFreq * static_cast<float>(i) / sampleRate);
        }

        auto result = abd::scope::TriggerDetector::process(sine.data(), numSamples, sampleRate);
        assert(result.triggerIndex > 0);
        assert(result.triggerFraction >= 0.0f && result.triggerFraction < 1.0f);
        assert(std::abs(result.estimatedFrequencyHz - 440.0f) < 2.0f);
        assert(result.noteName == "A");
        std::cout << " PASSED! (Note: " << result.noteName << ", Freq: " << result.estimatedFrequencyHz << " Hz)" << std::endl;
    }

    // 4. Test ScopeFrameSerializer JSON Generation
    {
        std::cout << "[TEST] Testing ScopeFrameSerializer JSON Wire-Protocol...";
        abd::scope::ScopeDataCollector collector;
        auto* tap = collector.registerTap("Master Out", abd::scope::ScopeTapType::StereoAudio);
        collector.selectTap("Master Out");

        std::vector<float> l(256, 0.25f);
        std::vector<float> r(256, -0.25f);
        tap->writeStereo(l.data(), r.data(), 256);

        abd::scope::ScopeFrameSerializer serializer(256);
        std::string json = serializer.serializeActiveFrame(collector.getActiveTap(), 44100.0f);
        assert(!json.empty());
        assert(json.find("\"time\":") != std::string::npos);
        assert(json.find("\"samplesL\":") != std::string::npos);
        std::cout << " PASSED!" << std::endl;
    }

    std::cout << "============================================" << std::endl;
    std::cout << "  [SUCCESS] ALL C++ SMOKE TESTS PASSED!" << std::endl;
    std::cout << "============================================" << std::endl;
    return 0;
}

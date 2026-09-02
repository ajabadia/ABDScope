#pragma once

#include <vector>
#include <memory>
#include <string_view>
#include <atomic>
#include <mutex>
#include "ScopeTap.h"

namespace abd::scope {

/**
 * Central Data Collector managing multiple taps across a synth audio engine.
 */
class ScopeDataCollector final {
public:
    ScopeDataCollector() = default;
    ~ScopeDataCollector() = default;
    ScopeDataCollector(const ScopeDataCollector&) = delete;
    ScopeDataCollector& operator=(const ScopeDataCollector&) = delete;

    /**
     * Register a new tap during initialization (not during audio processing).
     * Returns pointer to registered tap for audio thread writing.
     */
    ScopeTap* registerTap(std::string name, ScopeTapType type, size_t bufferCapacity = 4096) {
        std::lock_guard<std::mutex> lock(m_registrationMutex);
        auto tap = std::make_unique<ScopeTap>(std::move(name), type, bufferCapacity);
        ScopeTap* ptr = tap.get();
        m_taps.push_back(std::move(tap));

        // Auto-select first registered tap
        if (m_taps.size() == 1) {
            ptr->setActive(true);
            m_activeTapIndex.store(0, std::memory_order_relaxed);
        }
        return ptr;
    }

    /**
     * Select active tap by index (called from UI / message thread).
     */
    void selectTap(size_t index) noexcept {
        const size_t total = m_taps.size();
        if (index >= total) return;

        for (size_t i = 0; i < total; ++i) {
            m_taps[i]->setActive(i == index);
        }
        m_activeTapIndex.store(index, std::memory_order_relaxed);
    }

    /**
     * Select active tap by name.
     */
    bool selectTap(std::string_view name) noexcept {
        for (size_t i = 0; i < m_taps.size(); ++i) {
            if (m_taps[i]->getName() == name) {
                selectTap(i);
                return true;
            }
        }
        return false;
    }

    [[nodiscard]] ScopeTap* getActiveTap() const noexcept {
        const size_t idx = m_activeTapIndex.load(std::memory_order_relaxed);
        return (idx < m_taps.size()) ? m_taps[idx].get() : nullptr;
    }

    [[nodiscard]] size_t getTapCount() const noexcept {
        return m_taps.size();
    }

    [[nodiscard]] const ScopeTap* getTap(size_t index) const noexcept {
        return (index < m_taps.size()) ? m_taps[index].get() : nullptr;
    }

    /**
     * Deactivate all taps (e.g., when UI is closed or scope is destroyed).
     */
    void deactivateAll() noexcept {
        for (auto& tap : m_taps) {
            tap->setActive(false);
        }
    }

private:
    std::mutex m_registrationMutex;
    std::vector<std::unique_ptr<ScopeTap>> m_taps;
    std::atomic<size_t> m_activeTapIndex { 0 };
};

} // namespace abd::scope

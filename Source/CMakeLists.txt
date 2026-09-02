# Source/CMakeLists.txt
target_sources(ABDScopeCore INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/ScopeTapType.h
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/SpscRingBuffer.h
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/ScopeTap.h
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/ScopeDataCollector.h
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/TriggerDetector.h
    ${CMAKE_CURRENT_SOURCE_DIR}/Core/ScopeFrameSerializer.h
    ${CMAKE_CURRENT_SOURCE_DIR}/JUCE/JuceScopeComponent.h
)

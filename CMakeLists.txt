cmake_minimum_required(VERSION 3.22)
project(ABDScope VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
  add_compile_options(/W4 /wd4324 /permissive- /Zc:__cplusplus /Zc:inline)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Wconversion -Wshadow)
endif()

add_subdirectory(Source)

# Target Alias for clean consumer integration: ABDScope::ABDScopeCore
add_library(ABDScope::ABDScopeCore ALIAS ABDScopeCore)

# Standalone C++ Smoke Test (MSVC Validation)
add_executable(ABDScope_CppSmoke Source/tests/StandaloneSmoke.cpp)
target_link_libraries(ABDScope_CppSmoke PRIVATE ABDScopeCore)

# Optional Native JUCE GUI Standalone Demo
if(EXISTS "C:/JUCE/CMakeLists.txt")
  add_subdirectory("C:/JUCE" _juce_build EXCLUDE_FROM_ALL)
elseif(EXISTS "D:/desarrollos/juce/CMakeLists.txt")
  add_subdirectory("D:/desarrollos/juce" _juce_build EXCLUDE_FROM_ALL)
endif()

if(TARGET juce::juce_gui_extra)
  juce_add_gui_app(ABDScope_GuiDemo
    PRODUCT_NAME "ABDScope Native GUI Demo"
    VERSION 0.1.0
  )

  target_sources(ABDScope_GuiDemo PRIVATE
    Source/StandaloneDemo/Main.cpp
  )

  target_link_libraries(ABDScope_GuiDemo PRIVATE
    ABDScopeCore
    juce::juce_gui_basics
    juce::juce_gui_extra
    juce::juce_audio_basics
    juce::juce_audio_devices
    juce::juce_audio_utils
    juce::juce_dsp
  )
endif()
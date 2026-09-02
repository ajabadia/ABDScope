cmake_minimum_required(VERSION 3.22)
project(ABDScope VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
  add_compile_options(/W4 /permissive- /Zc:__cplusplus /Zc:inline)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Wconversion -Wshadow)
endif()

# Define ABDScope Core Library (Header-only C++20 lock-free ring buffers)
add_library(ABDScopeCore INTERFACE)

target_include_directories(ABDScopeCore INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/Source/Core>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/Source/JUCE>
  $<INSTALL_INTERFACE:include/abd/scope>
)

add_subdirectory(Source)

# Target Alias for clean consumer integration: ABDScope::ABDScopeCore
add_library(ABDScope::ABDScopeCore ALIAS ABDScopeCore)

# Enable testing if GTest available
enable_testing()
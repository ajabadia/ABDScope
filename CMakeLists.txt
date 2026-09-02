cmake_minimum_required(VERSION 3.22)
project(ABDScope VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define ABDScope Core Library (Header-only C++20 lock-free ring buffers)
add_library(ABDScopeCore INTERFACE)

target_include_directories(ABDScopeCore INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/Source>
    $<INSTALL_INTERFACE:include>
)

add_subdirectory(Source)

# Target Alias for clean consumer integration: ABDScope::ABDScopeCore
add_library(ABDScope::ABDScopeCore ALIAS ABDScopeCore)

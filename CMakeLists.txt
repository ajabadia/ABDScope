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

add_subdirectory(Source)

# Target Alias for clean consumer integration: ABDScope::ABDScopeCore
add_library(ABDScope::ABDScopeCore ALIAS ABDScopeCore)

# Standalone C++ Smoke Test (MSVC Validation)
add_executable(ABDScope_CppSmoke Source/tests/StandaloneSmoke.cpp)
target_link_libraries(ABDScope_CppSmoke PRIVATE ABDScopeCore)
cmake_minimum_required(VERSION 3.22.1)

project(appmodules)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# React Native sets these; add fallbacks for IDE/manual invocation
if(NOT DEFINED REACT_ANDROID_DIR)
    set(REACT_ANDROID_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../node_modules/react-native/ReactAndroid")
endif()
if(NOT DEFINED PROJECT_BUILD_DIR)
    set(PROJECT_BUILD_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../build")
endif()

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Build our native library as a separate static library
add_library(nativecore STATIC
    native-core/src/transfer_engine.cpp
    jsi_install.cpp
    jsi_bridge.cpp
)

target_include_directories(nativecore PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/native-core/include
)

# Link nativecore to the main app module
target_link_libraries(${CMAKE_PROJECT_NAME}
    nativecore
    log
)
target_link_libraries(nativecore
    ReactAndroid::jsi
)
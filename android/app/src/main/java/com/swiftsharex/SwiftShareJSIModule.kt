package com.swiftsharex

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactContextBaseJavaModule

class SwiftShareJSIModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), NativeModule {

    companion object {
        init {
            // Loads libappmodules.so built by CMake
            System.loadLibrary("appmodules")
        }
    }

    override fun getName(): String = "SwiftShareJSI"

    @ReactMethod
    fun install() {
        val runtimePtr = reactContext.javaScriptContextHolder?.get() ?: 0L
        if (runtimePtr == 0L) {
            throw IllegalStateException("JS runtime not ready")
        }
        
        // Just install - path resolution now handled by FilePathResolver
        nativeInstall(runtimePtr)
    }
    // JNI hooks
    private external fun nativeInstall(runtimePtr: Long)
}
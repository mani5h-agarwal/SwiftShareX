package com.swiftshare

import android.content.ActivityNotFoundException
import android.content.Intent
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactContextBaseJavaModule
import java.io.File

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

        // Ensure JSI interactions run on the JS thread to avoid crashes
        reactContext.runOnJSQueueThread {
            nativeInstall(runtimePtr)
        }
    }

    @ReactMethod
    fun openFile(path: String, promise: Promise) {
        val file = File(path)
        if (!file.exists()) {
            promise.reject("NOT_FOUND", "File not found")
            return
        }

        try {
            val uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file,
            )
            val mimeType = MimeTypeMap.getSingleton()
                .getMimeTypeFromExtension(file.extension.lowercase()) ?: "*/*"
            val intent = Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, mimeType)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: ActivityNotFoundException) {
            promise.reject("NO_APP", "No app can open this file", e)
        } catch (e: IllegalArgumentException) {
            promise.reject("OPEN_FAILED", "Could not open this file", e)
        }
    }

    // JNI hooks
    private external fun nativeInstall(runtimePtr: Long)
}
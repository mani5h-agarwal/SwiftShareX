package com.swiftsharex

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

object FilePathResolver {

    private const val TAG = "SwiftShare"

    @JvmStatic // JNI entrypoint
    fun getReceiveFilePath(@Suppress("UNUSED_PARAMETER") context: Context, filename: String): String? {
        return try {
            Log.i(TAG, "Resolving path for: $filename")
            val dir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                "SwiftShareX"
            )

            if (!dir.exists()) {
                val created = dir.mkdirs()
                Log.i(TAG, "Created directory: $created at ${dir.absolutePath}")
            }

            val cleanName = sanitizeName(filename)
            val uniqueName = ensureUniqueName(dir, cleanName)
            val filePath = File(dir, uniqueName).absolutePath
            Log.i(TAG, "Resolved unique path: $filePath")
            filePath
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get file path", e)
            null
        }
    }

    private fun sanitizeName(filename: String): String {
        val pendingPattern = Regex("^\\.pending-\\d+-")
        var name = filename.replace(pendingPattern, "")
        name = name.removePrefix(".pending-")
        if (name.startsWith('.')) {
            name = name.removePrefix(".")
        }
        if (name.isBlank()) {
            name = "file"
        }
        return name
    }

    private fun ensureUniqueName(dir: File, filename: String): String {
        val dot = filename.lastIndexOf('.')
        val base = if (dot > 0) filename.substring(0, dot) else filename
        val ext = if (dot > 0) filename.substring(dot) else ""

        var candidate = filename
        var counter = 1
        while (File(dir, candidate).exists()) {
            candidate = "$base-$counter$ext"
            counter++
        }
        return candidate
    }
}
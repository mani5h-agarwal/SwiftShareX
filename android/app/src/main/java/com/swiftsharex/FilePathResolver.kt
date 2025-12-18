package com.swiftsharex

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File

object FilePathResolver {
    
    private const val TAG = "SwiftShare"
    
    @JvmStatic  // ✅ This is crucial for JNI to find it
    fun getReceiveFilePath(context: Context, filename: String): String? {
        return try {
            Log.i(TAG, "Resolving path for: $filename")
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getPathViaMediaStore(context, filename)
            } else {
                getPathLegacy(filename)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get file path", e)
            null
        }
    }
    
    private fun getPathViaMediaStore(context: Context, filename: String): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return getPathLegacy(filename)
        }
        
        val resolver = context.contentResolver
        val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        
        val details = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, filename)
            put(MediaStore.Downloads.IS_PENDING, 1)
            put(MediaStore.Downloads.RELATIVE_PATH, 
                "${Environment.DIRECTORY_DOWNLOADS}/SwiftShareX")
        }
        
        val uri = resolver.insert(collection, details)
        if (uri == null) {
            Log.e(TAG, "Failed to insert into MediaStore")
            return getPathLegacy(filename)
        }
        
        // Try to get actual file path
        val cursor = resolver.query(
            uri, 
            arrayOf(MediaStore.Downloads.DATA), 
            null, 
            null, 
            null
        )
        
        cursor?.use {
            if (it.moveToFirst()) {
                val columnIndex = it.getColumnIndexOrThrow(MediaStore.Downloads.DATA)
                val path = it.getString(columnIndex)
                Log.i(TAG, "MediaStore path: $path")
                
                // Mark as no longer pending
                val updateValues = ContentValues().apply {
                    put(MediaStore.Downloads.IS_PENDING, 0)
                }
                resolver.update(uri, updateValues, null, null)
                
                return path
            }
        }
        
        // Fallback to legacy if MediaStore fails
        Log.w(TAG, "MediaStore query failed, falling back to legacy")
        return getPathLegacy(filename)
    }
    
    private fun getPathLegacy(filename: String): String {
        val dir = File(
            Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            ),
            "SwiftShareX"
        )
        
        if (!dir.exists()) {
            val created = dir.mkdirs()
            Log.i(TAG, "Created directory: $created at ${dir.absolutePath}")
        }
        
        val filePath = File(dir, filename).absolutePath
        Log.i(TAG, "Legacy path: $filePath")
        return filePath
    }
}
package com.zibana.app

import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "QuickAccess")
class QuickAccessPlugin : Plugin() {

    @PluginMethod
    fun startBubble(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !Settings.canDrawOverlays(context)) {
                call.resolve(JSObject().apply {
                    put("started", false)
                    put("permissionDenied", true)
                })
                return
            }
            QuickAccessBubbleService.start(context)
            call.resolve(JSObject().apply { put("started", true) })
        } catch (e: Exception) {
            call.reject("Failed to start bubble: ${e.message}", e)
        }
    }

    @PluginMethod
    fun stopBubble(call: PluginCall) {
        try {
            QuickAccessBubbleService.stop(context)
            call.resolve(JSObject().apply { put("stopped", true) })
        } catch (e: Exception) {
            call.reject("Failed to stop bubble: ${e.message}", e)
        }
    }

    @PluginMethod
    fun isBubbleActive(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("active", QuickAccessBubbleService.isActive())
        })
    }

    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(context)) {
                    call.resolve(JSObject().apply {
                        put("granted", true)
                        put("alreadyGranted", true)
                    })
                    return
                }
                val intent = android.content.Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                call.resolve(JSObject().apply {
                    put("granted", false)
                    put("settingsOpened", true)
                })
            } else {
                call.resolve(JSObject().apply {
                    put("granted", true)
                    put("alreadyGranted", true)
                })
            }
        } catch (e: Exception) {
            call.reject("Failed to request overlay permission: ${e.message}", e)
        }
    }

    @PluginMethod
    fun hasOverlayPermission(call: PluginCall) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
        call.resolve(JSObject().apply { put("granted", granted) })
    }
}

package com.zibana.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "DriverService")
class DriverServicePlugin : Plugin() {

    override fun load() {
        super.load()
        RideIncomingActivity.onRideAction = { rideId, accepted ->
            val data = JSObject().apply {
                put("rideId", rideId)
                put("accepted", accepted)
            }
            notifyListeners("rideActionResponse", data)
        }

        OnlineOverlayService.onOverlayRideAction = { rideId, accepted ->
            val data = JSObject().apply {
                put("rideId", rideId)
                put("accepted", accepted)
            }
            notifyListeners("rideActionResponse", data)
        }
    }

    @PluginMethod
    fun startService(call: PluginCall) {
        try {
            DriverForegroundService.start(context)
            call.resolve(JSObject().apply { put("started", true) })
        } catch (e: Exception) {
            call.reject("Failed to start service: ${e.message}", e)
        }
    }

    @PluginMethod
    fun stopService(call: PluginCall) {
        try {
            DriverForegroundService.stop(context)
            call.resolve(JSObject().apply { put("stopped", true) })
        } catch (e: Exception) {
            call.reject("Failed to stop service: ${e.message}", e)
        }
    }

    @PluginMethod
    fun triggerIncomingRide(call: PluginCall) {
        try {
            val rideId = call.getString("rideId") ?: ""
            val pickup = call.getString("pickup") ?: "Pickup location"
            val dropoff = call.getString("dropoff") ?: "Dropoff location"
            val fare = call.getString("fare") ?: "0"
            val currency = call.getString("currency") ?: "₦"
            val riderName = call.getString("riderName") ?: "Rider"
            val riderRating = call.getString("riderRating") ?: "5.0"
            val distance = call.getString("distance") ?: ""
            val duration = call.getString("duration") ?: ""

            val intent = Intent(context, RideIncomingActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(RideIncomingActivity.EXTRA_RIDE_ID, rideId)
                putExtra(RideIncomingActivity.EXTRA_PICKUP, pickup)
                putExtra(RideIncomingActivity.EXTRA_DROPOFF, dropoff)
                putExtra(RideIncomingActivity.EXTRA_FARE, fare)
                putExtra(RideIncomingActivity.EXTRA_CURRENCY, currency)
                putExtra(RideIncomingActivity.EXTRA_RIDER_NAME, riderName)
                putExtra(RideIncomingActivity.EXTRA_RIDER_RATING, riderRating)
                putExtra(RideIncomingActivity.EXTRA_DISTANCE, distance)
                putExtra(RideIncomingActivity.EXTRA_DURATION, duration)
            }
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("triggered", true) })
        } catch (e: Exception) {
            call.reject("Failed to trigger incoming ride: ${e.message}", e)
        }
    }

    @PluginMethod
    fun setDriverOnlineState(call: PluginCall) {
        val online = call.getBoolean("online") ?: false
        MainActivity.setDriverOnline(online)
        if (!online) {
            try {
                OnlineOverlayService.stop(context)
            } catch (_: Exception) {}
        }
        call.resolve(JSObject().apply { put("online", online) })
    }

    @PluginMethod
    fun setTripActive(call: PluginCall) {
        val active = call.getBoolean("active") ?: false
        MainActivity.setTripActive(active)
        call.resolve(JSObject().apply { put("active", active) })
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
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
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
    fun requestBatteryOptimizationExemption(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
                if (pm.isIgnoringBatteryOptimizations(context.packageName)) {
                    call.resolve(JSObject().apply {
                        put("alreadyExempt", true)
                    })
                    return
                }
                val intent = Intent(
                    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                call.resolve(JSObject().apply {
                    put("alreadyExempt", false)
                    put("dialogOpened", true)
                })
            } else {
                call.resolve(JSObject().apply {
                    put("alreadyExempt", true)
                })
            }
        } catch (e: Exception) {
            call.reject("Failed to request battery exemption: ${e.message}", e)
        }
    }

    @PluginMethod
    fun setOverlayEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        try {
            if (enabled) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                    !Settings.canDrawOverlays(context)) {
                    call.resolve(JSObject().apply {
                        put("enabled", false)
                        put("permissionDenied", true)
                    })
                    return
                }
                if (MainActivity.isDriverOnline()) {
                    OnlineOverlayService.start(context)
                }
                call.resolve(JSObject().apply { put("enabled", true) })
            } else {
                OnlineOverlayService.stop(context)
                call.resolve(JSObject().apply { put("enabled", false) })
            }
        } catch (e: Exception) {
            call.reject("Failed to set overlay: ${e.message}", e)
        }
    }
}

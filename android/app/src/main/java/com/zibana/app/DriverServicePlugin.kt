package com.zibana.app

import android.content.Intent
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
}

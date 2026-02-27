package com.zibana.app

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class OnlineOverlayService : Service() {

    companion object {
        const val ACTION_RIDE_INCOMING = "com.zibana.app.RIDE_INCOMING"
        const val ACTION_RIDE_DISMISSED = "com.zibana.app.RIDE_DISMISSED"
        const val EXTRA_RIDE_ID = "overlay_ride_id"
        const val EXTRA_RIDER_NAME = "overlay_rider_name"
        const val EXTRA_FARE = "overlay_fare"

        var onOverlayRideAction: ((rideId: String, accepted: Boolean) -> Unit)? = null

        fun start(context: Context) {
            val intent = Intent(context, OnlineOverlayService::class.java)
            context.startService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, OnlineOverlayService::class.java)
            context.stopService(intent)
        }

        fun notifyRideIncoming(context: Context, rideId: String, riderName: String, fare: String) {
            val intent = Intent(ACTION_RIDE_INCOMING).apply {
                setPackage(context.packageName)
                putExtra(EXTRA_RIDE_ID, rideId)
                putExtra(EXTRA_RIDER_NAME, riderName)
                putExtra(EXTRA_FARE, fare)
            }
            context.sendBroadcast(intent)
        }

        fun notifyRideDismissed(context: Context) {
            val intent = Intent(ACTION_RIDE_DISMISSED).apply {
                setPackage(context.packageName)
            }
            context.sendBroadcast(intent)
        }
    }

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var expandedView: View? = null
    private var currentRideId: String? = null
    private var isExpanded = false

    private val rideReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_RIDE_INCOMING -> {
                    currentRideId = intent.getStringExtra(EXTRA_RIDE_ID) ?: ""
                    val riderName = intent.getStringExtra(EXTRA_RIDER_NAME) ?: "Rider"
                    val fare = intent.getStringExtra(EXTRA_FARE) ?: "0"
                    showExpandedRideView(riderName, fare)
                }
                ACTION_RIDE_DISMISSED -> {
                    currentRideId = null
                    hideExpandedRideView()
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createBubbleView()

        val filter = IntentFilter().apply {
            addAction(ACTION_RIDE_INCOMING)
            addAction(ACTION_RIDE_DISMISSED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(rideReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(rideReceiver, filter)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun createBubbleView() {
        val bubble = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1A1A2E"))
            setPadding(dpToPx(12), dpToPx(8), dpToPx(12), dpToPx(8))

            val label = TextView(this@OnlineOverlayService).apply {
                text = "🟢 Zibana Online"
                setTextColor(Color.parseColor("#10B981"))
                textSize = 13f
            }
            addView(label)
        }

        bubble.background = android.graphics.drawable.GradientDrawable().apply {
            setColor(Color.parseColor("#1A1A2E"))
            cornerRadius = dpToPx(20).toFloat()
            setStroke(dpToPx(1), Color.parseColor("#10B981"))
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = dpToPx(16)
            y = dpToPx(100)
        }

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isMoved = false

        bubble.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isMoved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (initialTouchX - event.rawX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isMoved = true
                        params.x = initialX + dx
                        params.y = initialY + dy
                        try {
                            windowManager?.updateViewLayout(bubble, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isMoved) {
                        openApp()
                    }
                    true
                }
                else -> false
            }
        }

        try {
            windowManager?.addView(bubble, params)
            bubbleView = bubble
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showExpandedRideView(riderName: String, fare: String) {
        hideExpandedRideView()
        isExpanded = true

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1A1A2E"))
            setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12))
        }

        container.background = android.graphics.drawable.GradientDrawable().apply {
            setColor(Color.parseColor("#1A1A2E"))
            cornerRadius = dpToPx(16).toFloat()
            setStroke(dpToPx(2), Color.parseColor("#EF4444"))
        }

        val titleText = TextView(this).apply {
            text = "🔔 Ride Incoming!"
            setTextColor(Color.WHITE)
            textSize = 16f
        }
        container.addView(titleText)

        val infoText = TextView(this).apply {
            text = "$riderName • $fare"
            setTextColor(Color.parseColor("#AAAAAA"))
            textSize = 14f
            setPadding(0, dpToPx(4), 0, dpToPx(8))
        }
        container.addView(infoText)

        val buttonRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        val declineBtn = Button(this).apply {
            text = "✕ Decline"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#EF4444"))
            textSize = 13f
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginEnd = dpToPx(4)
            layoutParams = lp
            setOnClickListener {
                currentRideId?.let { id ->
                    onOverlayRideAction?.invoke(id, false)
                    hideExpandedRideView()
                }
            }
        }
        buttonRow.addView(declineBtn)

        val acceptBtn = Button(this).apply {
            text = "✓ Accept"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#10B981"))
            textSize = 13f
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginStart = dpToPx(4)
            layoutParams = lp
            setOnClickListener {
                currentRideId?.let { id ->
                    onOverlayRideAction?.invoke(id, true)
                    hideExpandedRideView()
                    openApp()
                }
            }
        }
        buttonRow.addView(acceptBtn)

        container.addView(buttonRow)

        val params = WindowManager.LayoutParams(
            dpToPx(260),
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dpToPx(80)
        }

        try {
            windowManager?.addView(container, params)
            expandedView = container
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hideExpandedRideView() {
        expandedView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
        expandedView = null
        isExpanded = false
    }

    private fun openApp() {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(rideReceiver)
        } catch (_: Exception) {}
        hideExpandedRideView()
        bubbleView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
        bubbleView = null
        super.onDestroy()
    }
}

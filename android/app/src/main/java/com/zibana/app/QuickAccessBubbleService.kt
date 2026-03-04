package com.zibana.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat

class QuickAccessBubbleService : Service() {

    companion object {
        const val CHANNEL_ID = "zibana_quick_access"
        const val NOTIFICATION_ID = 3001
        const val BUBBLE_SIZE_DP = 56

        private var isRunning = false

        fun start(context: Context) {
            if (isRunning) return
            val intent = Intent(context, QuickAccessBubbleService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, QuickAccessBubbleService::class.java)
            context.stopService(intent)
        }

        fun isActive(): Boolean = isRunning
    }

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createBubble()
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

    private fun createBubble() {
        val size = dpToPx(BUBBLE_SIZE_DP)

        val container = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(size, size)
        }

        container.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor("#1A1A2E"))
            setStroke(dpToPx(2), Color.parseColor("#10B981"))
        }

        val iconView = ImageView(this).apply {
            val iconResId = resources.getIdentifier("ic_launcher_foreground", "mipmap", packageName)
            if (iconResId != 0) {
                setImageResource(iconResId)
            } else {
                val fallbackResId = resources.getIdentifier("ic_launcher", "mipmap", packageName)
                if (fallbackResId != 0) {
                    setImageResource(fallbackResId)
                }
            }
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            val padding = dpToPx(8)
            setPadding(padding, padding, padding, padding)
        }

        val iconLP = FrameLayout.LayoutParams(size, size).apply {
            gravity = Gravity.CENTER
        }
        container.addView(iconView, iconLP)

        val greenDot = View(this).apply {
            val dotSize = dpToPx(12)
            layoutParams = FrameLayout.LayoutParams(dotSize, dotSize).apply {
                gravity = Gravity.BOTTOM or Gravity.END
                marginEnd = dpToPx(2)
                bottomMargin = dpToPx(2)
            }
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#10B981"))
                setStroke(dpToPx(1), Color.WHITE)
            }
        }
        container.addView(greenDot)

        val params = WindowManager.LayoutParams(
            size,
            size,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - size - dpToPx(16)
            y = resources.displayMetrics.heightPixels / 2
        }

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isMoved = false

        container.setOnTouchListener { _, event ->
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
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isMoved = true
                        params.x = initialX + dx
                        params.y = initialY + dy
                        try {
                            windowManager?.updateViewLayout(container, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isMoved) {
                        openApp()
                    } else {
                        snapToEdge(container, params)
                    }
                    true
                }
                else -> false
            }
        }

        try {
            windowManager?.addView(container, params)
            bubbleView = container
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun snapToEdge(view: View, params: WindowManager.LayoutParams) {
        val screenWidth = resources.displayMetrics.widthPixels
        val midX = params.x + view.width / 2
        params.x = if (midX < screenWidth / 2) dpToPx(8) else screenWidth - view.width - dpToPx(8)
        try {
            windowManager?.updateViewLayout(view, params)
        } catch (_: Exception) {}
    }

    private fun openApp() {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("restore_route", true)
        }
        startActivity(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Zibana Quick Access",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the Zibana quick access bubble active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zibana Quick Access")
            .setContentText("Tap bubble to open Zibana")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        isRunning = false
        bubbleView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
        bubbleView = null
        super.onDestroy()
    }
}

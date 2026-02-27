package com.zibana.app

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat

class RideIncomingActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_RIDE_ID = "ride_id"
        const val EXTRA_PICKUP = "pickup"
        const val EXTRA_DROPOFF = "dropoff"
        const val EXTRA_FARE = "fare"
        const val EXTRA_CURRENCY = "currency"
        const val EXTRA_RIDER_NAME = "rider_name"
        const val EXTRA_RIDER_RATING = "rider_rating"
        const val EXTRA_DISTANCE = "distance"
        const val EXTRA_DURATION = "duration"

        const val RIDE_CHANNEL_ID = "zibana_ride_incoming_v2"
        const val RIDE_NOTIFICATION_ID = 2001
        const val COUNTDOWN_MS = 12000L
        const val TICK_MS = 100L

        var onRideAction: ((rideId: String, accepted: Boolean) -> Unit)? = null
    }

    private var countDownTimer: CountDownTimer? = null
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioFocusHelper: AudioFocusHelper? = null
    private var rideId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        turnScreenOn()
        setContentView(R.layout.activity_ride_incoming)
        createRideNotificationChannel()

        rideId = intent.getStringExtra(EXTRA_RIDE_ID) ?: ""
        val pickup = intent.getStringExtra(EXTRA_PICKUP) ?: "Pickup location"
        val dropoff = intent.getStringExtra(EXTRA_DROPOFF) ?: "Dropoff location"
        val fare = intent.getStringExtra(EXTRA_FARE) ?: "0"
        val currency = intent.getStringExtra(EXTRA_CURRENCY) ?: "₦"
        val riderName = intent.getStringExtra(EXTRA_RIDER_NAME) ?: "Rider"
        val riderRating = intent.getStringExtra(EXTRA_RIDER_RATING) ?: "5.0"
        val distance = intent.getStringExtra(EXTRA_DISTANCE) ?: ""
        val duration = intent.getStringExtra(EXTRA_DURATION) ?: ""

        findViewById<TextView>(R.id.textRiderName).text = riderName
        findViewById<TextView>(R.id.textRiderRating).text = "★ $riderRating"
        findViewById<TextView>(R.id.textFare).text = "$currency$fare"
        findViewById<TextView>(R.id.textPickup).text = pickup
        findViewById<TextView>(R.id.textDropoff).text = dropoff

        val detailsText = buildString {
            if (distance.isNotEmpty()) append("$distance  ")
            if (duration.isNotEmpty()) append("~$duration")
        }.trim()
        findViewById<TextView>(R.id.textDetails).text = detailsText

        val progressBar = findViewById<ProgressBar>(R.id.progressCountdown)
        val textCountdown = findViewById<TextView>(R.id.textCountdown)
        progressBar.max = COUNTDOWN_MS.toInt()
        progressBar.progress = COUNTDOWN_MS.toInt()

        findViewById<Button>(R.id.buttonAccept).setOnClickListener {
            respondToRide(true)
        }

        findViewById<Button>(R.id.buttonDecline).setOnClickListener {
            respondToRide(false)
        }

        audioFocusHelper = AudioFocusHelper(this)
        audioFocusHelper?.requestFocus()

        startAlertSound()
        startVibration()

        OnlineOverlayService.notifyRideIncoming(this, rideId, riderName, "$currency$fare")

        countDownTimer = object : CountDownTimer(COUNTDOWN_MS, TICK_MS) {
            override fun onTick(millisUntilFinished: Long) {
                progressBar.progress = millisUntilFinished.toInt()
                textCountdown.text = "${(millisUntilFinished / 1000) + 1}s"
            }

            override fun onFinish() {
                progressBar.progress = 0
                textCountdown.text = "0s"
                respondToRide(false)
            }
        }.start()

        showHighPriorityNotification(riderName, pickup, fare, currency)
    }

    private fun turnScreenOn() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguard = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguard.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "zibana:ride_incoming"
        )
        wakeLock?.acquire(COUNTDOWN_MS + 2000)
    }

    private fun startAlertSound() {
        try {
            val soundUri: Uri = try {
                val resId = resources.getIdentifier("ride_alert", "raw", packageName)
                if (resId != 0) {
                    Uri.parse("android.resource://$packageName/$resId")
                } else {
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                }
            } catch (e: Exception) {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@RideIncomingActivity, soundUri)
                isLooping = true
                prepare()
                start()
            }

            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startVibration() {
        val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            val vibrator = vibratorManager.defaultVibrator
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
        }
    }

    private fun stopAlerts() {
        mediaPlayer?.apply {
            try { if (isPlaying) stop() } catch (_: Exception) {}
            try { release() } catch (_: Exception) {}
        }
        mediaPlayer = null

        audioFocusHelper?.abandonFocus()
        audioFocusHelper = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator.cancel()
        } else {
            @Suppress("DEPRECATION")
            (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).cancel()
        }

        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    private fun respondToRide(accepted: Boolean) {
        countDownTimer?.cancel()
        stopAlerts()
        cancelNotification()
        OnlineOverlayService.notifyRideDismissed(this)
        onRideAction?.invoke(rideId, accepted)

        val resultIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("ride_action", if (accepted) "accept" else "decline")
            putExtra("ride_id", rideId)
        }
        startActivity(resultIntent)
        finish()
    }

    private fun createRideNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                RIDE_CHANNEL_ID,
                "Incoming Ride Requests",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority alerts for incoming ride requests"
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun showHighPriorityNotification(riderName: String, pickup: String, fare: String, currency: String) {
        val fullScreenIntent = Intent(this, RideIncomingActivity::class.java).apply {
            putExtras(intent)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, RIDE_CHANNEL_ID)
            .setContentTitle("New Ride Request!")
            .setContentText("$riderName • $currency$fare • $pickup")
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(RIDE_NOTIFICATION_ID, notification)
    }

    private fun cancelNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.cancel(RIDE_NOTIFICATION_ID)
    }

    override fun onDestroy() {
        countDownTimer?.cancel()
        stopAlerts()
        cancelNotification()
        OnlineOverlayService.notifyRideDismissed(this)
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        super.onBackPressed()
        respondToRide(false)
    }
}

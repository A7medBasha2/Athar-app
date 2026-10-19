package com.athar.islamic

import android.animation.ObjectAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * AzanOverlayView
 *
 * Programmatic Luxury Glassmorphism & Gold Islamic Full-Screen Overlay View for Athar.
 * Designed for Android 12, 13, 14, 15, and 16.
 *
 * Refinements:
 * 1. Bottom-Anchored Compact Dock: The glassmorphic card sits directly above the buttons at the bottom,
 *    leaving >75% of the screen completely clear for the sacred mosque photography.
 * 2. Compact 42dp Action Buttons: Three balanced buttons (Log Prayer, Mute/Unmute, Dismiss)
 *    coordinated seamlessly without taking over the screen.
 * 3. Prayer Logging in Tree of Athar (تسجيل الصلاة في شجرة الأثر):
 *    - Real-time astronomical validation: Prevents logging before prayer time arrives.
 *    - Instant transformation to golden checked state ("✓ تم التسجيل") with audio continuing.
 */
class AzanOverlayView(
    context: Context,
    private val prayerId: String,
    private val prayerName: String,
    private val prayerTime: String,
    private val muadhinName: String,
    private val scheduledPrayerEpochMs: Long = 0L,
    private val onToggleMute: () -> Boolean,
    private val onDismiss: () -> Unit
) : FrameLayout(context) {

    companion object {
        private const val TAG = "AzanOverlayView"
        const val ACTION_PRAYER_LOGGED = "com.athar.islamic.ACTION_PRAYER_LOGGED"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var isMuted = false
    private var isPrayerLogged = false

    // UI references
    private lateinit var bgImageView: ImageView
    private lateinit var tvStatusBadge: TextView
    private lateinit var tvEchoAyah: TextView

    // Action Buttons
    private lateinit var btnLogPrayer: LinearLayout
    private lateinit var tvLogPrayerLabel: TextView
    private lateinit var btnMute: LinearLayout
    private lateinit var tvMuteLabel: TextView
    private lateinit var btnDismiss: LinearLayout

    init {
        initLayout()
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun dp(value: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            resources.displayMetrics
        ).toInt()
    }

    private fun initLayout() {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        isClickable = true
        isFocusable = true

        // 1. Dynamic Background Image
        bgImageView = ImageView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        addView(bgImageView)
        loadPrayerSceneBackground(prayerId)

        // 2. Soft Gradient Scrim: Clear at top & center, smoothly shaded at bottom for readability
        val gradientScrim = View(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(
                    Color.parseColor("#44000000"), // Very light at top
                    Color.parseColor("#22000000"), // Clear center
                    Color.parseColor("#66080B0E"), // Lower section
                    Color.parseColor("#E6080B0E"), // Bottom dock area
                    Color.parseColor("#FA080B0E")  // Pinned bottom edge
                )
            )
        }
        addView(gradientScrim)

        // 3. Unified Bottom Dock Container (Anchored at very bottom)
        val bottomDockContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(14)
            val padB = dp(24)
            setPadding(padH, 0, padH, padB)

            val lp = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            }
            layoutParams = lp
        }

        // 3A. Compact Glassmorphic Prayer & Echo Card (Directly above buttons)
        val compactGlassCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(14)
            val padV = dp(10)
            setPadding(padH, padV, padH, padV)

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(10)
            }
            layoutParams = lp

            val cardBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(20f)
                setColor(Color.parseColor("#D90F1317"))
                setStroke(dp(1.2f), Color.parseColor("#59D4AF37")) // Delicate gold outline
            }
            background = cardBg
            elevation = dp(10f)
        }

        // Header Row: Prayer Name + Time + Muadhin in a single compact line
        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(4))
        }

        val tvCrest = TextView(context).apply {
            text = "🕌 "
            textSize = 14f
        }
        infoRow.addView(tvCrest)

        val tvPrayerTitle = TextView(context).apply {
            text = prayerName
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#F7F2E7"))
        }
        infoRow.addView(tvPrayerTitle)

        val tvDividerDot = TextView(context).apply {
            text = "  •  "
            textSize = 13f
            setTextColor(Color.parseColor("#80D4AF37"))
        }
        infoRow.addView(tvDividerDot)

        val tvTimeAndMuadhin = TextView(context).apply {
            val muadhinPart = if (muadhinName.isNotBlank()) " • $muadhinName" else ""
            text = "$prayerTime$muadhinPart"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
        }
        infoRow.addView(tvTimeAndMuadhin)
        compactGlassCard.addView(infoRow)

        // Status Badge (الترديد مع المؤذن / دعاء ما بعد الأذان)
        tvStatusBadge = TextView(context).apply {
            text = "✨ رَدِّدْ مَعَ المُؤَذِّنِ الآن"
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#C8A24A"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(4))
        }
        compactGlassCard.addView(tvStatusBadge)

        // Compact Echo Quote Box
        val quoteBox = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val pad = dp(8)
            setPadding(pad, dp(6), pad, dp(6))
            val boxBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(12f)
                setColor(Color.parseColor("#55000000"))
                setStroke(dp(1), Color.parseColor("#26D4AF37"))
            }
            background = boxBg
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        tvEchoAyah = TextView(context).apply {
            text = "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »"
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFFFF"))
            gravity = Gravity.CENTER
        }
        quoteBox.addView(tvEchoAyah)
        compactGlassCard.addView(quoteBox)

        bottomDockContainer.addView(compactGlassCard)

        // 3B. Compact 3-Button Action Bar (Height: 42dp)
        val buttonBar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(42)
            )
        }

        // Button 1: Log Prayer in Tree of Athar (📿 سجّل الصلاة)
        btnLogPrayer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(42), 1f).apply {
                marginEnd = dp(6)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14f)
                setColor(Color.parseColor("#E6181F26"))
                setStroke(dp(1.2f), Color.parseColor("#99D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        tvLogPrayerLabel = TextView(context).apply {
            text = "📿 سجّل الصلاة"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#F3E5AB"))
            gravity = Gravity.CENTER
        }
        btnLogPrayer.addView(tvLogPrayerLabel)

        btnLogPrayer.setOnClickListener {
            handlePrayerLogging()
        }
        buttonBar.addView(btnLogPrayer)

        // Button 2: Mute / Unmute Live Volume (🔊 كتم)
        btnMute = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(42), 1f).apply {
                marginStart = dp(3)
                marginEnd = dp(3)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14f)
                setColor(Color.parseColor("#DD14181C"))
                setStroke(dp(1.2f), Color.parseColor("#80D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        tvMuteLabel = TextView(context).apply {
            text = "🔊 كتم"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
            gravity = Gravity.CENTER
        }
        btnMute.addView(tvMuteLabel)

        btnMute.setOnClickListener {
            val mutedNow = onToggleMute()
            updateMuteState(mutedNow)
        }
        buttonBar.addView(btnMute)

        // Button 3: Dismiss Button (✕ إغلاق)
        btnDismiss = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(42), 1f).apply {
                marginStart = dp(6)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14f)
                setColor(Color.parseColor("#E6221D15"))
                setStroke(dp(1.2f), Color.parseColor("#D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        val tvDismissLabel = TextView(context).apply {
            text = "✕ إغلاق"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFFFF"))
            gravity = Gravity.CENTER
        }
        btnDismiss.addView(tvDismissLabel)

        btnDismiss.setOnClickListener {
            onDismiss()
        }
        buttonBar.addView(btnDismiss)

        bottomDockContainer.addView(buttonBar)
        addView(bottomDockContainer)
    }

    /**
     * Handles prayer logging with strict astronomical validation (prevents premature logging).
     */
    private fun handlePrayerLogging() {
        if (isPrayerLogged) return

        val nowMs = System.currentTimeMillis()
        // If scheduled epoch is set and time has not arrived yet (with 1-minute grace margin)
        if (scheduledPrayerEpochMs > 0L && nowMs < (scheduledPrayerEpochMs - 60000L)) {
            tvLogPrayerLabel.text = "لم يحن موعدها ⏳"
            tvLogPrayerLabel.setTextColor(Color.parseColor("#FFA726"))
            mainHandler.postDelayed({
                if (!isPrayerLogged) {
                    tvLogPrayerLabel.text = "📿 سجّل الصلاة"
                    tvLogPrayerLabel.setTextColor(Color.parseColor("#F3E5AB"))
                }
            }, 2000L)
            return
        }

        // Valid prayer time: Record in SharedPreferences & persist to Tree of Athar
        try {
            val prefs = AtharPrayerAlarmScheduler.getPrefs(context)
            val todayDateKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(nowMs))
            val cleanId = prayerId.lowercase().trim()
            val prefKey = "prayer_logged_${todayDateKey}_$cleanId"

            prefs.edit().putBoolean(prefKey, true).apply()

            // Broadcast Intent to sync with Android receivers and WebView
            val intent = Intent(ACTION_PRAYER_LOGGED).apply {
                putExtra("prayer_id", cleanId)
                putExtra("date", todayDateKey)
            }
            context.sendBroadcast(intent)
            Log.i(TAG, "Prayer $cleanId successfully recorded in Tree of Athar!")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist prayer log: ${e.message}")
        }

        // Transform into glowing golden checked button
        isPrayerLogged = true
        tvLogPrayerLabel.text = "✓ تم التسجيل"
        tvLogPrayerLabel.setTextColor(Color.parseColor("#07090B"))

        val checkedBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(14f)
            setColor(Color.parseColor("#E6C66E")) // Bright solid 24k gold
            setStroke(dp(1.5f), Color.parseColor("#FFF2C2"))
        }
        btnLogPrayer.background = checkedBg
        btnLogPrayer.isClickable = false
    }

    /**
     * Updates the mute button text smoothly.
     */
    fun updateMuteState(muted: Boolean) {
        isMuted = muted
        if (muted) {
            tvMuteLabel.text = "🔇 استماع"
            tvMuteLabel.setTextColor(Color.parseColor("#B3B3B3"))
        } else {
            tvMuteLabel.text = "🔊 كتم"
            tvMuteLabel.setTextColor(Color.parseColor("#E6C66E"))
        }
    }

    /**
     * Updates the live Muadhin Echo or Post-Adhan Dua text with a smooth alpha cross-fade animation.
     */
    fun updateEchoText(newStatus: String, newText: String) {
        val fadeOut = ObjectAnimator.ofFloat(tvEchoAyah, "alpha", 1f, 0f).apply {
            duration = 180
            interpolator = AccelerateDecelerateInterpolator()
        }
        fadeOut.addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                tvStatusBadge.text = newStatus
                tvEchoAyah.text = newText
                val fadeIn = ObjectAnimator.ofFloat(tvEchoAyah, "alpha", 0f, 1f).apply {
                    duration = 220
                    interpolator = AccelerateDecelerateInterpolator()
                }
                fadeIn.start()
            }
        })
        fadeOut.start()
    }

    /**
     * Loads the high-resolution sacred mosque photo corresponding to the prayer time.
     */
    private fun loadPrayerSceneBackground(pId: String) {
        val cleanId = pId.lowercase().trim()
        val candidateAssetPaths = when {
            cleanId.contains("fajr") -> listOf(
                "public/adhan-scenes/fajr.jpg",
                "adhan-scenes/fajr.jpg",
                "public/assets/adhan_fajr_dawn_kaaba_1791728275991-bAyZIlFq.jpg",
                "public/assets/kaaba_golden_night_1791598384430-Dj3PUkaM.jpg"
            )
            cleanId.contains("dhuhr") -> listOf(
                "public/adhan-scenes/dhuhr.jpg",
                "adhan-scenes/dhuhr.jpg",
                "public/assets/adhan_dhuhr_madinah_sunlight_1791728285777-BfvA5562.jpg"
            )
            cleanId.contains("asr") -> listOf(
                "public/adhan-scenes/asr.jpg",
                "adhan-scenes/asr.jpg",
                "public/assets/adhan_asr_aqsa_golden_hour_1791728295736-ErECDDXo.jpg",
                "public/assets/adhan_golden_minaret_sky_1791721041473-C7hCse1H.jpg"
            )
            cleanId.contains("maghrib") -> listOf(
                "public/adhan-scenes/maghrib.jpg",
                "adhan-scenes/maghrib.jpg",
                "public/assets/adhan_maghrib_sunset_minarets_1791728305890-HmoY-aPS.jpg"
            )
            cleanId.contains("isha") -> listOf(
                "public/adhan-scenes/isha.jpg",
                "adhan-scenes/isha.jpg",
                "public/assets/adhan_isha_night_sanctuary_1791728317277-EW5KEv27.jpg",
                "public/assets/kaaba_golden_night_1791598384430-Dj3PUkaM.jpg"
            )
            else -> listOf(
                "public/adhan-scenes/asr.jpg",
                "adhan-scenes/asr.jpg"
            )
        }

        var loadedBitmap: Bitmap? = null
        for (path in candidateAssetPaths) {
            try {
                var stream: InputStream? = null
                try {
                    stream = context.assets.open(path)
                    loadedBitmap = BitmapFactory.decodeStream(stream)
                    if (loadedBitmap != null) {
                        break
                    }
                } finally {
                    stream?.close()
                }
            } catch (ignored: Exception) {}
        }

        if (loadedBitmap != null) {
            bgImageView.setImageBitmap(loadedBitmap)
        } else {
            val fallbackBg = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    Color.parseColor("#080D12"),
                    Color.parseColor("#121A20"),
                    Color.parseColor("#18222A")
                )
            )
            bgImageView.background = fallbackBg
        }
    }
}

package com.athar.islamic

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
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
 * Full-Screen Royal Cinematic Adhan Screen for Athar.
 * Restored to its majestic design with:
 * 1. Ultra-HD sacred mosque photography with smooth continuous Ken Burns camera motion.
 * 2. Safe inSampleSize bitmap decoding preventing OutOfMemoryError on all devices.
 * 3. Sacred top royal prayer banner with golden Islamic styling.
 * 4. Central Golden Mihrab Echo Card (محراب الترديد الذهبي) for synchronized Takbeers and Dua.
 * 5. Full action bar for prayer logging in Tree of Athar, instant live audio mute, and exit.
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
    private var loadedMosqueBitmap: Bitmap? = null
    private var kenBurnsAnimator: ValueAnimator? = null
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
        setBackgroundColor(Color.parseColor("#050709"))

        // 1. Dynamic Mosque Background Image with full viewport coverage
        bgImageView = ImageView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        addView(bgImageView)
        loadPrayerSceneBackground(prayerId)
        startKenBurnsEffect()

        // 2. Cinematic Multi-Stop Scrim (Preserves sacred mosque view while making gold typography glow)
        val gradientScrim = View(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(
                    Color.parseColor("#CC050709"), // Darkened top for status bar & header
                    Color.parseColor("#33050709"), // Translucent upper center for sky & minarets
                    Color.parseColor("#44050709"), // Center view of sanctuary
                    Color.parseColor("#D907090C"), // Lower section around Mihrab
                    Color.parseColor("#F5050709")  // Deep solid bottom dock
                )
            )
        }
        addView(gradientScrim)

        // 3. Top Royal Prayer Header (Anchored at top with safe-area clearance)
        val topHeaderContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(16)
            val padT = dp(38)
            setPadding(padH, padT, padH, dp(12))

            val lp = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            }
            layoutParams = lp
        }

        // Top Glass Badge
        val topGlassBadge = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(18)
            val padV = dp(10)
            setPadding(padH, padV, padH, padV)

            val badgeBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(22f)
                setColor(Color.parseColor("#E6090D11"))
                setStroke(dp(1.2f), Color.parseColor("#66D4AF37"))
            }
            background = badgeBg
            elevation = dp(8f)
        }

        // Subtitle Announcement Row
        val announcementRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(4))
        }

        val tvCrescent = TextView(context).apply {
            text = "🕌 "
            textSize = 14f
        }
        announcementRow.addView(tvCrescent)

        val tvAnnouncement = TextView(context).apply {
            text = "حَانَ الآنَ مَوْعِدُ الأَذَانِ المُبَارَك"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
        }
        announcementRow.addView(tvAnnouncement)
        topGlassBadge.addView(announcementRow)

        // Majestic Prayer Name
        val tvPrayerTitle = TextView(context).apply {
            text = prayerName
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFDF7"))
            gravity = Gravity.CENTER
            setShadowLayer(10f, 0f, 3f, Color.parseColor("#B3D4AF37"))
        }
        topGlassBadge.addView(tvPrayerTitle)

        // Time and Muadhin details
        val tvMetaDetails = TextView(context).apply {
            val muadhinPart = if (muadhinName.isNotBlank()) "  •  $muadhinName" else ""
            text = "$prayerTime$muadhinPart"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#C8A24A"))
            gravity = Gravity.CENTER
            setPadding(0, dp(2), 0, 0)
        }
        topGlassBadge.addView(tvMetaDetails)
        topHeaderContainer.addView(topGlassBadge)
        addView(topHeaderContainer)

        // 4. Center-Bottom Main Content Container (Contains Mihrab Echo Card + Action Buttons)
        val bottomContentContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(16)
            val padB = dp(28)
            setPadding(padH, 0, padH, padB)

            val lp = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            }
            layoutParams = lp
        }

        // 4A. Royal Golden Mihrab Echo Card (محراب الترديد الذهبي)
        val mihrabCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(18)
            val padV = dp(16)
            setPadding(padH, padV, padH, padV)

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(14)
            }
            layoutParams = lp

            val cardBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(24f)
                setColor(Color.parseColor("#ED0B0F14"))
                setStroke(dp(1.5f), Color.parseColor("#80D4AF37"))
            }
            background = cardBg
            elevation = dp(12f)
        }

        // Mihrab Header Ornament
        tvStatusBadge = TextView(context).apply {
            text = "✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }
        mihrabCard.addView(tvStatusBadge)

        // Arch Calligraphy Frame
        val archFrame = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val padH = dp(14)
            val padV = dp(12)
            setPadding(padH, padV, padH, padV)

            val archBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(16f)
                setColor(Color.parseColor("#80030507"))
                setStroke(dp(1f), Color.parseColor("#40D4AF37"))
            }
            background = archBg
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        tvEchoAyah = TextView(context).apply {
            text = "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »"
            textSize = 21f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFFFF"))
            gravity = Gravity.CENTER
            setShadowLayer(8f, 0f, 2f, Color.parseColor("#80000000"))
        }
        archFrame.addView(tvEchoAyah)
        mihrabCard.addView(archFrame)
        bottomContentContainer.addView(mihrabCard)

        // 4B. Prestigious Action Buttons Dock (Height: 48dp)
        val buttonBar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(48)
            )
        }

        // Button 1: Log Prayer in Tree of Athar
        btnLogPrayer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(48), 1.25f).apply {
                marginEnd = dp(6)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(15f)
                setColor(Color.parseColor("#E6181F26"))
                setStroke(dp(1.3f), Color.parseColor("#99D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        tvLogPrayerLabel = TextView(context).apply {
            text = "📿 سجّل الصلاة"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#F3E5AB"))
            gravity = Gravity.CENTER
        }
        btnLogPrayer.addView(tvLogPrayerLabel)

        btnLogPrayer.setOnClickListener {
            handlePrayerLogging()
        }
        buttonBar.addView(btnLogPrayer)

        // Button 2: Mute / Unmute Live Volume
        btnMute = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(48), 1f).apply {
                marginStart = dp(3)
                marginEnd = dp(3)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(15f)
                setColor(Color.parseColor("#E614181D"))
                setStroke(dp(1.2f), Color.parseColor("#66D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        tvMuteLabel = TextView(context).apply {
            text = "🔊 كتم الصوت"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
            gravity = Gravity.CENTER
        }
        btnMute.addView(tvMuteLabel)

        btnMute.setOnClickListener {
            val muted = onToggleMute()
            updateMuteState(muted)
        }
        buttonBar.addView(btnMute)

        // Button 3: Dismiss Button
        btnDismiss = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(0, dp(48), 0.95f).apply {
                marginStart = dp(6)
            }
            layoutParams = lp

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(15f)
                setColor(Color.parseColor("#E6211A12"))
                setStroke(dp(1.2f), Color.parseColor("#B3D4AF37"))
            }
            background = btnBg
            isClickable = true
            isFocusable = true
        }

        val tvDismissLabel = TextView(context).apply {
            text = "✕ إغلاق"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFFFF"))
            gravity = Gravity.CENTER
        }
        btnDismiss.addView(tvDismissLabel)

        btnDismiss.setOnClickListener {
            onDismiss()
        }
        buttonBar.addView(btnDismiss)

        bottomContentContainer.addView(buttonBar)
        addView(bottomContentContainer)
    }

    /**
     * Activates continuous Ken Burns cinematic slow zoom and pan on the sacred mosque photo.
     */
    private fun startKenBurnsEffect() {
        kenBurnsAnimator?.cancel()
        bgImageView.scaleX = 1.0f
        bgImageView.scaleY = 1.0f
        bgImageView.translationX = 0f
        bgImageView.translationY = 0f

        kenBurnsAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 24000L // 24 seconds majestic slow pan
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { animator ->
                val fraction = (animator.animatedValue as? Float) ?: animator.animatedFraction
                val scale = 1.0f + (0.12f * fraction)
                bgImageView.scaleX = scale
                bgImageView.scaleY = scale
                bgImageView.translationX = dp(22f) * fraction
                bgImageView.translationY = dp(14f) * (1f - fraction)
            }
            start()
        }
    }

    private fun handlePrayerLogging() {
        if (isPrayerLogged) return

        val nowMs = System.currentTimeMillis()
        if (scheduledPrayerEpochMs > 0 && nowMs < (scheduledPrayerEpochMs - 60000L)) {
            tvLogPrayerLabel.text = "لم يحن موعدها ⏳"
            tvLogPrayerLabel.setTextColor(Color.parseColor("#F59E0B"))
            mainHandler.postDelayed({
                if (!isPrayerLogged) {
                    tvLogPrayerLabel.text = "📿 سجّل الصلاة"
                    tvLogPrayerLabel.setTextColor(Color.parseColor("#F3E5AB"))
                }
            }, 2000L)
            return
        }

        try {
            val intent = Intent(ACTION_PRAYER_LOGGED).apply {
                putExtra("prayer_id", prayerId)
                putExtra("prayer_name", prayerName)
                putExtra("logged_at_ms", nowMs)
            }
            context.sendBroadcast(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send prayer logged broadcast: ${e.message}")
        }

        try {
            val prefs = context.getSharedPreferences("athar_prayer_achievements", Context.MODE_PRIVATE)
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            prefs.edit()
                .putBoolean("${todayStr}_${prayerId.lowercase().trim()}", true)
                .putLong("${todayStr}_${prayerId.lowercase().trim()}_ms", nowMs)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist prayer log: ${e.message}")
        }

        // Transform into glowing golden checked button
        isPrayerLogged = true
        tvLogPrayerLabel.text = "✓ تم تسجيل الصلاة"
        tvLogPrayerLabel.setTextColor(Color.parseColor("#07090B"))

        val checkedBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(15f)
            setColor(Color.parseColor("#E6C66E"))
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
            tvMuteLabel.text = "🔇 إلغاء الكتم"
            tvMuteLabel.setTextColor(Color.parseColor("#B3B3B3"))
        } else {
            tvMuteLabel.text = "🔊 كتم الصوت"
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
     * Safe bitmap loading with inSampleSize computation to prevent OutOfMemoryError,
     * decoding sacred mosque photography beautifully onto any screen.
     */
    private fun loadPrayerSceneBackground(pId: String) {
        val cleanId = pId.lowercase().trim()
        val candidateAssetPaths = linkedSetOf(
            "public/adhan-scenes/$cleanId.jpg",
            "adhan-scenes/$cleanId.jpg"
        )

        when {
            cleanId.contains("fajr") -> {
                candidateAssetPaths.add("public/adhan-scenes/fajr.jpg")
                candidateAssetPaths.add("adhan-scenes/fajr.jpg")
                candidateAssetPaths.add("public/assets/adhan_fajr_dawn_kaaba_1791728275991-bAyZIlFq.jpg")
            }
            cleanId.contains("dhuhr") -> {
                candidateAssetPaths.add("public/adhan-scenes/dhuhr.jpg")
                candidateAssetPaths.add("adhan-scenes/dhuhr.jpg")
                candidateAssetPaths.add("public/assets/adhan_dhuhr_madinah_sunlight_1791728285777-BfvA5562.jpg")
            }
            cleanId.contains("asr") -> {
                candidateAssetPaths.add("public/adhan-scenes/asr.jpg")
                candidateAssetPaths.add("adhan-scenes/asr.jpg")
                candidateAssetPaths.add("public/assets/adhan_asr_aqsa_golden_hour_1791728295736-ErECDDXo.jpg")
            }
            cleanId.contains("maghrib") -> {
                candidateAssetPaths.add("public/adhan-scenes/maghrib.jpg")
                candidateAssetPaths.add("adhan-scenes/maghrib.jpg")
                candidateAssetPaths.add("public/assets/adhan_maghrib_sunset_minarets_1791728305890-HmoY-aPS.jpg")
            }
            cleanId.contains("isha") -> {
                candidateAssetPaths.add("public/adhan-scenes/isha.jpg")
                candidateAssetPaths.add("adhan-scenes/isha.jpg")
                candidateAssetPaths.add("public/assets/adhan_isha_night_sanctuary_1791728317277-EW5KEv27.jpg")
            }
        }
        candidateAssetPaths.add("public/adhan-scenes/fajr.jpg")

        val displayMetrics = resources.displayMetrics
        val reqWidth = if (displayMetrics.widthPixels > 0) displayMetrics.widthPixels else 1080
        val reqHeight = if (displayMetrics.heightPixels > 0) displayMetrics.heightPixels else 1920

        var loadedBitmap: Bitmap? = null

        for (path in candidateAssetPaths) {
            try {
                // Pass 1: Decode bounds only
                val boundsOptions = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                var stream: InputStream? = null
                try {
                    stream = context.assets.open(path)
                    BitmapFactory.decodeStream(stream, null, boundsOptions)
                } finally {
                    try { stream?.close() } catch (ignored: Exception) {}
                }

                if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) {
                    continue
                }

                // Compute safe inSampleSize
                var inSampleSize = 1
                val halfHeight = boundsOptions.outHeight / 2
                val halfWidth = boundsOptions.outWidth / 2
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2
                }

                // Pass 2: Decode bitmap safely with sample size
                val decodeOptions = BitmapFactory.Options().apply {
                    this.inSampleSize = inSampleSize
                    this.inPreferredConfig = Bitmap.Config.RGB_565
                    this.inDither = true
                }

                stream = context.assets.open(path)
                try {
                    loadedBitmap = BitmapFactory.decodeStream(stream, null, decodeOptions)
                    if (loadedBitmap != null) {
                        Log.i(TAG, "Decoded sacred mosque background from $path at sampleSize=$inSampleSize")
                        break
                    }
                } finally {
                    try { stream?.close() } catch (ignored: Exception) {}
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Error decoding image at $path: ${t.message}")
            }
        }

        if (loadedBitmap != null) {
            loadedMosqueBitmap = loadedBitmap
            bgImageView.setImageBitmap(loadedBitmap)
        } else {
            loadedMosqueBitmap = null
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

    /**
     * Complete resource cleanup: cancels animators, clears handlers, and immediately recycles large Bitmaps.
     */
    fun cleanup() {
        try {
            kenBurnsAnimator?.removeAllUpdateListeners()
            kenBurnsAnimator?.removeAllListeners()
            kenBurnsAnimator?.cancel()
            kenBurnsAnimator = null
        } catch (ignored: Exception) {}

        mainHandler.removeCallbacksAndMessages(null)

        try {
            bgImageView.setImageBitmap(null)
            if (loadedMosqueBitmap != null && !loadedMosqueBitmap!!.isRecycled) {
                loadedMosqueBitmap?.recycle()
                loadedMosqueBitmap = null
            }
        } catch (ignored: Exception) {}
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        cleanup()
    }
}

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

    private lateinit var bgImageView: ImageView
    private var loadedMosqueBitmap: Bitmap? = null
    private var kenBurnsAnimator: ValueAnimator? = null
    private lateinit var tvStatusBadge: TextView
    private lateinit var tvEchoAyah: TextView

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

    private fun dpFloat(value: Float): Float {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            resources.displayMetrics
        )
    }

    private fun initLayout() {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        isClickable = true
        isFocusable = true
        setBackgroundColor(Color.parseColor("#050709"))

        bgImageView = ImageView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        addView(bgImageView)
        loadPrayerSceneBackground(prayerId)
        startKenBurnsEffect()

        val gradientScrim = View(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(
                    Color.parseColor("#CC050709"),
                    Color.parseColor("#33050709"),
                    Color.parseColor("#44050709"),
                    Color.parseColor("#D907090C"),
                    Color.parseColor("#F5050709")
                )
            )
        }
        addView(gradientScrim)

        val topHeaderContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(16)
            val padT = dp(38)
            setPadding(padH, padT, padH, dp(12))

            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            }
        }

        val topGlassBadge = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(18)
            val padV = dp(10)
            setPadding(padH, padV, padH, padV)

            val badgeBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(22f)
                setColor(Color.parseColor("#E6090D11"))
                setStroke(dpFloat(1.2f).toInt(), Color.parseColor("#66D4AF37"))
            }
            background = badgeBg
            elevation = dpFloat(8f)
        }

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

        val tvPrayerTitle = TextView(context).apply {
            text = prayerName
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#FFFDF7"))
            gravity = Gravity.CENTER
            setShadowLayer(10f, 0f, 3f, Color.parseColor("#B3D4AF37"))
        }
        topGlassBadge.addView(tvPrayerTitle)

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

        val bottomContentContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(16)
            val padB = dp(28)
            setPadding(padH, 0, padH, padB)

            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            }
        }

        val mihrabCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padH = dp(18)
            val padV = dp(16)
            setPadding(padH, padV, padH, padV)

            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(14)
            }

            val cardBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(24f)
                setColor(Color.parseColor("#ED0B0F14"))
                setStroke(dpFloat(1.5f).toInt(), Color.parseColor("#80D4AF37"))
            }
            background = cardBg
            elevation = dpFloat(12f)
        }

        tvStatusBadge = TextView(context).apply {
            text = "✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E6C66E"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }
        mihrabCard.addView(tvStatusBadge)

        val archFrame = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val padH = dp(14)
            val padV = dp(12)
            setPadding(padH, padV, padH, padV)

            val archBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(16f)
                setColor(Color.parseColor("#80030507"))
                setStroke(dpFloat(1f).toInt(), Color.parseColor("#40D4AF37"))
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

        val buttonBar = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(48)
            )
        }

        btnLogPrayer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, dp(48), 1.25f).apply {
                marginEnd = dp(6)
            }

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(15f)
                setColor(Color.parseColor("#E6181F26"))
                setStroke(dpFloat(1.3f).toInt(), Color.parseColor("#99D4AF37"))
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
        checkInitialPrayerState()
        buttonBar.addView(btnLogPrayer)

        btnMute = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, dp(48), 1f).apply {
                marginStart = dp(3)
                marginEnd = dp(3)
            }

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(15f)
                setColor(Color.parseColor("#E614181D"))
                setStroke(dpFloat(1.2f).toInt(), Color.parseColor("#66D4AF37"))
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

        btnDismiss = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, dp(48), 0.95f).apply {
                marginStart = dp(6)
            }

            val btnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpFloat(15f)
                setColor(Color.parseColor("#E6211A12"))
                setStroke(dpFloat(1.2f).toInt(), Color.parseColor("#B3D4AF37"))
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
            btnDismiss.isEnabled = false
            btnDismiss.isClickable = false
            onDismiss()
        }
        buttonBar.addView(btnDismiss)

        bottomContentContainer.addView(buttonBar)
        addView(bottomContentContainer)
    }

    private fun startKenBurnsEffect() {
        kenBurnsAnimator?.cancel()
        bgImageView.scaleX = 1.0f
        bgImageView.scaleY = 1.0f
        bgImageView.translationX = 0f
        bgImageView.translationY = 0f

        kenBurnsAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 24000L
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { animator ->
                val fraction = (animator.animatedValue as? Float) ?: animator.animatedFraction
                val scale = 1.0f + (0.12f * fraction)
                bgImageView.scaleX = scale
                bgImageView.scaleY = scale
                bgImageView.translationX = dpFloat(22f) * fraction
                bgImageView.translationY = dpFloat(14f) * (1f - fraction)
            }
            start()
        }
    }

    private fun handlePrayerLogging() {
        if (isPrayerLogged) return

        val nowMs = System.currentTimeMillis()
        val cleanKey = prayerId.lowercase().replace("صلاة ", "").trim()
        val isPremature = (scheduledPrayerEpochMs > 0 && nowMs < (scheduledPrayerEpochMs - 60000L))

        if (isPremature) {
            tvLogPrayerLabel.text = "لم يدخل وقت الصلاة بعد ⏳"
            tvLogPrayerLabel.setTextColor(Color.parseColor("#F59E0B"))
            mainHandler.postDelayed({
                if (!isPrayerLogged) {
                    tvLogPrayerLabel.text = "تسجيل في شجرة الأثر ✨"
                    tvLogPrayerLabel.setTextColor(Color.parseColor("#F3E5AB"))
                }
            }, 2500L)
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
                .putBoolean("${todayStr}_${cleanKey}", true)
                .putLong("${todayStr}_${cleanKey}_ms", nowMs)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist prayer log: ${e.message}")
        }

        isPrayerLogged = true
        tvLogPrayerLabel.text = "سُجِّلت في شجرة الأثر ✓"
        tvLogPrayerLabel.setTextColor(Color.parseColor("#07090B"))

        val checkedBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpFloat(15f)
            setColor(Color.parseColor("#E6C66E"))
            setStroke(dpFloat(1.5f).toInt(), Color.parseColor("#FFF2C2"))
        }
        btnLogPrayer.background = checkedBg
        btnLogPrayer.isClickable = false
        btnLogPrayer.isEnabled = false
    }

    private fun checkInitialPrayerState() {
        try {
            val prefs = context.getSharedPreferences("athar_prayer_achievements", Context.MODE_PRIVATE)
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val cleanKey = prayerId.lowercase().replace("صلاة ", "").trim()
            val alreadyLogged = prefs.getBoolean("${todayStr}_${cleanKey}", false)
            if (alreadyLogged) {
                isPrayerLogged = true
                tvLogPrayerLabel.text = "سُجِّلت في شجرة الأثر ✓"
                tvLogPrayerLabel.setTextColor(Color.parseColor("#07090B"))
                val checkedBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpFloat(15f)
                    setColor(Color.parseColor("#E6C66E"))
                    setStroke(dpFloat(1.5f).toInt(), Color.parseColor("#FFF2C2"))
                }
                btnLogPrayer.background = checkedBg
                btnLogPrayer.isClickable = false
                btnLogPrayer.isEnabled = false
                return
            }

            val nowMs = System.currentTimeMillis()
            val isPremature = (scheduledPrayerEpochMs > 0 && nowMs < (scheduledPrayerEpochMs - 60000L))

            if (isPremature) {
                tvLogPrayerLabel.text = "لم يدخل وقت الصلاة بعد ⏳"
                tvLogPrayerLabel.setTextColor(Color.parseColor("#9CA3AF"))
                val disabledBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpFloat(15f)
                    setColor(Color.parseColor("#8014181D"))
                    setStroke(dpFloat(1f).toInt(), Color.parseColor("#40D4AF37"))
                }
                btnLogPrayer.background = disabledBg
                btnLogPrayer.isClickable = false
                btnLogPrayer.isEnabled = false
            } else {
                tvLogPrayerLabel.text = "تسجيل في شجرة الأثر ✨"
                tvLogPrayerLabel.setTextColor(Color.parseColor("#F3E5AB"))
                btnLogPrayer.isClickable = true
                btnLogPrayer.isEnabled = true
            }
        } catch (e: Exception) {
            Log.w(TAG, "checkInitialPrayerState error: ${e.message}")
        }
    }

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

    fun updateEchoText(newStatus: String, newText: String) {
        val current = tvEchoAyah.text?.toString()?.trim() ?: ""
        if (current == newText.trim()) {
            return
        }
        tvStatusBadge.text = newStatus
        tvEchoAyah.text = newText
    }

    private fun loadPrayerSceneBackground(pId: String) {
        val cleanId = pId.lowercase().trim()
        val candidateAssetPaths = linkedSetOf(
            "public/adhan-scenes/$cleanId.webp",
            "adhan-scenes/$cleanId.webp",
            "public/adhan-scenes/$cleanId.jpg",
            "adhan-scenes/$cleanId.jpg"
        )

        when {
            cleanId.contains("fajr") -> {
                candidateAssetPaths.add("public/adhan-scenes/fajr.webp")
                candidateAssetPaths.add("adhan-scenes/fajr.webp")
                candidateAssetPaths.add("public/adhan-scenes/fajr.jpg")
                candidateAssetPaths.add("adhan-scenes/fajr.jpg")
            }
            cleanId.contains("dhuhr") -> {
                candidateAssetPaths.add("public/adhan-scenes/dhuhr.webp")
                candidateAssetPaths.add("adhan-scenes/dhuhr.webp")
                candidateAssetPaths.add("public/adhan-scenes/dhuhr.jpg")
                candidateAssetPaths.add("adhan-scenes/dhuhr.jpg")
            }
            cleanId.contains("asr") -> {
                candidateAssetPaths.add("public/adhan-scenes/asr.webp")
                candidateAssetPaths.add("adhan-scenes/asr.webp")
                candidateAssetPaths.add("public/adhan-scenes/asr.jpg")
                candidateAssetPaths.add("adhan-scenes/asr.jpg")
            }
            cleanId.contains("maghrib") -> {
                candidateAssetPaths.add("public/adhan-scenes/maghrib.webp")
                candidateAssetPaths.add("adhan-scenes/maghrib.webp")
                candidateAssetPaths.add("public/adhan-scenes/maghrib.jpg")
                candidateAssetPaths.add("adhan-scenes/maghrib.jpg")
            }
            cleanId.contains("isha") -> {
                candidateAssetPaths.add("public/adhan-scenes/isha.webp")
                candidateAssetPaths.add("adhan-scenes/isha.webp")
                candidateAssetPaths.add("public/adhan-scenes/isha.jpg")
                candidateAssetPaths.add("adhan-scenes/isha.jpg")
            }
        }
        candidateAssetPaths.add("public/adhan-scenes/fajr.webp")
        candidateAssetPaths.add("adhan-scenes/fajr.webp")
        candidateAssetPaths.add("public/adhan-scenes/fajr.jpg")

        val displayMetrics = resources.displayMetrics
        val reqWidth = if (displayMetrics.widthPixels > 0) displayMetrics.widthPixels else 1080
        val reqHeight = if (displayMetrics.heightPixels > 0) displayMetrics.heightPixels else 1920

        var loadedBitmap: Bitmap? = null

        for (path in candidateAssetPaths) {
            try {
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

                var inSampleSize = 1
                val halfHeight = boundsOptions.outHeight / 2
                val halfWidth = boundsOptions.outWidth / 2
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2
                }

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
            loadedMosqueBitmap = null
        } catch (ignored: Exception) {}
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        cleanup()
    }
}

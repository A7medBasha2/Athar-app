package com.athar.islamic

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.CountDownTimer
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

class AzanOverlayView(
    context: Context,
    private val prayerId: String,
    private val prayerName: String,
    private val prayerTime: String,
    private val muadhinName: String,
    private val scheduledPrayerEpochMs: Long,
    private val onToggleMute: () -> Unit,
    private val onDismiss: () -> Unit
) : FrameLayout(context) {

    private var echoTitleView: TextView? = null
    private var echoBodyView: TextView? = null
    private var muteButton: TextView? = null
    private var countdownTimer: CountDownTimer? = null
    private var timeRemainingView: TextView? = null

    init {
        layoutDirection = LAYOUT_DIRECTION_RTL
        setupUI()
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun setupUI() {
        // Fullscreen Background Container with dynamic immersive styling
        val rootContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutDirection = LAYOUT_DIRECTION_RTL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), dp(40), dp(20), dp(30))

            val bg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                colors = intArrayOf(
                    Color.parseColor("#E6080503"),
                    Color.parseColor("#F20F0C07"),
                    Color.parseColor("#FC050402")
                )
                orientation = GradientDrawable.Orientation.TOP_BOTTOM
            }
            background = bg
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }

        // Top Header Row (Prayer Badge & Mute / Dismiss Buttons)
        val headerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutDirection = LAYOUT_DIRECTION_RTL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(24)
            }
        }

        val prayerBadge = TextView(context).apply {
            text = "🕌 حان الآن موعد $prayerName"
            setTextColor(Color.parseColor("#FFF4D0"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f) // تم التعديل إلى 14f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(16), dp(8), dp(16), dp(8))

            val badgeBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                colors = intArrayOf(Color.parseColor("#4A3515"), Color.parseColor("#281C0B"))
                orientation = GradientDrawable.Orientation.RIGHT_LEFT
                cornerRadius = 16f // تم التعديل إلى 16f
                setStroke(dp(1), Color.parseColor("#D4AF37"))
            }
            background = badgeBg
        }
        headerRow.addView(prayerBadge)

        val spacer = View(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
        }
        headerRow.addView(spacer)

        // Mute Toggle Button
        val mBtn = TextView(context).apply {
            text = "🔊 صوت"
            setTextColor(Color.parseColor("#E6C66E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f) // تم التعديل إلى 12f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(12), dp(8), dp(12), dp(8))

            val mBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#1F180E"))
                cornerRadius = 12f // تم التعديل إلى 12f
                setStroke(dp(1), Color.parseColor("#C8A24A"))
            }
            background = mBg
            isClickable = true
            isFocusable = true
            setOnClickListener {
                onToggleMute()
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = dp(8)
            }
        }
        muteButton = mBtn
        headerRow.addView(mBtn)

        // Dismiss Button
        val dismissBtn = TextView(context).apply {
            text = "✕ إغلاق"
            setTextColor(Color.parseColor("#E6C66E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f) // تم التعديل إلى 12f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(14), dp(8), dp(14), dp(8))

            val dBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#1F180E"))
                cornerRadius = 12f // تم التعديل إلى 12f
                setStroke(dp(1), Color.parseColor("#C8A24A"))
            }
            background = dBg
            isClickable = true
            isFocusable = true
            setOnClickListener {
                onDismiss()
            }
        }
        headerRow.addView(dismissBtn)
        rootContainer.addView(headerRow)

        // Central Glassmorphism Sanctuary Card for Adhan & Muadhin Echo
        val sanctuaryCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutDirection = LAYOUT_DIRECTION_RTL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(32), dp(24), dp(32))

            val cardBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                colors = intArrayOf(
                    Color.parseColor("#261C10"),
                    Color.parseColor("#140F08"),
                    Color.parseColor("#0A0704")
                )
                orientation = GradientDrawable.Orientation.TOP_BOTTOM
                cornerRadius = 28f // تم التعديل إلى 28f
                setStroke(dp(2), Color.parseColor("#D4AF37"))
            }
            background = cardBg

            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(20)
                bottomMargin = dp(20)
            }
            layoutParams = lp
        }

        val muadhinTitle = TextView(context).apply {
            text = "🎙️ مؤذن الفناء: $muadhinName"
            setTextColor(Color.parseColor("#E6C66E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f) // تم التعديل إلى 13f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(16)
            }
        }
        sanctuaryCard.addView(muadhinTitle)

        // Echo Title (الترديد مع المؤذن)
        val echoTitle = TextView(context).apply {
            text = "• جاري الأذان - رَدِّدْ مَعَ المُؤَذِّن •"
            setTextColor(Color.parseColor("#FFF4D0"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f) // تم التعديل إلى 15f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(14)
            }
        }
        echoTitleView = echoTitle
        sanctuaryCard.addView(echoTitle)

        // Echo Body (Phrases)
        val echoBody = TextView(context).apply {
            text = "« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »"
            setTextColor(Color.parseColor("#F9F1DF"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f) // تم التعديل إلى 20f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setLineSpacing(dp(6f), 1.1f)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(24)
            }
        }
        echoBodyView = echoBody
        sanctuaryCard.addView(echoBody)

        rootContainer.addView(sanctuaryCard)

        // Bottom Action / Sanctuary Footer
        val footerLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(16)
            }
        }

        val footerText = TextView(context).apply {
            text = "« الصلاة تساوى الدنيا وما فيها »"
            setTextColor(Color.parseColor("#D4AF37"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f) // تم التعديل إلى 13f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        footerLayout.addView(footerText)

        rootContainer.addView(footerLayout)
        addView(rootContainer)
    }

    fun updateEchoText(title: String, body: String) {
        echoTitleView?.text = title
        echoBodyView?.text = body
    }

    fun updateMuteState(isMuted: Boolean) {
        muteButton?.text = if (isMuted) "🔇 كتم" else "🔊 صوت"
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        countdownTimer?.cancel()
        countdownTimer = null
    }
}

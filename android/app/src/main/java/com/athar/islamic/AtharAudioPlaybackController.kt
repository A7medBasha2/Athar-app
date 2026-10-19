package com.athar.islamic

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes as Media3AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

/**
 * AtharAudioPlaybackController
 * 
 * The SINGLE AUTHORITATIVE AUDIO CONTROLLER for all reminder and Adhan playback
 * across Android, backed by Android Media3 ExoPlayer.
 * 
 * Guarantees:
 * 1. Exactly ONE audio session active at any time.
 * 2. Idempotent commands (repeated calls cannot start competing players).
 * 3. Exact millisecond position preservation during Mute and Resume.
 * 4. Proper AudioFocus handling during phone calls and interruptions.
 * 5. Clean resource release on completion or dismissal.
 */
@OptIn(UnstableApi::class)
object AtharAudioPlaybackController {

    enum class PlaybackState {
        IDLE,
        PLAYING,
        MUTED,
        PAUSED,
        STOPPED,
        COMPLETED
    }

    interface PlaybackListener {
        fun onPlaybackStateChanged(state: PlaybackState, positionMs: Long, durationMs: Long)
        fun onAudioCompleted(sessionId: String, category: String)
    }

    private val lock = Any()
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile private var exoPlayer: ExoPlayer? = null
    @Volatile private var currentSessionId: String? = null
    @Volatile private var currentCategory: String? = null
    @Volatile private var currentAudioUrl: String? = null
    @Volatile private var currentState: PlaybackState = PlaybackState.IDLE
    @Volatile private var pausedPositionMs: Long = 0L
    @Volatile private var sessionDurationMs: Long = 0L

    private val isMutedFlag = AtomicBoolean(false)
    private val isPausedByCallFlag = AtomicBoolean(false)

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var cpuWakeLock: PowerManager.WakeLock? = null

    private val listeners = CopyOnWriteArrayList<PlaybackListener>()

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                isPausedByCallFlag.set(true)
                pause(null)
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                // Do not auto-resume after phone calls to avoid jarring user
            }
        }
    }

    fun addListener(listener: PlaybackListener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener)
        }
    }

    fun removeListener(listener: PlaybackListener) {
        listeners.remove(listener)
    }

    private fun notifyState() {
        val st = currentState
        val pos = getPositionMs()
        val dur = getDurationMs()
        mainHandler.post {
            listeners.forEach {
                try {
                    it.onPlaybackStateChanged(st, pos, dur)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun notifyCompleted(sessionId: String, category: String) {
        mainHandler.post {
            listeners.forEach {
                try {
                    it.onAudioCompleted(sessionId, category)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    fun getState(): PlaybackState = currentState
    fun isPlaying(): Boolean = currentState == PlaybackState.PLAYING || currentState == PlaybackState.MUTED
    fun isMuted(): Boolean = isMutedFlag.get() || currentState == PlaybackState.MUTED
    fun getSessionId(): String? = currentSessionId
    fun getCategory(): String? = currentCategory

    fun getPositionMs(): Long {
        synchronized(lock) {
            return when {
                currentState == PlaybackState.PAUSED -> pausedPositionMs
                exoPlayer != null -> exoPlayer?.currentPosition ?: pausedPositionMs
                else -> pausedPositionMs
            }
        }
    }

    fun getDurationMs(): Long {
        synchronized(lock) {
            val d = exoPlayer?.duration ?: C.TIME_UNSET
            return if (d != C.TIME_UNSET && d > 0) d else sessionDurationMs
        }
    }

    /**
     * Start or adopt an authoritative playback session.
     * IDEMPOTENT: If already playing this sessionId, does not recreate player.
     */
    fun play(
        context: Context,
        audioSource: String,
        category: String,
        sessionId: String,
        startOffsetMs: Long = 0L,
        isAdhan: Boolean = false
    ) {
        mainHandler.post {
            synchronized(lock) {
                // If same session is already active and playing, do not restart
                if (currentSessionId == sessionId && exoPlayer != null && isPlaying()) {
                    return@synchronized
                }

                // If resuming a paused session of the same ID
                if (currentSessionId == sessionId && exoPlayer != null && currentState == PlaybackState.PAUSED) {
                    resume(context)
                    return@synchronized
                }

                // Stop any previous playback completely
                stopAndReleaseInternal()

                currentSessionId = sessionId
                currentCategory = category
                currentAudioUrl = audioSource
                pausedPositionMs = startOffsetMs
                isMutedFlag.set(false)
                isPausedByCallFlag.set(false)

                acquireWakeLock(context, if (isAdhan) 240000L else 45000L, turnScreenOn = isAdhan)

                // 1. Audio Focus
                val attributes = Media3AudioAttributes.Builder()
                    .setUsage(if (isAdhan) C.USAGE_ALARM else C.USAGE_NOTIFICATION_EVENT)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build()

                requestAudioFocus(context, isAdhan)

                // 2. Build ExoPlayer
                val player = ExoPlayer.Builder(context.applicationContext)
                    .setAudioAttributes(attributes, !isAdhan)
                    .setHandleAudioBecomingNoisy(true)
                    .setWakeMode(C.WAKE_MODE_LOCAL)
                    .build()

                exoPlayer = player

                player.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        when (playbackState) {
                            Player.STATE_ENDED -> {
                                synchronized(lock) {
                                    val finishedId = currentSessionId ?: ""
                                    val finishedCat = currentCategory ?: ""
                                    currentState = PlaybackState.COMPLETED
                                    pausedPositionMs = 0L
                                    abandonAudioFocus()
                                    releaseWakeLock()
                                    notifyState()
                                    notifyCompleted(finishedId, finishedCat)
                                    stopAndReleaseInternal()
                                }
                            }
                            Player.STATE_READY -> {
                                synchronized(lock) {
                                    if (player.duration != C.TIME_UNSET && player.duration > 0) {
                                        sessionDurationMs = player.duration
                                    }
                                    if (currentState != PlaybackState.MUTED && currentState != PlaybackState.PAUSED) {
                                        currentState = PlaybackState.PLAYING
                                    }
                                    notifyState()
                                }
                            }
                            else -> {}
                        }
                    }
                })

                // 3. Resolve MediaItem (Asset file or remote URL)
                val mediaItem = resolveMediaItem(context, audioSource)
                player.setMediaItem(mediaItem)
                player.prepare()

                if (startOffsetMs > 0L) {
                    player.seekTo(startOffsetMs)
                }

                val masterMuted = AtharNotificationManager.isMasterMuted(context)
                val masterVol = AtharNotificationManager.getMasterVolume(context)

                if (masterMuted) {
                    player.volume = 0f
                    currentState = PlaybackState.MUTED
                    isMutedFlag.set(true)
                } else {
                    player.volume = masterVol
                    currentState = PlaybackState.PLAYING
                    isMutedFlag.set(false)
                }

                player.play()
                notifyState()
            }
        }
    }

    fun mute(context: Context?) {
        mainHandler.post {
            synchronized(lock) {
                exoPlayer?.let { p ->
                    p.volume = 0f
                    isMutedFlag.set(true)
                    currentState = PlaybackState.MUTED
                    notifyState()
                }
            }
        }
    }

    fun unmute(context: Context?) {
        mainHandler.post {
            synchronized(lock) {
                exoPlayer?.let { p ->
                    val vol = if (context != null) AtharNotificationManager.getMasterVolume(context) else 1.0f
                    p.volume = Math.max(0.2f, vol)
                    isMutedFlag.set(false)
                    currentState = PlaybackState.PLAYING
                    notifyState()
                }
            }
        }
    }

    fun toggleMute(context: Context?) {
        if (isMuted()) {
            unmute(context)
        } else {
            mute(context)
        }
    }

    fun pause(context: Context?) {
        mainHandler.post {
            synchronized(lock) {
                exoPlayer?.let { p ->
                    pausedPositionMs = p.currentPosition
                    p.pause()
                    currentState = PlaybackState.PAUSED
                    notifyState()
                }
            }
        }
    }

    fun resume(context: Context?) {
        mainHandler.post {
            synchronized(lock) {
                exoPlayer?.let { p ->
                    if (pausedPositionMs > 0L) {
                        p.seekTo(pausedPositionMs)
                    }
                    val vol = if (context != null) AtharNotificationManager.getMasterVolume(context) else 1.0f
                    p.volume = if (isMutedFlag.get()) 0f else vol
                    p.play()
                    currentState = if (isMutedFlag.get()) PlaybackState.MUTED else PlaybackState.PLAYING
                    notifyState()
                }
            }
        }
    }

    fun stop(context: Context? = null) {
        mainHandler.post {
            synchronized(lock) {
                stopAndReleaseInternal()
                notifyState()
            }
        }
    }

    private fun stopAndReleaseInternal() {
        try {
            exoPlayer?.stop()
            exoPlayer?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        exoPlayer = null
        currentState = PlaybackState.STOPPED
        abandonAudioFocus()
        releaseWakeLock()
    }

    private fun resolveMediaItem(context: Context, audioPathOrUrl: String): MediaItem {
        // Direct remote stream
        if (audioPathOrUrl.startsWith("http://") || audioPathOrUrl.startsWith("https://")) {
            return MediaItem.fromUri(Uri.parse(audioPathOrUrl))
        }

        // Clean local asset path
        val clean = audioPathOrUrl.removePrefix("public/").removePrefix("/")
        return MediaItem.fromUri(Uri.parse("asset:///$clean"))
    }

    private fun requestAudioFocus(context: Context, isHighPriority: Boolean): Boolean {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        audioManager = am
        val focusGain = if (isHighPriority) {
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
        } else {
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        }

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val legacyAttributes = AudioAttributes.Builder()
                    .setUsage(if (isHighPriority) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()

                val request = AudioFocusRequest.Builder(focusGain)
                    .setAudioAttributes(legacyAttributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setWillPauseWhenDucked(true)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener, mainHandler)
                    .build()
                audioFocusRequest = request
                am.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    audioFocusChangeListener,
                    if (isHighPriority) AudioManager.STREAM_ALARM else AudioManager.STREAM_NOTIFICATION,
                    focusGain
                ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun abandonAudioFocus() {
        try {
            val am = audioManager
            if (am != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest?.let { req -> am.abandonAudioFocusRequest(req) }
                    audioFocusRequest = null
                } else {
                    @Suppress("DEPRECATION")
                    am.abandonAudioFocus(audioFocusChangeListener)
                }
            }
        } catch (ignored: Exception) {}
    }

    private fun acquireWakeLock(context: Context, timeoutMs: Long, turnScreenOn: Boolean) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (turnScreenOn && pm.isInteractive == false) {
                try {
                    @Suppress("DEPRECATION")
                    val screenLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                        "Athar::ExoPlayerScreenWake"
                    )
                    screenLock.acquire(15000L)
                } catch (ignored: Exception) {}
            }

            if (cpuWakeLock == null) {
                cpuWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Athar::ExoPlayerExecutionWakeLock")
                cpuWakeLock?.setReferenceCounted(false)
            }
            if (cpuWakeLock?.isHeld != true) {
                cpuWakeLock?.acquire(timeoutMs)
            }
        } catch (ignored: Exception) {}
    }

    private fun releaseWakeLock() {
        try {
            if (cpuWakeLock?.isHeld == true) {
                cpuWakeLock?.release()
            }
        } catch (ignored: Exception) {}
    }
}

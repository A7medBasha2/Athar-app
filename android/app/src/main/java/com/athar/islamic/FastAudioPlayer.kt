package com.athar.islamic

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes as Media3AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

/**
 * FastAudioPlayer
 *
 * High-performance, rock-solid audio controller for Athar notifications and Adhan.
 * Backed by native Android MediaPlayer with AssetFileDescriptor for instant, 0-latency bundled APK playback,
 * with graceful ExoPlayer fallback for remote audio streams.
 */
@OptIn(UnstableApi::class)
object FastAudioPlayer {

    private const val TAG = "FastAudioPlayer"
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var nativeMediaPlayer: MediaPlayer? = null

    @Volatile
    private var exoPlayer: ExoPlayer? = null

    @Volatile
    private var activeListener: AudioListener? = null

    @Volatile
    private var isPlayingAudio: Boolean = false

    @Volatile
    private var currentDurationMs: Long = 0L

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    private var progressRunnable: Runnable? = null
    private var watchdogRunnable: Runnable? = null

    interface AudioListener {
        fun onReady(durationMs: Long)
        fun onProgress(currentMs: Long, durationMs: Long)
        fun onEnded()
        fun onError(error: String)
    }

    @Volatile
    private var isMutedState: Boolean = false

    fun isMuted(): Boolean = isMutedState

    fun toggleMute(): Boolean {
        isMutedState = !isMutedState
        applyMuteState()
        return isMutedState
    }

    fun setMuted(muted: Boolean) {
        isMutedState = muted
        applyMuteState()
    }

    private fun applyMuteState() {
        val vol = if (isMutedState) 0f else 1.0f
        try {
            nativeMediaPlayer?.setVolume(vol, vol)
        } catch (ignored: Exception) {}
        try {
            exoPlayer?.volume = vol
        } catch (ignored: Exception) {}
    }

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS -> {
                pause()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                if (!isMutedState) {
                    applyMuteState()
                }
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                if (!isMutedState) {
                    applyMuteState()
                }
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                if (!isMutedState) {
                    applyMuteState()
                    resume()
                }
            }
        }
    }

    /**
     * Resolves local APK asset file descriptor with multiple candidate path lookups.
     */
    private fun findAssetFd(context: Context, rawUrl: String): AssetFileDescriptor? {
        val clean = rawUrl.trim()
            .removePrefix("file:///android_asset/")
            .removePrefix("asset:///")

        val fileName = clean.substringAfterLast("/")
        val candidates = linkedSetOf(
            clean,
            clean.removePrefix("/"),
            "public/" + clean.removePrefix("/"),
            "public/audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "public/audio/$fileName",
            "audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "audio/$fileName",
            fileName
        )

        for (candidate in candidates) {
            try {
                val afd = context.assets.openFd(candidate)
                Log.i(TAG, "Successfully located asset audio at: $candidate")
                return afd
            } catch (ignored: Exception) {}
        }
        return null
    }

    private fun getOrCreateExoPlayer(context: Context): ExoPlayer {
        val existing = exoPlayer
        if (existing != null) return existing

        val media3AudioAttributes = Media3AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        val player = ExoPlayer.Builder(context.applicationContext)
            .setAudioAttributes(media3AudioAttributes, /* handleAudioFocus = */ false)
            .build()

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_READY -> {
                        watchdogRunnable?.let { mainHandler.removeCallbacks(it) }
                        val dur = player.duration
                        currentDurationMs = if (dur > 0) dur else 0L
                        isPlayingAudio = player.isPlaying
                        activeListener?.onReady(currentDurationMs)
                        startProgressTracker()
                    }
                    Player.STATE_ENDED -> {
                        stopProgressTracker()
                        isPlayingAudio = false
                        abandonAudioFocus()
                        activeListener?.onEnded()
                    }
                    Player.STATE_IDLE, Player.STATE_BUFFERING -> {}
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                isPlayingAudio = isPlaying
                if (isPlaying) {
                    startProgressTracker()
                } else {
                    stopProgressTracker()
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                Log.e(TAG, "ExoPlayer error: ${error.message}", error)
                watchdogRunnable?.let { mainHandler.removeCallbacks(it) }
                stopProgressTracker()
                isPlayingAudio = false
                abandonAudioFocus()
                activeListener?.onError(error.localizedMessage ?: "Audio error")
            }
        })

        exoPlayer = player
        return player
    }

    private fun buildMediaItem(rawUrl: String): MediaItem {
        val cleanUrl = rawUrl.trim()
        val uri: Uri = when {
            cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") -> Uri.parse(cleanUrl)
            cleanUrl.contains("/audio/") || cleanUrl.contains("audio/") -> {
                val subPath = cleanUrl.substringAfter("audio/").trimStart('/')
                Uri.parse("asset:///public/audio/$subPath")
            }
            cleanUrl.startsWith("/") -> Uri.parse("asset:///public$cleanUrl")
            cleanUrl.startsWith("file://") || cleanUrl.startsWith("content://") || cleanUrl.startsWith("asset://") -> Uri.parse(cleanUrl)
            else -> Uri.parse("asset:///public/audio/$cleanUrl")
        }
        return MediaItem.fromUri(uri)
    }

    /**
     * Starts audio playback with instant native MediaPlayer for bundled assets,
     * or ExoPlayer for network streams.
     */
    fun play(context: Context, audioUrl: String, listener: AudioListener) {
        val rawUrl = audioUrl
        mainHandler.post {
            try {
                if (rawUrl.isBlank()) {
                    listener.onError("Empty audio URL")
                    return@post
                }

                // 1. Stop any currently active playback
                stopInternal()
                activeListener = listener

                // 2. Request Audio Focus with high priority
                requestAudioFocus(context)

                // 3. Check for bundled APK asset via AssetFileDescriptor
                val assetFd = findAssetFd(context, rawUrl)
                if (assetFd != null) {
                    playViaNativeMediaPlayer(context, assetFd, rawUrl)
                    return@post
                }

                // 4. Remote stream fallback via ExoPlayer
                Log.i(TAG, "Playing remote or non-asset audio via ExoPlayer: $rawUrl")
                val player = getOrCreateExoPlayer(context)

                watchdogRunnable = Runnable {
                    if (!isPlayingAudio) {
                        Log.w(TAG, "Audio loading watchdog timeout for: $rawUrl")
                        stopProgressTracker()
                        abandonAudioFocus()
                        activeListener?.onError("Network audio timeout")
                    }
                }
                mainHandler.postDelayed(watchdogRunnable!!, 8000L)

                val mediaItem = buildMediaItem(rawUrl)
                player.setMediaItem(mediaItem)
                player.playWhenReady = true
                player.prepare()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start audio playback: ${e.message}", e)
                stopProgressTracker()
                abandonAudioFocus()
                listener.onError(e.localizedMessage ?: "Playback failure")
            }
        }
    }

    private fun playViaNativeMediaPlayer(context: Context, afd: AssetFileDescriptor, rawUrl: String) {
        var isAfdClosed = false
        fun closeAfdSafely() {
            if (!isAfdClosed) {
                isAfdClosed = true
                try { afd.close() } catch (ignored: Exception) {}
            }
        }

        try {
            val mp = MediaPlayer().apply {
                try {
                    val pm = context.applicationContext.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                    if (pm != null) {
                        setWakeMode(context.applicationContext, android.os.PowerManager.PARTIAL_WAKE_LOCK)
                    }
                } catch (ignored: Exception) {}

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                } else {
                    @Suppress("DEPRECATION")
                    setAudioStreamType(AudioManager.STREAM_MUSIC)
                }

                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)

                val vol = if (isMutedState) 0f else 1.0f
                setVolume(vol, vol)

                setOnPreparedListener { player ->
                    closeAfdSafely()
                    try {
                        player.start()
                        isPlayingAudio = true
                        currentDurationMs = player.duration.toLong()
                        activeListener?.onReady(currentDurationMs)
                        startProgressTracker()
                        Log.i(TAG, "Native MediaPlayer started successfully for $rawUrl (duration: ${currentDurationMs}ms)")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting MediaPlayer onPrepared: ${e.message}", e)
                    }
                }

                setOnCompletionListener {
                    closeAfdSafely()
                    Log.i(TAG, "Native MediaPlayer completed playback.")
                    stopProgressTracker()
                    isPlayingAudio = false
                    abandonAudioFocus()
                    activeListener?.onEnded()
                }

                setOnErrorListener { _, what, extra ->
                    closeAfdSafely()
                    Log.e(TAG, "Native MediaPlayer error: what=$what extra=$extra")
                    stopProgressTracker()
                    isPlayingAudio = false
                    abandonAudioFocus()
                    activeListener?.onError("MediaPlayer error ($what, $extra)")
                    true
                }

                prepareAsync()
            }
            nativeMediaPlayer = mp
        } catch (e: Exception) {
            closeAfdSafely()
            Log.e(TAG, "Failed to initialize Native MediaPlayer: ${e.message}", e)
            activeListener?.onError(e.localizedMessage ?: "Native MediaPlayer init failure")
        }
    }

    fun togglePlayPause(): Boolean {
        nativeMediaPlayer?.let { mp ->
            return try {
                if (mp.isPlaying) {
                    mp.pause()
                    isPlayingAudio = false
                    false
                } else {
                    mp.start()
                    isPlayingAudio = true
                    true
                }
            } catch (e: Exception) {
                false
            }
        }

        val player = exoPlayer ?: return false
        return if (player.isPlaying) {
            player.pause()
            false
        } else {
            player.play()
            true
        }
    }

    fun pause() {
        mainHandler.post {
            try {
                nativeMediaPlayer?.pause()
                exoPlayer?.pause()
                isPlayingAudio = false
            } catch (ignored: Exception) {}
        }
    }

    fun resume() {
        mainHandler.post {
            try {
                if (!isMutedState) {
                    applyMuteState()
                }
                nativeMediaPlayer?.start()
                exoPlayer?.play()
                isPlayingAudio = true
            } catch (ignored: Exception) {}
        }
    }

    fun stop() {
        mainHandler.post {
            stopInternal()
        }
    }

    private fun stopInternal() {
        try {
            watchdogRunnable?.let { mainHandler.removeCallbacks(it) }
            watchdogRunnable = null

            stopProgressTracker()

            nativeMediaPlayer?.let { mp ->
                try {
                    mp.setOnPreparedListener(null)
                    mp.setOnCompletionListener(null)
                    mp.setOnErrorListener(null)
                    if (mp.isPlaying) {
                        mp.stop()
                    }
                    mp.reset()
                    mp.release()
                } catch (ignored: Exception) {}
            }
            nativeMediaPlayer = null

            exoPlayer?.stop()
            exoPlayer?.clearMediaItems()

            isPlayingAudio = false
            currentDurationMs = 0L

            abandonAudioFocus()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping player: ${e.message}", e)
        }
    }

    fun release() {
        mainHandler.post {
            try {
                stopInternal()
                activeListener = null
                exoPlayer?.release()
                exoPlayer = null
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing player: ${e.message}", e)
            }
        }
    }

    fun isPlaying(): Boolean = isPlayingAudio

    fun getCurrentPosition(): Long {
        nativeMediaPlayer?.let { mp ->
            return try {
                mp.currentPosition.toLong()
            } catch (e: Exception) {
                0L
            }
        }
        return exoPlayer?.currentPosition ?: 0L
    }

    fun getDuration(): Long = currentDurationMs

    private fun startProgressTracker() {
        stopProgressTracker()
        progressRunnable = object : Runnable {
            override fun run() {
                try {
                    val pos = getCurrentPosition()
                    val dur = getDuration()
                    if (isPlayingAudio && dur > 0) {
                        activeListener?.onProgress(pos, dur)
                        mainHandler.postDelayed(this, 250L)
                    }
                } catch (ignored: Exception) {}
            }
        }
        mainHandler.post(progressRunnable!!)
    }

    private fun stopProgressTracker() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    private fun requestAudioFocus(context: Context) {
        try {
            if (audioManager == null) {
                audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            }
            val am = audioManager ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val playbackAttrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()

                val focusReq = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(playbackAttrs)
                    .setWillPauseWhenDucked(false)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener, mainHandler)
                    .build()

                audioFocusRequest = focusReq
                am.requestAudioFocus(focusReq)
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    audioFocusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                )
            }
        } catch (ignored: Exception) {}
    }

    private fun abandonAudioFocus() {
        try {
            val am = audioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
                audioFocusRequest = null
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus(audioFocusChangeListener)
            }
        } catch (ignored: Exception) {}
    }
}

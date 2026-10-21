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
 * Backed by Google Media3 ExoPlayer and Native MediaPlayer with AssetFileDescriptor.
 * Supports USAGE_ALARM stream routing for Islamic prayer call penetration across silent/DND modes,
 * guaranteed audible volume recovery, and persistent playback.
 */
@OptIn(UnstableApi::class)
object FastAudioPlayer {

    private const val TAG = "FastAudioPlayer"
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var nativeMediaPlayer: MediaPlayer? = null

    @Volatile
    private var activeAfd: AssetFileDescriptor? = null

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
                // For Adhan (alarm), temporary focus loss should NOT abort playback immediately
                Log.w(TAG, "AudioFocus loss event: $focusChange")
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
            .removePrefix("/")

        val fileName = clean.substringAfterLast("/")
        val candidates = linkedSetOf(
            "audio/$fileName",
            "public/audio/$fileName",
            clean,
            "audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "public/audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "public/$clean",
            fileName
        )

        for (candidate in candidates) {
            try {
                val afd = context.assets.openFd(candidate)
                Log.i(TAG, "Successfully located asset file descriptor at: $candidate")
                return afd
            } catch (ignored: Exception) {}
        }
        return null
    }

    /**
     * Verifies existence of asset in APK assets without requiring uncompressed file descriptor.
     */
    fun resolveAssetPath(context: Context, rawUrl: String): String? {
        val clean = rawUrl.trim()
            .removePrefix("file:///android_asset/")
            .removePrefix("asset:///")
            .removePrefix("/")

        val fileName = clean.substringAfterLast("/")
        val candidates = linkedSetOf(
            "audio/$fileName",
            "public/audio/$fileName",
            clean,
            "audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "public/audio/" + clean.substringAfter("audio/").removePrefix("/"),
            "public/$clean",
            fileName
        )

        for (candidate in candidates) {
            try {
                val stream = context.assets.open(candidate)
                stream.close()
                Log.i(TAG, "Verified asset exists via assets.open at: $candidate")
                return candidate
            } catch (ignored: Exception) {}
        }
        return null
    }

    private fun ensureAudibleVolume(context: Context, isAlarm: Boolean) {
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            
            // Try to unmute alarm and music streams if muted by device
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.adjustStreamVolume(AudioManager.STREAM_ALARM, AudioManager.ADJUST_UNMUTE, 0)
                    am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0)
                }
            } catch (ignored: Exception) {}

            val streamType = if (isAlarm) AudioManager.STREAM_ALARM else AudioManager.STREAM_MUSIC
            val current = am.getStreamVolume(streamType)
            val max = am.getStreamMaxVolume(streamType)
            if (isAlarm && max > 0 && current < (max * 0.6f).toInt()) {
                val target = (max * 0.85f).toInt().coerceAtLeast(1)
                try {
                    am.setStreamVolume(streamType, target, 0)
                    Log.i(TAG, "Raised STREAM_ALARM volume from $current to $target (max: $max) for prayer call")
                } catch (e: Exception) {
                    Log.w(TAG, "Unable to adjust alarm volume directly (possible DND restriction): ${e.message}")
                }
            }

            // Always ensure STREAM_MUSIC has an audible level so both alarm and media paths are heard
            val musicVol = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            val musicMax = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            if (musicMax > 0 && musicVol < (musicMax * 0.5f).toInt()) {
                try {
                    val targetMusic = (musicMax * 0.8f).toInt().coerceAtLeast(1)
                    am.setStreamVolume(AudioManager.STREAM_MUSIC, targetMusic, 0)
                    Log.i(TAG, "Raised STREAM_MUSIC volume to $targetMusic (max: $musicMax) for prayer call safety")
                } catch (ignored: Exception) {}
            }
        } catch (ignored: Exception) {}
    }

    private fun getOrCreateExoPlayer(context: Context, isAlarm: Boolean): ExoPlayer {
        val existing = exoPlayer
        if (existing != null) {
            return existing
        }

        val media3AudioAttributes = Media3AudioAttributes.Builder()
            .setContentType(if (isAlarm) C.AUDIO_CONTENT_TYPE_SONIFICATION else C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(if (isAlarm) C.USAGE_ALARM else C.USAGE_MEDIA)
            .setFlags(C.FLAG_AUDIBILITY_ENFORCED)
            .build()

        val player = ExoPlayer.Builder(context.applicationContext)
            .setAudioAttributes(media3AudioAttributes, /* handleAudioFocus = */ true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
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

    private fun buildMediaItem(context: Context, rawUrl: String): MediaItem {
        val cleanUrl = rawUrl.trim()
        val uri: Uri = when {
            cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") -> Uri.parse(cleanUrl)
            cleanUrl.startsWith("file://") || cleanUrl.startsWith("content://") -> Uri.parse(cleanUrl)
            else -> {
                val assetPath = resolveAssetPath(context, cleanUrl) ?: "audio/adhan_alafasy.mp3"
                Uri.parse("asset:///$assetPath")
            }
        }
        return MediaItem.fromUri(uri)
    }

    private fun isAlarmAudio(url: String): Boolean {
        val lower = url.lowercase()
        return lower.contains("adhan") || lower.contains("athan") || lower.contains("iqamah") || lower.contains("alarm")
    }

    fun play(context: Context, audioUrl: String, listener: AudioListener) {
        play(context, audioUrl, isAlarm = isAlarmAudio(audioUrl), listener = listener)
    }

    /**
     * Starts audio playback with instant native MediaPlayer for bundled assets,
     * or ExoPlayer with USAGE_ALARM stream support.
     */
    fun play(context: Context, audioUrl: String, isAlarm: Boolean, listener: AudioListener) {
        val rawUrl = audioUrl
        mainHandler.post {
            try {
                if (rawUrl.isBlank()) {
                    listener.onError("Empty audio URL")
                    return@post
                }

                // 1. Reset mute state for every fresh playback session
                isMutedState = false

                // 2. Stop any currently active playback
                stopInternal()
                activeListener = listener

                // 3. Guarantee audible alarm volume if it was muted
                ensureAudibleVolume(context, isAlarm)

                // 4. Request Audio Focus
                requestAudioFocus(context, isAlarm)

                // 5. Try Native MediaPlayer with AssetFileDescriptor if uncompressed
                val assetFd = findAssetFd(context, rawUrl)
                if (assetFd != null) {
                    val success = playViaNativeMediaPlayer(context, assetFd, rawUrl, isAlarm)
                    if (success) {
                        return@post
                    }
                }

                // 6. Seamless ExoPlayer fallback (handles asset:/// stream, compressed assets, & remote URLs)
                playViaExoPlayer(context, rawUrl, isAlarm)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start audio playback: ${e.message}", e)
                stopProgressTracker()
                abandonAudioFocus()
                listener.onError(e.localizedMessage ?: "Playback failure")
            }
        }
    }

    private fun playViaNativeMediaPlayer(
        context: Context,
        afd: AssetFileDescriptor,
        rawUrl: String,
        isAlarm: Boolean
    ): Boolean {
        activeAfd = afd

        return try {
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
                            .setContentType(if (isAlarm) AudioAttributes.CONTENT_TYPE_SONIFICATION else AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(if (isAlarm) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_MEDIA)
                            .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                            .build()
                    )
                } else {
                    @Suppress("DEPRECATION")
                    setAudioStreamType(if (isAlarm) AudioManager.STREAM_ALARM else AudioManager.STREAM_MUSIC)
                }

                if (afd.declaredLength < 0) {
                    setDataSource(afd.fileDescriptor)
                } else {
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.declaredLength)
                }

                val vol = if (isMutedState) 0f else 1.0f
                setVolume(vol, vol)

                setOnPreparedListener { player ->
                    // CRITICAL FIX: DO NOT close afd here! Closing afd closes the underlying file descriptor,
                    // which destroys decoding frames in MediaPlayer. Keep activeAfd open until completion or stop.
                    try {
                        player.start()
                        isPlayingAudio = true
                        currentDurationMs = player.duration.toLong()
                        activeListener?.onReady(currentDurationMs)
                        startProgressTracker()
                        Log.i(TAG, "Native MediaPlayer started successfully for $rawUrl (duration: ${currentDurationMs}ms, isAlarm: $isAlarm)")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting MediaPlayer onPrepared: ${e.message}", e)
                        closeActiveAfdSafely()
                        playViaExoPlayer(context, rawUrl, isAlarm)
                    }
                }

                setOnCompletionListener {
                    closeActiveAfdSafely()
                    Log.i(TAG, "Native MediaPlayer completed playback.")
                    stopProgressTracker()
                    isPlayingAudio = false
                    abandonAudioFocus()
                    activeListener?.onEnded()
                }

                setOnErrorListener { _, what, extra ->
                    closeActiveAfdSafely()
                    Log.e(TAG, "Native MediaPlayer error: what=$what extra=$extra -> falling back to ExoPlayer")
                    stopProgressTracker()
                    isPlayingAudio = false
                    // Graceful fallback to ExoPlayer instead of terminating
                    playViaExoPlayer(context, rawUrl, isAlarm)
                    true
                }

                prepareAsync()
            }
            nativeMediaPlayer = mp
            true
        } catch (e: Exception) {
            closeActiveAfdSafely()
            Log.e(TAG, "Failed to initialize Native MediaPlayer: ${e.message} -> fallback to ExoPlayer", e)
            false
        }
    }

    private fun playViaExoPlayer(context: Context, rawUrl: String, isAlarm: Boolean) {
        try {
            Log.i(TAG, "Starting playback via Media3 ExoPlayer for: $rawUrl (isAlarm: $isAlarm)")
            val player = getOrCreateExoPlayer(context, isAlarm)

            watchdogRunnable = Runnable {
                if (!isPlayingAudio) {
                    Log.w(TAG, "Audio loading watchdog timeout for: $rawUrl")
                    stopProgressTracker()
                    abandonAudioFocus()
                    activeListener?.onError("Audio timeout")
                }
            }
            mainHandler.postDelayed(watchdogRunnable!!, 10000L)

            val mediaItem = buildMediaItem(context, rawUrl)
            player.setMediaItem(mediaItem)
            player.volume = if (isMutedState) 0f else 1.0f
            player.playWhenReady = true
            player.prepare()
            player.play()
        } catch (e: Exception) {
            Log.e(TAG, "ExoPlayer playback failed: ${e.message}", e)
            stopProgressTracker()
            abandonAudioFocus()
            activeListener?.onError(e.localizedMessage ?: "ExoPlayer failure")
        }
    }

    private fun closeActiveAfdSafely() {
        try {
            activeAfd?.close()
        } catch (ignored: Exception) {}
        activeAfd = null
    }

    fun togglePlayPause(): Boolean {
        nativeMediaPlayer?.let { mp ->
            return try {
                if (mp.isPlaying) {
                    mp.pause()
                    isPlayingAudio = false
                    false
                } else {
                    if (!isMutedState) {
                        applyMuteState()
                    }
                    mp.start()
                    isPlayingAudio = true
                    startProgressTracker()
                    true
                }
            } catch (e: Exception) {
                false
            }
        }

        exoPlayer?.let { p ->
            return try {
                if (p.isPlaying) {
                    p.pause()
                    isPlayingAudio = false
                    false
                } else {
                    if (!isMutedState) {
                        applyMuteState()
                    }
                    p.play()
                    isPlayingAudio = true
                    startProgressTracker()
                    true
                }
            } catch (e: Exception) {
                false
            }
        }

        return false
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
            closeActiveAfdSafely()

            val mpToRelease = nativeMediaPlayer
            nativeMediaPlayer = null
            if (mpToRelease != null) {
                try {
                    mpToRelease.setOnPreparedListener(null)
                    mpToRelease.setOnCompletionListener(null)
                    mpToRelease.setOnErrorListener(null)
                    if (mpToRelease.isPlaying) {
                        mpToRelease.stop()
                    }
                } catch (ignored: Exception) {}
                Thread {
                    try {
                        mpToRelease.reset()
                        mpToRelease.release()
                    } catch (ignored: Exception) {}
                }.start()
            }

            exoPlayer?.let { p ->
                try {
                    p.stop()
                    p.clearMediaItems()
                } catch (ignored: Exception) {}
            }

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

    private fun requestAudioFocus(context: Context, isAlarm: Boolean) {
        try {
            if (audioManager == null) {
                audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            }
            val am = audioManager ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val playbackAttrs = AudioAttributes.Builder()
                    .setUsage(if (isAlarm) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_MEDIA)
                    .setContentType(if (isAlarm) AudioAttributes.CONTENT_TYPE_SONIFICATION else AudioAttributes.CONTENT_TYPE_MUSIC)
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
                    if (isAlarm) AudioManager.STREAM_ALARM else AudioManager.STREAM_MUSIC,
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

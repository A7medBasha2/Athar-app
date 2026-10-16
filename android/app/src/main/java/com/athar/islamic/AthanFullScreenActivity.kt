package com.athar.islamic

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * AthanFullScreenActivity (Deprecated)
 * The forced intrusive Adhan full-screen UIs have been completely removed
 * in favor of the unified Royal Notifications System & Royal System Overlay.
 */
class AthanFullScreenActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            if (intent != null) {
                var mainIntent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtras(intent)
                }
                startActivity(mainIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        finish()
    }
}

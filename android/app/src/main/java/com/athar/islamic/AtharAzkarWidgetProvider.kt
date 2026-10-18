package com.athar.islamic

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

class AtharAzkarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Stub implementation - No-op
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Stub implementation
    }
}

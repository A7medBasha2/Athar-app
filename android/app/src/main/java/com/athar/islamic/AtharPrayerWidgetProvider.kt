package com.athar.islamic

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

class AtharPrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Stub implementation - No-op for legacy widget
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Stub implementation
    }
}

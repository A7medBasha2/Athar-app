package com.athar.islamic.domain.model

data class Coordinates(
    val latitude: Double,
    val longitude: Double,
    val city: String,
    val country: String
)

data class PrayerTimes(
    val fajr: String,
    val sunrise: String,
    val dhuhr: String,
    val asr: String,
    val maghrib: String,
    val isha: String,
    val hijriDate: String,
    val gregorianDate: String
)

data class DhikrItem(
    val id: Int,
    val arabicText: String,
    val count: Int,
    val fadl: String,
    val audioUrl: String? = null
)

data class QuranVerseReminder(
    val surahNumber: Int,
    val surahName: String,
    val ayahNumber: Int,
    val text: String,
    val audioUrl: String? = null
)

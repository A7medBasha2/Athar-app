package com.athar.islamic.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val NearBlack = Color(0xFF080B0E)
val DarkCharcoal = Color(0xFF10151C)
val SurfaceCharcoal = Color(0xFF151D26)
val ElegantGold = Color(0xFFD4AF37)
val SoftGold = Color(0xFFE5C158)
val MutedGold = Color(0xFF997A15)
val TextWhite = Color(0xFFF8FAFC)
val TextGray = Color(0xFF94A3B8)

private val AtharDarkColorScheme = darkColorScheme(
    primary = ElegantGold,
    onPrimary = NearBlack,
    primaryContainer = MutedGold,
    onPrimaryContainer = TextWhite,
    secondary = SoftGold,
    onSecondary = NearBlack,
    background = NearBlack,
    onBackground = TextWhite,
    surface = DarkCharcoal,
    onSurface = TextWhite,
    surfaceVariant = SurfaceCharcoal,
    onSurfaceVariant = TextGray
)

@Composable
fun AtharTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AtharDarkColorScheme,
        content = content
    )
}

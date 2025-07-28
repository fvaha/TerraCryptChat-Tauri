package xyz.terracrypt.chat.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.terracrypt.chat.R

// === Dark Mode: All Black Background, White Text/Icons ===
private val DarkColorPalette = darkColorScheme(
    primary = Color.White,
    onPrimary = Color.Black,
    primaryContainer = Color.Black,
    onPrimaryContainer = Color.White,
    secondary = Color.White,
    onSecondary = Color.Black,
    background = Color.Black,
    onBackground = Color.White,
    surface = Color.Black,
    onSurface = Color.White
)

// === Light Mode: All White Background, Black Text/Icons ===
private val LightColorPalette = lightColorScheme(
    primary = Color.Black,
    onPrimary = Color.White,
    primaryContainer = Color.White,
    onPrimaryContainer = Color.Black,
    secondary = Color.Black,
    onSecondary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black
)

// === Shapes (unchanged) ===
private val AppShapes = Shapes(
    small = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
)

// === Typography (unchanged) ===
@Composable
fun customTypography(): Typography {
    return Typography(
        bodyLarge = TextStyle(
            fontFamily = FontFamily(Font(R.font.roboto_regular)),
            fontSize = 16.sp,
        ),
        bodyMedium = TextStyle(
            fontFamily = FontFamily(Font(R.font.roboto_regular)),
            fontSize = 14.sp,
        ),
        bodySmall = TextStyle(
            fontFamily = FontFamily(Font(R.font.roboto_regular)),
            fontSize = 12.sp,
        )
    )
}

// === Theme Wrapper ===
@Composable
fun SafeSyncTheme(
    darkTheme: Boolean,
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColorPalette else LightColorPalette

    MaterialTheme(
        colorScheme = colors,
        typography = customTypography(),
        shapes = AppShapes,
        content = content
    )
}

package xyz.terracrypt.chat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import kotlin.math.abs

@Composable
fun UserInitialsAvatar(
    username: String,
    isDarkMode: Boolean,
    modifier: Modifier = Modifier
) {
    val initials = rememberInitials(username)
    val backgroundColor = rememberAvatarColor(username, isDarkMode)
    val textColor = MaterialTheme.colorScheme.onPrimary

    Box(
        modifier = modifier
            .size(width = 56.dp, height = 56.dp) // more square and slightly bigger
            .clip(RoundedCornerShape(10.dp)) // subtle rounding like typical avatars
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = initials,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = textColor,
            maxLines = 1
        )
    }
}

@Composable
private fun rememberInitials(username: String): String {
    val cleaned = username.trim()
        .replace(Regex("[^A-Za-z]"), "") // Keep only letters
        .uppercase()

    return cleaned.take(2)
}

@Composable
private fun rememberAvatarColor(username: String, isDarkMode: Boolean): Color {
    val shades = if (isDarkMode) {
        listOf(
            Color(0xFF1C1C1C), Color(0xFF2C2C2C), Color(0xFF3C3C3C),
            Color(0xFF4C4C4C), Color(0xFF5C5C5C)
        )
    } else {
        listOf(
            Color(0xFFE3F2FD), Color(0xFFFFF9C4), Color(0xFFFFE0B2),
            Color(0xFFDCEDC8), Color(0xFFD1C4E9)
        )
    }
    val index = abs(username.hashCode()) % shades.size
    return shades[index]
}

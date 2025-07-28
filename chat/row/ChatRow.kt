package xyz.terracrypt.chat.row

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ExitToApp
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.R
import xyz.terracrypt.chat.models.ChatEntity
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ChatRow(
    chatEntity: ChatEntity,
    displayName: String,
    avatarUrl: String?,
    isDarkMode: Boolean,
    currentUserId: String,
    canDelete: Boolean,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onLeave: () -> Unit,
    onSettings: () -> Unit,
    updateUnreadCount: (String, Int) -> Unit
) {
    val swipeOffset = remember { Animatable(0f) }
    val buttonWidth = 64.dp
    val buttonCount = 4
    val density = LocalDensity.current
    val totalSwipeWidthPx = with(density) { buttonWidth.toPx() * buttonCount }
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
    ) {
        // Background actions
        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFEEEEEE)),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ActionButton(Icons.Outlined.NotificationsOff, Color(0xFF6D4C41), "Mute") {}
            ActionButton(Icons.Outlined.PushPin, Color(0xFF009688), "Pin") {}
            if (canDelete) {
                ActionButton(Icons.Outlined.Delete, Color(0xFFD32F2F), "Delete", onDelete)
            } else {
                ActionButton(Icons.AutoMirrored.Outlined.ExitToApp, Color(0xFFD32F2F), "Leave", onLeave)
            }
            ActionButton(Icons.Outlined.Settings, Color(0xFF1976D2), "Settings", onSettings)
        }

        // Foreground (swipe)
        Row(
            modifier = Modifier
                .offset { IntOffset(swipeOffset.value.toInt(), 0) }
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDrag = { _, dragAmount ->
                            val newOffset = (swipeOffset.value + dragAmount.x)
                                .coerceIn(-totalSwipeWidthPx, 0f)
                            scope.launch { swipeOffset.snapTo(newOffset) }
                        },
                        onDragEnd = {
                            scope.launch {
                                if (swipeOffset.value < -totalSwipeWidthPx / 2) {
                                    swipeOffset.animateTo(
                                        targetValue = -totalSwipeWidthPx,
                                        animationSpec = tween(durationMillis = 300)
                                    )
                                    haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                } else {
                                    swipeOffset.animateTo(
                                        targetValue = 0f,
                                        animationSpec = tween(durationMillis = 300)
                                    )
                                }
                            }
                        }
                    )
                }
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .clickable {
                    onClick()
                    updateUnreadCount(chatEntity.chatId, 0)
                }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            ChatAvatar(
                chatEntity = chatEntity,
                avatarUrl = avatarUrl,
                isDarkMode = isDarkMode,
                displayName = displayName,
                currentUserId = currentUserId
            )

            Spacer(Modifier.width(12.dp))

            // Main content
            Column(Modifier.weight(1f)) {
                Text(
                    text = displayName,
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = chatEntity.lastMessageContent ?: "No messages yet",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.height(48.dp)
            ) {
                chatEntity.lastMessageTimestamp?.let {
                    val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(it))
                    Text(
                        text = time,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (chatEntity.unreadCount > 0) {
                    Box(
                        modifier = Modifier
                            .padding(top = 4.dp)
                            .size(20.dp)
                            .background(Color.Red, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = chatEntity.unreadCount.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatAvatar(
    chatEntity: ChatEntity,
    avatarUrl: String?,
    isDarkMode: Boolean,
    displayName: String,
    currentUserId: String
) {
    Box(modifier = Modifier.size(48.dp)) {
        if (chatEntity.chatType == "group") {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(Color.DarkGray, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.groupicon),
                    contentDescription = null,
                    modifier = Modifier.size(28.dp),
                    colorFilter = ColorFilter.tint(
                        if (isDarkMode) Color.White else Color.Black
                    )
                )
            }
            if (chatEntity.creatorId == currentUserId) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = "You created this chat",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(2.dp, (-2).dp)
                        .background(
                            color = MaterialTheme.colorScheme.surface,
                            shape = CircleShape
                        )
                        .size(16.dp)
                        .padding(1.dp)
                )
            }
        } else {
            if (!avatarUrl.isNullOrBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(avatarUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                )
            } else {
                UserInitialsAvatar(
                    username = displayName,
                    isDarkMode = isDarkMode,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                )
            }
        }
    }
}

@Composable
private fun ActionButton(
    icon: ImageVector,
    tint: Color,
    desc: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .width(64.dp)
            .fillMaxHeight()
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = desc,
            tint = tint,
            modifier = Modifier.size(24.dp)
        )
    }
}

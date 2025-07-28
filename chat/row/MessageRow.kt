@file:Suppress("ConstantConditionIf")

package xyz.terracrypt.chat.row

import android.content.ClipData
import android.content.ClipboardManager
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.toColorInt
import coil.compose.AsyncImage
import coil.request.ImageRequest
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import xyz.terracrypt.chat.utils.formatTimestamp

@Composable
fun MessageRow(
    message: MessageEntity,
    isGroupChat: Boolean,
    isCurrentUser: Boolean,
    isDarkMode: Boolean,
    onReply: (MessageEntity) -> Unit,
    onScrollToMessage: (String) -> Unit,
    isFirstInGroup: Boolean = true,
    onResend: ((MessageEntity) -> Unit)? = null,
    onSwipeLeft: ((MessageEntity) -> Unit)? = null
) {
    val bubbleColor = try {
        Color((message.bubbleColorHex ?: "#E0E0E0").toColorInt())
    } catch (_: Exception) {
        MaterialTheme.colorScheme.secondaryContainer
    }

    val textColor = when {
        isCurrentUser && isDarkMode -> Color.Black
        isCurrentUser && !isDarkMode -> Color.White
        !isCurrentUser && !isGroupChat -> Color.White
        else -> Color.Black
    }

    var offsetX by remember { mutableFloatStateOf(0f) }
    val context = LocalContext.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 3.dp),
        horizontalArrangement = if (isCurrentUser) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom
    ) {
        if (isGroupChat && !isCurrentUser && isFirstInGroup) {
            if (message.profilePictureUrl.isNullOrBlank()) {
                UserInitialsAvatar(
                    username = message.senderUsername ?: "??",
                    isDarkMode = isDarkMode,
                    modifier = Modifier
                        .padding(end = 8.dp, top = 4.dp)
                        .size(38.dp)
                )
            } else {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(message.profilePictureUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Profile Picture",
                    modifier = Modifier
                        .padding(end = 8.dp, top = 4.dp)
                        .size(38.dp)
                        .clip(CircleShape)
                )
            }
        } else if (isGroupChat && !isCurrentUser) {
            Spacer(modifier = Modifier.width(44.dp))
        }

        Column(
            horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start,
            modifier = Modifier
                .widthIn(max = 320.dp)
                .offset { IntOffset(offsetX.toInt(), 0) }
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragEnd = {
                            when {
                                offsetX > 90f -> onReply(message)
                                offsetX < -90f -> onSwipeLeft?.invoke(message)
                            }
                            offsetX = 0f
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            offsetX += dragAmount.x
                        }
                    )
                }
        ) {
            if (isGroupChat && !isCurrentUser && isFirstInGroup && !message.senderUsername.isNullOrBlank()) {
                Text(
                    text = message.senderUsername,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(start = 4.dp, bottom = 2.dp)
                )
            }

            Box(
                modifier = Modifier
                    .padding(
                        top = if (isFirstInGroup) 7.dp else 2.dp,
                        bottom = 4.dp,
                        start = 10.dp,
                        end = 10.dp
                    )
                    .background(color = bubbleColor, shape = RoundedCornerShape(16.dp))
                    .padding(10.dp)
            ) {
                Column {
                    message.replyPreviewSender?.let { sender ->
                        val replyText = message.replyPreviewText ?: ""
                        Box(
                            modifier = Modifier
                                .wrapContentWidth()
                                .widthIn(max = 280.dp)
                                .padding(bottom = 7.dp)
                                .background(
                                    color = textColor.copy(alpha = 0.14f),
                                    shape = RoundedCornerShape(4.dp)
                                )
                                .clickable {
                                    message.replyToMessageId?.let { onScrollToMessage(it) }
                                }
                                .padding(start = 7.dp, end = 9.dp, top = 4.dp, bottom = 4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .padding(end = 7.dp)
                                        .size(width = 3.dp, height = 28.dp)
                                        .background(
                                            color = textColor.copy(alpha = 0.4f),
                                            shape = RoundedCornerShape(1.dp)
                                        )
                                )
                                Column {
                                    Text(
                                        text = "↩ $sender",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = textColor.copy(alpha = 0.9f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontSize = 11.sp
                                    )
                                    Text(
                                        text = replyText,
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontStyle = FontStyle.Italic
                                        ),
                                        color = textColor.copy(alpha = 0.6f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }

                    Text(
                        text = message.content,
                        color = textColor,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.combinedClickable(
                            onClick = {},
                            onLongClick = {
                                val clipboard = context.getSystemService(ClipboardManager::class.java)
                                clipboard.setPrimaryClip(
                                    ClipData.newPlainText("Copied Message", message.content)
                                )
                                Toast.makeText(context, "Message copied!", Toast.LENGTH_SHORT).show()
                            }
                        )
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .padding(top = 3.dp)
                            .align(Alignment.End)
                    ) {
                        Text(
                            text = formatTimestamp(message.timestamp),
                            fontSize = 9.sp,
                            color = textColor.copy(alpha = 0.75f)
                        )

                        if (isCurrentUser) {
                            Spacer(modifier = Modifier.width(4.dp))

                            if (message.isFailed) {
                                IconButton(
                                    onClick = { onResend?.invoke(message) },
                                    modifier = Modifier.size(18.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = "Resend",
                                        tint = Color.Red
                                    )
                                }
                            } else if (!message.isSent && !message.isDelivered) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Pending",
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                            } else if (message.isSent && !message.isDelivered) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Sent",
                                    tint = Color(0xFF4CAF50),
                                    modifier = Modifier.size(13.dp)
                                )
                            } else if (message.isDelivered) {
                                Box {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Delivered-green",
                                        tint = Color(0xFF4CAF50),
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Delivered-white",
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(13.dp)
                                            .offset(x = 6.dp, y = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

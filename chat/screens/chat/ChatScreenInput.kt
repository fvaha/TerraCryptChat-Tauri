package xyz.terracrypt.chat.screens.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import xyz.terracrypt.chat.models.MessageEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreenInput(
    newMessage: MutableState<String>,
    replyTo: MessageEntity?,
    onSend: () -> Unit,
    onCamera: () -> Unit,
    onMic: () -> Unit,
    onCancelReply: () -> Unit,
    isDarkMode: Boolean
) {
    val borderColor = if (isDarkMode) Color.White else Color.Black

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        if (replyTo != null) {
            ChatScreenReplyView(replyTo = replyTo, onCancel = onCancelReply)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = MaterialTheme.colorScheme.surface,
                    shape = MaterialTheme.shapes.medium
                )
                .padding(horizontal = 1.dp, vertical = 1.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                HorizontalDivider(color = borderColor, thickness = 0.2.dp)

                TextField(
                    value = newMessage.value,
                    onValueChange = { newMessage.value = it },
                    placeholder = { Text("Type a message...") },
                    maxLines = 4,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 1.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent,
                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                    )
                )

                HorizontalDivider(color = borderColor, thickness = 0.2.dp)
            }

            IconButton(onClick = onSend) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send"
                )
            }
        }
    }
}

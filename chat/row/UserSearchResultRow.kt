package xyz.terracrypt.chat.row

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
//import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar

@Composable
fun UserSearchResultRow(
    user: FriendEntity,
    isDarkMode: Boolean,
    onSendRequest: (userId: String, onComplete: (Boolean, String?) -> Unit) -> Unit,
    snackbarHostState: SnackbarHostState
) {
    var requestSent by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    errorMessage?.let { message ->
        LaunchedEffect(message) {
            snackbarHostState.showSnackbar(message)
            errorMessage = null
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 6.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (!user.picture.isNullOrBlank()) {
            AsyncImage(
                model = user.picture,
                contentDescription = "User Picture",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
            )
        } else {
            UserInitialsAvatar(
                username = user.username,
                isDarkMode = isDarkMode,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.username,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )

            Text(
                text = if (requestSent) "Request Sent" else "Add as friend",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (!requestSent) {
            Button(
                onClick = {
                    onSendRequest(user.friendId) { success, message ->
                        if (success) {
                            requestSent = true
                        } else if (message != null) {
                            errorMessage = message
                        }
                    }
                },
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Text("Add", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

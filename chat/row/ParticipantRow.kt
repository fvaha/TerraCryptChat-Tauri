package xyz.terracrypt.chat.row

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import xyz.terracrypt.chat.models.ParticipantEntity
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import xyz.terracrypt.chat.utils.formatAsFriendlyDate

@Composable
fun ParticipantRow(
    participant: ParticipantEntity,
    profilePicture: String?,
    currentUserId: String,
    superAdminId: String,
    isAdmin: Boolean,
    isDarkMode: Boolean,
    onPromote: () -> Unit,
    onDemote: () -> Unit,
    onRemove: () -> Unit
) {
    val isSelf = participant.userId == currentUserId
    val isParticipantAdmin = participant.role == "admin"
    val isSuperAdmin = participant.userId == superAdminId
    val isCurrentUserSuperAdmin = currentUserId == superAdminId

    val canPromote = !isParticipantAdmin && isCurrentUserSuperAdmin && !isSelf
    val canDemote = isParticipantAdmin && isCurrentUserSuperAdmin && !isSelf && !isSuperAdmin
    val canRemove = !isSelf && (
            isCurrentUserSuperAdmin || (isAdmin && !isParticipantAdmin && !isSuperAdmin)
            )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!profilePicture.isNullOrBlank()) {
                Image(
                    painter = rememberAsyncImagePainter(profilePicture),
                    contentDescription = "Profile Picture",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                )
            } else {
                UserInitialsAvatar(
                    username = participant.username,
                    isDarkMode = isDarkMode,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = participant.username,
                        style = MaterialTheme.typography.titleMedium
                    )
                    if (isParticipantAdmin) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Admin",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier
                                .background(
                                    color = MaterialTheme.colorScheme.primary,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    text = "Joined: ${participant.joinedAt.formatAsFriendlyDate()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                if (canPromote) {
                    VerticalBadge(textTop = "Make", textBottom = "Admin", onClick = onPromote)
                }
                if (canDemote) {
                    VerticalBadge(textTop = "Remove", textBottom = "Admin", onClick = onDemote)
                }
                if (canRemove) {
                    BadgeAction(text = "Kick", onClick = onRemove, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun VerticalBadge(
    textTop: String,
    textBottom: String,
    onClick: () -> Unit,
    color: Color = MaterialTheme.colorScheme.primary
) {
    TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(0.dp),
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp))
            .height(32.dp)
            .width(40.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(vertical = 2.dp)
        ) {
            Text(
                text = textTop,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                color = color,
                lineHeight = 10.sp
            )
            Text(
                text = textBottom,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                color = color,
                lineHeight = 10.sp
            )
        }
    }
}


@Composable
private fun BadgeAction(
    text: String,
    onClick: () -> Unit,
    color: Color = MaterialTheme.colorScheme.primary
) {
    TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp),
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp))
            .height(32.dp)
            .width(32.dp)
    ) {
        Text(
            text = text,
            fontSize = 10.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

package xyz.terracrypt.chat.screens.chat

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.row.MessageRow
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun ChatScreenMessages(
    messages: List<MessageEntity>,
    isGroupChat: Boolean,
    currentUserId: String,
    listState: LazyListState,
    sessionManager: SessionManager,
    onReply: (MessageEntity) -> Unit,
    onLoadMore: () -> Unit,
    onScrollToMessage: (String) -> Unit,
    onResend: (MessageEntity) -> Unit
) {
    val isDarkMode by sessionManager.isDarkModeEnabled.collectAsState()

    val grouped = remember(messages) { groupMessagesByDate(messages) }

    var firstLoad by remember { mutableStateOf(true) }

    LaunchedEffect(messages.size) {
        val isNearBottom = listState.firstVisibleItemIndex <= 2
        if (firstLoad || isNearBottom) {
            listState.scrollToItem(0)
            firstLoad = false
        }
    }

    LaunchedEffect(listState) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .distinctUntilChanged()
            .collectLatest { index ->
                if (index >= grouped.values.flatten().lastIndex - 2) {
                    onLoadMore()
                }
            }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(),
        state = listState,
        reverseLayout = true
    ) {
        grouped.forEach { (dateLabel, dailyMessages) ->
            stickyHeader {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .padding(horizontal = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = dateLabel,
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }

            items(
                items = dailyMessages,
                key = { it.clientMessageId.ifBlank { it.messageId ?: it.id.toString() } }
            ) { message ->
                val index = dailyMessages.indexOf(message)
                val previous = dailyMessages.getOrNull(index + 1)
                val isFirstInGroup = previous?.senderId != message.senderId

                MessageRow(
                    message = message,
                    isGroupChat = isGroupChat,
                    isCurrentUser = message.senderId == currentUserId,
                    isDarkMode = isDarkMode,
                    onReply = onReply,
                    onScrollToMessage = onScrollToMessage,
                    isFirstInGroup = isFirstInGroup,
                    onResend = onResend
                )
            }
        }
    }
}

fun groupMessagesByDate(messages: List<MessageEntity>): Map<String, List<MessageEntity>> {
    val today = LocalDate.now()
    val yesterday = today.minusDays(1)

    return messages
        .groupBy { message ->
            val msgDate = Instant.ofEpochMilli(message.timestamp)
                .atZone(ZoneId.systemDefault())
                .toLocalDate()
            when (msgDate) {
                today -> "Today"
                yesterday -> "Yesterday"
                else -> msgDate.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))
            }
        }
        .toSortedMap(compareByDescending { dateStringToLocalDate(it) })
        .mapValues { (_, msgs) ->
            msgs.sortedWith(compareByDescending<MessageEntity> { it.timestamp }
                .thenByDescending { it.messageId ?: it.clientMessageId })
        }
}

private fun dateStringToLocalDate(label: String): LocalDate = when (label) {
    "Today" -> LocalDate.now()
    "Yesterday" -> LocalDate.now().minusDays(1)
    else -> runCatching {
        LocalDate.parse(label, DateTimeFormatter.ofPattern("MMM dd, yyyy"))
    }.getOrElse { LocalDate.MIN }
}

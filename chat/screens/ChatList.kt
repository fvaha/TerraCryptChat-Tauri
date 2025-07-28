package xyz.terracrypt.chat.screens

import android.util.Log
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.row.ChatRow
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.ui.components.SmartSearchBar
import xyz.terracrypt.chat.viewmodels.ChatListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatList(
    navController: NavHostController,
    chatsViewModel: ChatListViewModel,
    sessionManager: SessionManager,
    participantService: ParticipantService
) {
    val chats by chatsViewModel.chatsList.collectAsState()
    val isLoading by chatsViewModel.isLoading.collectAsState()
    val isDarkMode by sessionManager.isDarkModeEnabled.collectAsState()
    val currentUserId = sessionManager.getCurrentUserId() ?: ""
    val coroutineScope = rememberCoroutineScope()

    var searchQuery by remember { mutableStateOf("") }
    var filteredChats by remember { mutableStateOf(emptyList<xyz.terracrypt.chat.models.ChatEntity>()) }

    // Dijalozi za brisanje/izlaz
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }
    var chatToDelete by remember { mutableStateOf<String?>(null) }
    var chatToLeave by remember { mutableStateOf<String?>(null) }

    // Filtriranje chata po search query
    val chatsSnapshot by rememberUpdatedState(newValue = chats)
    val searchQuerySnapshot by rememberUpdatedState(newValue = searchQuery)

    LaunchedEffect(chatsSnapshot, searchQuerySnapshot) {
        val normalized = searchQuerySnapshot.trim().lowercase()
        filteredChats = if (normalized.isBlank()) chatsSnapshot
        else chatsSnapshot.filter {
            (it.chatName?.lowercase()?.contains(normalized) == true) ||
                    (it.groupName?.lowercase()?.contains(normalized) == true) ||
                    (it.participants?.lowercase()?.contains(normalized) == true)
        }
    }

    PullToRefreshBox(
        isRefreshing = isLoading,
        onRefresh = { coroutineScope.launch { chatsViewModel.fetchChats() } }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding() // <--- OVO DODAŠ
        ) {
            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Chats", style = MaterialTheme.typography.headlineMedium)
                IconButton(onClick = { navController.navigate("chatGroupScreen") }) {
                    Icon(Icons.Default.Add, contentDescription = "New Chat")
                }
            }

            // Search Bar
            SmartSearchBar(
                visible = true,
                searchQuery = searchQuery,
                onImmediateQueryChange = { searchQuery = it },
                onDebouncedQueryChange = { },
                onAutoHide = { searchQuery = "" },
                placeholderText = "Search chats or people..."
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (isLoading && chats.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = 100.dp),
                    contentAlignment = Alignment.TopCenter
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(filteredChats, key = { it.chatId }) { chat ->
                        val isGroup = chat.chatType == "group"
                        val receiverId = if (isGroup) null else
                            chat.participants?.split(",")?.firstOrNull { it != currentUserId }

                        // Instant local participants (RAM cache, no blocking)
                        val participants = participantService.getCachedParticipants(chat.chatId)
                        val displayName = if (isGroup) {
                            chat.groupName ?: chat.chatName ?: "Unnamed"
                        } else {
                            participants.firstOrNull { it.userId != currentUserId }?.username
                                ?: chat.chatName
                                ?: "Direct Chat"
                        }

                        val avatarUrl by produceState<String?>(initialValue = null, receiverId) {
                            value = if (isGroup) null else chatsViewModel.getUserAvatarUrlSync(receiverId)
                        }

                        ChatRow(
                            chatEntity = chat,
                            displayName = displayName,
                            avatarUrl = avatarUrl,
                            isDarkMode = isDarkMode,
                            currentUserId = currentUserId,
                            canDelete = chat.creatorId == currentUserId,
                            onClick = {
                                val finalReceiverId = receiverId ?: ""
                                navController.navigate(
                                    "chatDetail/${chat.chatId}/${displayName}/$isGroup/$finalReceiverId"
                                )
                                coroutineScope.launch {
                                    chatsViewModel.updateUnreadCount(chat.chatId, 0)
                                }
                            },
                            onDelete = {
                                chatToDelete = chat.chatId
                                showDeleteDialog = true
                            },
                            onLeave = {
                                chatToLeave = chat.chatId
                                showLeaveDialog = true
                            },
                            onSettings = {
                                val createdAt = chat.createdAt.toString()
                                if (chat.chatId.isNotBlank()) {
                                    navController.navigate("chatOptions/${chat.chatId}/$createdAt")
                                } else {
                                    Log.e("ChatList", "Invalid chatId/createdAt")
                                }
                            },
                            updateUnreadCount = { chatId, count ->
                                coroutineScope.launch {
                                    chatsViewModel.updateUnreadCount(chatId, count)
                                }
                            }
                        )
                    }

                    if (filteredChats.isEmpty() && !isLoading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(top = 80.dp),
                                contentAlignment = Alignment.TopCenter
                            ) {
                                Text(
                                    text = "No chats available.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        // Delete Chat Dialog (samo creator)
        if (showDeleteDialog && chatToDelete != null) {
            AlertDialog(
                onDismissRequest = {
                    showDeleteDialog = false
                    chatToDelete = null
                },
                confirmButton = {
                    TextButton(onClick = {
                        coroutineScope.launch {
                            chatsViewModel.deleteChat(chatToDelete!!)
                            showDeleteDialog = false
                            chatToDelete = null
                        }
                    }) { Text("Delete") }
                },
                dismissButton = {
                    TextButton(onClick = {
                        showDeleteDialog = false
                        chatToDelete = null
                    }) { Text("Cancel") }
                },
                title = { Text("Confirm Deletion") },
                text = { Text("Are you sure you want to delete this chat? Only creator can delete a chat.") }
            )
        }

        // Leave Chat Dialog (za sve ostale)
        if (showLeaveDialog && chatToLeave != null) {
            AlertDialog(
                onDismissRequest = {
                    showLeaveDialog = false
                    chatToLeave = null
                },
                confirmButton = {
                    TextButton(onClick = {
                        coroutineScope.launch {
                            chatsViewModel.leaveChat(chatToLeave!!)
                            showLeaveDialog = false
                            chatToLeave = null
                        }
                    }) { Text("Leave") }
                },
                dismissButton = {
                    TextButton(onClick = {
                        showLeaveDialog = false
                        chatToLeave = null
                    }) { Text("Cancel") }
                },
                title = { Text("Leave Chat") },
                text = { Text("Are you sure you want to leave this chat? You will be removed from participants and chat will be deleted locally.") }
            )
        }
    }
}

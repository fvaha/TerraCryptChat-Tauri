
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.models.FriendEntity
import xyz.terracrypt.chat.row.FriendRow
import xyz.terracrypt.chat.row.UserSearchResultRow
import xyz.terracrypt.chat.ui.components.ChatConfirmationDialog
import xyz.terracrypt.chat.ui.components.ChatNavigator
import xyz.terracrypt.chat.ui.components.ShimmerPlaceholder
import xyz.terracrypt.chat.ui.components.SmartSearchBar
import xyz.terracrypt.chat.viewmodels.FriendsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    viewModel: FriendsViewModel,
    navController: NavHostController
) {
    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val isDarkMode by viewModel.sessionManager.isDarkModeEnabled.collectAsState()
    val pendingCount by viewModel.pendingRequestCount.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val isRefreshing by viewModel.isLoading.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val sentRequestIds by viewModel.sentRequestIds.collectAsState()
    val friends by viewModel.friendsList.collectAsState()
    val chats by viewModel.chatService.chats.collectAsState()

    val results = searchResults.filter { it.friendId !in sentRequestIds }
    val friendUiModels = remember(friends, chats) { viewModel.prepareFriendsForDisplay() }

    var searchBarVisible by remember { mutableStateOf(false) }
    val confirmState = remember { mutableStateOf<Boolean?>(null) }
    var pendingFriendToOpenChatWith by remember { mutableStateOf<FriendEntity?>(null) }

    // NEW STATE for delete feature
    var showDeleteMenuForFriend by remember { mutableStateOf<FriendEntity?>(null) }
    var friendToDelete by remember { mutableStateOf<FriendEntity?>(null) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    val navigateToChatId = remember { mutableStateOf<String?>(null) }
    val navigateToChatName = remember { mutableStateOf("") }
    val navigateToReceiverId = remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        viewModel.loadFriends(forceRefresh = true)
        viewModel.loadPendingRequestCount()
    }

    LaunchedEffect(Unit) {
        viewModel.snackbarMessages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.refreshTrigger.collect {
            viewModel.loadFriends(forceRefresh = true)
        }
    }

    LaunchedEffect(navigateToChatId.value) {
        navigateToChatId.value?.let { chatId ->
            delay(300)
            ChatNavigator.navigateToChat(
                navController = navController,
                chatId = chatId,
                chatName = navigateToChatName.value,
                isGroup = false,
                receiverId = navigateToReceiverId.value
            )
            navigateToChatId.value = null
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Friends") },
                actions = {
                    IconButton(onClick = { navController.navigate("pendingRequests") }) {
                        BadgedBox(
                            badge = {
                                if (pendingCount > 0) {
                                    Badge { Text(pendingCount.toString()) }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Filled.PersonAdd,
                                contentDescription = "Pending Requests"
                            )
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = {
                coroutineScope.launch {
                    viewModel.loadFriends(forceRefresh = true)
                    viewModel.loadPendingRequestCount()
                }
            }
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                item {
                    SmartSearchBar(
                        visible = true,
                        searchQuery = searchQuery,
                        placeholderText = "Search users to add as friends",
                        onImmediateQueryChange = { viewModel.updateSearchQuery(it.lowercase()) },
                        onDebouncedQueryChange = { viewModel.searchUsers(it.lowercase()) },
                        onAutoHide = {
                            viewModel.updateSearchQuery("")
                            viewModel.clearSearchResults()
                            searchBarVisible = false
                        }
                    )
                }

                when {
                    isRefreshing && friendUiModels.isEmpty() -> {
                        items(8) { ShimmerPlaceholder() }
                    }
                    results.isNotEmpty() -> {
                        items(results, key = { it.friendId }) { user ->
                            UserSearchResultRow(
                                user = user,
                                isDarkMode = isDarkMode,
                                onSendRequest = { userId, onComplete ->
                                    viewModel.sendFriendRequest(userId) { success, message ->
                                        onComplete(success, message)
                                    }
                                },
                                snackbarHostState = snackbarHostState
                            )
                        }
                    }
                    else -> {
                        items(friendUiModels, key = { it.friend.friendId }) { model ->
                            FriendRow(
                                friend = model.friend,
                                lastMessage = model.lastMessage,
                                timestamp = model.timestampFormatted,
                                isDarkMode = isDarkMode,
                                onClick = {
                                    model.existingChatId?.let { chatId ->
                                        navigateToChatId.value = chatId
                                        navigateToChatName.value = model.friend.username
                                        navigateToReceiverId.value = model.friend.friendId
                                    } ?: run {
                                        pendingFriendToOpenChatWith = model.friend
                                        confirmState.value = true
                                    }
                                },
                                onFavoriteToggled = { isFav ->
                                    viewModel.updateFavorite(model.friend, isFav)
                                },
                                onLongPress = {
                                    showDeleteMenuForFriend = model.friend
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // POPUP MENU on long press
    showDeleteMenuForFriend?.let { friend ->
        DropdownMenu(
            expanded = true,
            onDismissRequest = { showDeleteMenuForFriend = null }
        ) {
            DropdownMenuItem(
                text = { Text("Delete Friend") },
                onClick = {
                    showDeleteMenuForFriend = null
                    friendToDelete = friend
                    showDeleteConfirm = true
                }
            )
            DropdownMenuItem(
                text = { Text("Friends since: ${friend.createdAt ?: "-"}") },
                onClick = {},
                enabled = false
            )
            DropdownMenuItem(
                text = { Text("Date added: ${friend.updatedAt ?: "-"}") },
                onClick = {},
                enabled = false
            )
        }
    }

    // CONFIRM DELETE DIALOG
    if (showDeleteConfirm && friendToDelete != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteConfirm = false
                friendToDelete = null
            },
            title = { Text("Delete Friend?") },
            text = { Text("Are you sure you want to delete ${friendToDelete?.username}? This action cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteConfirm = false
                    friendToDelete?.let { friend ->
                        coroutineScope.launch {
                            viewModel.removeFriend(friend.friendId)
                        }
                    }
                    friendToDelete = null
                }) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showDeleteConfirm = false
                    friendToDelete = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (confirmState.value == true && pendingFriendToOpenChatWith != null) {
        val friend = pendingFriendToOpenChatWith!!
        val existingChat = viewModel.getChatWithFriend(friend)

        if (existingChat == null) {
            ChatConfirmationDialog(
                friendUsername = friend.username,
                confirmState = confirmState,
                onConfirm = {
                    coroutineScope.launch {
                        val chatId = viewModel.chatService.createChat(
                            name = friend.username,
                            participantIds = listOf(friend.friendId)
                        )
                        if (chatId != null) {
                            navigateToChatId.value = chatId
                            navigateToChatName.value = friend.username
                            navigateToReceiverId.value = friend.friendId
                        }
                        pendingFriendToOpenChatWith = null
                    }
                }
            )
        } else {
            confirmState.value = null
            navigateToChatId.value = existingChat.chatId
            navigateToChatName.value = existingChat.chatName ?: friend.username
            navigateToReceiverId.value = friend.friendId
            pendingFriendToOpenChatWith = null
        }
    }
}

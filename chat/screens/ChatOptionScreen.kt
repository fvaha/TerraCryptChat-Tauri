package xyz.terracrypt.chat.screens

import android.annotation.SuppressLint
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import coil.compose.rememberAsyncImagePainter
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.row.ParticipantRow
import xyz.terracrypt.chat.ui.components.SmartSearchBar
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import xyz.terracrypt.chat.utils.formatAsFriendlyDate
import xyz.terracrypt.chat.viewmodels.ChatOptionsViewModel


@SuppressLint("StateFlowValueCalledInComposition")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatOptionsScreen(
    navController: NavHostController,
    chatId: String,
    createdAt: String,
    onDeleteChat: () -> Unit,
    viewModel: ChatOptionsViewModel = hiltViewModel()
) {
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val participants by viewModel.participants.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val currentUser = viewModel.sessionManager.currentUser.collectAsState().value ?: return
    val currentUserId = currentUser.userId
    val isDarkMode by viewModel.sessionManager.isDarkModeEnabled.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val actualCreatedAt by viewModel.chatCreatedAt.collectAsState()

    var isSuperAdmin by remember { mutableStateOf(false) }
    var isAdminOrSuperAdmin by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val filteredParticipants = participants.filter {
        it.username.contains(searchQuery, ignoreCase = true)
    }

    val superAdmin = viewModel.getSuperAdmin()

    LaunchedEffect(chatId) {
        viewModel.loadParticipants(chatId)
        isSuperAdmin = viewModel.isSuperAdmin(chatId, currentUserId)
        isAdminOrSuperAdmin = viewModel.isAdminOrSuperAdmin(chatId, currentUserId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Chat Options")
                        actualCreatedAt?.let {
                            Text(
                                text = "Chat created: ${it.formatAsFriendlyDate()}",
                                fontSize = 11.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(top = 1.dp)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (isAdminOrSuperAdmin) {
                        IconButton(onClick = {
                            navController.navigate("addParticipant/$chatId")
                        }) {
                            Icon(Icons.Default.Add, contentDescription = "Add Participant")
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { scope.launch { viewModel.refreshParticipants(chatId) } }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 12.dp)
            ) {
                errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 6.dp))
                }

                // Super Admin + Search
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 1.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .border(1.dp, Color.LightGray, RoundedCornerShape(10.dp))
                            .padding(9.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box {
                                if (viewModel.userPictures.value[superAdmin?.userId]?.isNotBlank() == true) {
                                    Image(
                                        painter = rememberAsyncImagePainter(viewModel.userPictures.value[superAdmin?.userId]),
                                        contentDescription = null,
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                    )
                                } else {
                                    UserInitialsAvatar(
                                        username = superAdmin?.username.orEmpty(),
                                        isDarkMode = isDarkMode,
                                        modifier = Modifier.size(48.dp)
                                    )
                                }

                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .align(Alignment.TopEnd)
                                        .offset(x = 4.dp, y = (-4).dp)
                                        .background(MaterialTheme.colorScheme.surface, shape = CircleShape)
                                        .padding(1.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(superAdmin?.username.orEmpty(), style = MaterialTheme.typography.bodyMedium)
                            Text(
                                text = "Super Admin",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    SmartSearchBar(
                        visible = true,
                        searchQuery = searchQuery,
                        onImmediateQueryChange = { searchQuery = it },
                        onDebouncedQueryChange = {},
                        onAutoHide = {},
                        placeholderText = "Search chat members...",
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                    )
                }

                Column(modifier = Modifier.fillMaxHeight()) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f, fill = false),
                        contentPadding = PaddingValues(bottom = 20.dp)
                    ) {
                        items(filteredParticipants, key = { it.participantId }) { participant ->
                            ParticipantRow(
                                participant = participant,
                                profilePicture = viewModel.userPictures.value[participant.userId],
                                currentUserId = currentUserId,
                                superAdminId = superAdmin?.userId ?: "",
                                isAdmin = isAdminOrSuperAdmin,
                                isDarkMode = isDarkMode,
                                onPromote = {
                                    scope.launch {
                                        viewModel.updateParticipantRole(chatId, participant.userId, "admin")
                                        snackbarHostState.showSnackbar("${participant.username} is now an admin.")
                                    }
                                },
                                onDemote = {
                                    scope.launch {
                                        viewModel.updateParticipantRole(chatId, participant.userId, "member")
                                        snackbarHostState.showSnackbar("${participant.username} is now a member.")
                                    }
                                },
                                onRemove = {
                                    scope.launch {
                                        viewModel.removeParticipant(chatId, participant.userId)
                                        snackbarHostState.showSnackbar("${participant.username} was removed.")
                                    }
                                }
                            )
                        }

                        item {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterHorizontally),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    TextButton(onClick = { showDeleteDialog = true }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Delete", color = MaterialTheme.colorScheme.error)
                                    }

                                    if (!isSuperAdmin) {
                                        TextButton(onClick = { showLeaveDialog = true }) {
                                            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Leave", tint = MaterialTheme.colorScheme.error)
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Leave", color = MaterialTheme.colorScheme.error)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (showLeaveDialog) {
                AlertDialog(
                    onDismissRequest = { showLeaveDialog = false },
                    confirmButton = {
                        TextButton(onClick = {
                            showLeaveDialog = false
                            scope.launch {
                                viewModel.leaveChat(chatId)
                                snackbarHostState.showSnackbar("You left the chat.")
                                navController.popBackStack()
                            }
                        }) { Text("Leave", color = MaterialTheme.colorScheme.error) }
                    },
                    dismissButton = { TextButton(onClick = { showLeaveDialog = false }) { Text("Cancel") } },
                    title = { Text("Leave Chat?") },
                    text = { Text("Are you sure you want to leave this chat?") }
                )
            }

            if (showDeleteDialog) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog = false },
                    confirmButton = {
                        TextButton(onClick = {
                            showDeleteDialog = false
                            scope.launch {
                                onDeleteChat()
                                snackbarHostState.showSnackbar("Chat deleted.")
                                navController.popBackStack()
                            }
                        }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
                    },
                    dismissButton = { TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") } },
                    title = { Text("Delete Chat?") },
                    text = { Text("This will permanently delete the chat for all participants.") }
                )
            }
        }
    }
}

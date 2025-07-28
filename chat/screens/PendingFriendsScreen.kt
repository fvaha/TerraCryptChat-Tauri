package xyz.terracrypt.chat.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.row.FriendRequestCard
import xyz.terracrypt.chat.viewmodels.FriendsViewModel
import xyz.terracrypt.chat.viewmodels.PendingRequestsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PendingFriendsScreen(
    onBack: () -> Unit,
    pendingViewModel: PendingRequestsViewModel = hiltViewModel(),
    friendsViewModel: FriendsViewModel = hiltViewModel() // ✅ safe sharedViewModel
) {
    val pendingRequests by pendingViewModel.pendingRequests.collectAsState()
    val isLoading by pendingViewModel.isLoading.collectAsState()
    val statusMessage by pendingViewModel.statusMessage.collectAsState()

    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        pendingViewModel.loadPendingRequests()
    }

    LaunchedEffect(statusMessage) {
        statusMessage?.let {
            snackbarHostState.showSnackbar(it)
            pendingViewModel.clearStatusMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pending Requests") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        coroutineScope.launch {
                            pendingViewModel.loadPendingRequests()

                        }
                    }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        Box(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                pendingRequests.isEmpty() -> {
                    Text(
                        text = "No pending friend requests.",
                        modifier = Modifier.align(Alignment.Center),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                else -> {
                    LazyColumn {
                        items(pendingRequests, key = { it.id }) { request ->
                            FriendRequestCard(
                                request = request,
                                onAccept = {
                                    coroutineScope.launch {
                                        pendingViewModel.acceptRequest(
                                            requestId = request.id,
                                            onAccepted = {
                                                friendsViewModel.refreshFriends() // ✅ emituje trigger
                                            }
                                        )
                                    }
                                },
                                onDecline = {
                                    coroutineScope.launch {
                                        pendingViewModel.declineRequest(request.id)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

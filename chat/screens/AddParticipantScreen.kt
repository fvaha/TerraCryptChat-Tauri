package xyz.terracrypt.chat.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import xyz.terracrypt.chat.viewmodels.AddParticipantViewModel
import xyz.terracrypt.chat.viewmodels.FriendsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddParticipantScreen(
    chatId: String,
    onParticipantAdded: () -> Unit,
    onDismiss: () -> Unit,
    viewModel: AddParticipantViewModel = hiltViewModel(),
    friendsViewModel: FriendsViewModel = hiltViewModel(),
) {
    val allFriends by viewModel.filteredFriends.collectAsState()
    val searchText by viewModel.searchText.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadAvailableFriends(chatId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Participants") },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = searchText,
                onValueChange = { viewModel.setSearchText(it) },
                label = { Text("Search friends...") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text)
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(allFriends, key = { it.friendId }) { friend ->
                    FriendParticipantRow(
                        friend = friend,
                        sessionManager = viewModel.sessionManager, // ← pass this explicitly
                        onAddClicked = {
                            viewModel.addParticipantToChat(chatId, friend)
                            friendsViewModel.refreshFriends()
                            onParticipantAdded()
                        }
                    )
                }
            }

        }
    }
}

@Composable
private fun FriendParticipantRow(
    friend: xyz.terracrypt.chat.models.FriendEntity,
    sessionManager: SessionManager, // ← explicitly declare here
    onAddClicked: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                UserInitialsAvatar(
                    username = friend.username,
                    isDarkMode = sessionManager.isDarkModeEnabled.collectAsState().value
                )


                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = friend.username,
                        style = MaterialTheme.typography.titleMedium
                    )

                    if (friend.name.isNotBlank()) {
                        Text(
                            text = friend.name,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Button(onClick = onAddClicked) {
                Text("Add")
            }
        }
    }
}

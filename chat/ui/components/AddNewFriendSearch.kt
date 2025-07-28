package xyz.terracrypt.chat.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import xyz.terracrypt.chat.row.UserSearchResultRow
import xyz.terracrypt.chat.viewmodels.FriendsViewModel

@Composable
fun AddNewFriendSearch(
    viewModel: FriendsViewModel,
    modifier: Modifier = Modifier
) {
    val searchQuery by viewModel.searchQuery.collectAsState()
    val rawResults by viewModel.searchResults.collectAsState()
    val sentRequestIds by viewModel.sentRequestIds.collectAsState()
    val isDarkMode by viewModel.sessionManager.isDarkModeEnabled.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    Column(modifier = modifier) {
        SmartSearchBar(
            visible = true,
            searchQuery = searchQuery,
            onImmediateQueryChange = {
                viewModel.updateSearchQuery(it.lowercase())
            },
            onDebouncedQueryChange = {
                viewModel.searchUsers(it.lowercase())
            },
            onAutoHide = {
                viewModel.updateSearchQuery("")
                viewModel.clearSearchResults()
            },
            placeholderText = "Search users to add"
        )

        val results = rawResults
            .filter { it.friendId !in sentRequestIds }

        if (results.isNotEmpty()) {
            LazyColumn {
                items(results.take(10), key = { it.friendId }) { user ->
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
        }
    }
}

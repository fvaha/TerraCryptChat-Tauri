package xyz.terracrypt.chat.screens.chat

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreenTopBar(
    chatName: String,
    participantNames: String,
    isGroupChat: Boolean,
    onBack: () -> Unit,
    onSearchClick: () -> Unit,
    isSearching: MutableState<Boolean>,
    searchText: MutableState<String>,
    onSearchTextChange: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        TopAppBar(
            title = {
                Column {
                    Text(text = chatName, style = MaterialTheme.typography.titleMedium)
                    if (isGroupChat && participantNames.isNotBlank()) {
                        Text(
                            text = participantNames,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = onSearchClick) {
                    Icon(Icons.Outlined.Search, contentDescription = "Search")
                }
            }
        )

        if (isSearching.value) {
            OutlinedTextField(
                value = searchText.value,
                onValueChange = onSearchTextChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search messages...") },
                singleLine = true
            )
        }

    }
}

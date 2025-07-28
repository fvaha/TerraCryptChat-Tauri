package xyz.terracrypt.chat.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

@Composable
fun SmartSearchBar(
    visible: Boolean,
    searchQuery: String,
    onDebouncedQueryChange: (String) -> Unit,
    onImmediateQueryChange: (String) -> Unit,
    onAutoHide: () -> Unit,
    placeholderText: String = "Search...",
    modifier: Modifier = Modifier // ← now supports custom styling
) {
    val lastInputTime = remember { mutableLongStateOf(System.currentTimeMillis()) }

    fun updateQuery(query: String) {
        lastInputTime.longValue = System.currentTimeMillis()
        onImmediateQueryChange(query)
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        onDebouncedQueryChange(searchQuery)
    }

    LaunchedEffect(visible, searchQuery) {
        if (visible) {
            while (true) {
                delay(7000)
                val now = System.currentTimeMillis()
                if (now - lastInputTime.longValue >= 4000 && searchQuery.isBlank()) {
                    onAutoHide()
                    break
                }
            }
        }
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(initialOffsetY = { -40 }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -40 }) + fadeOut()
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { updateQuery(it) },
            placeholder = { Text(placeholderText) },
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            singleLine = true,
            trailingIcon = {
                if (searchQuery.isNotBlank()) {
                    IconButton(onClick = { updateQuery("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                }
            }
        )
    }
}

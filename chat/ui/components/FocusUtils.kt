package xyz.terracrypt.chat.ui.components

import androidx.compose.foundation.interaction.FocusInteraction
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged

@Composable
fun MutableInteractionSource.collectIsFocusedAsState(): State<Boolean> {
    val isFocused = remember { mutableStateOf(false) }

    LaunchedEffect(this) {
        interactions
            .distinctUntilChanged()
            .collectLatest { interaction ->
                when (interaction) {
                    is FocusInteraction.Focus -> isFocused.value = true
                    is FocusInteraction.Unfocus -> isFocused.value = false
                }
            }
    }

    return isFocused
}

package xyz.terracrypt.chat.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.navigation.NavController

object ChatNavigator {

    fun navigateToChat(
        navController: NavController,
        chatId: String,
        chatName: String,
        isGroup: Boolean,
        receiverId: String = ""
    ) {
        val encodedName = try {
            java.net.URLEncoder.encode(chatName, "UTF-8")
        } catch (_: Exception) {
            "Chat"
        }

        navController.navigate("chatDetail/$chatId/$encodedName/$isGroup/$receiverId") {
            launchSingleTop = true
            restoreState = true
        }
    }
}


@Composable
fun ChatConfirmationDialog(
    friendUsername: String,
    confirmState: MutableState<Boolean?>,
    onConfirm: () -> Unit
) {
    if (confirmState.value == true) {
        AlertDialog(
            onDismissRequest = { confirmState.value = null },
            title = { Text("Start new chat?") },
            text = { Text("Start a new one-on-one chat with @$friendUsername?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmState.value = null
                    onConfirm()
                }) {
                    Text("Yes")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    confirmState.value = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }
}

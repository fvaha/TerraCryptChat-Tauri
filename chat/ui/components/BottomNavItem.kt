package xyz.terracrypt.chat.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed interface BottomNavItem {
    val title: String
    val icon: ImageVector
    val route: String

    data object Friends : BottomNavItem {
        override val title = "Friends"
        override val icon = Icons.Filled.Person
        override val route = "friends"
    }

    data object Chats : BottomNavItem {
        override val title = "Chats"
        override val icon = Icons.Filled.ChatBubble
        override val route = "chats"
    }

    data object Settings : BottomNavItem {
        override val title = "Settings"
        override val icon = Icons.Filled.Settings
        override val route = "settings"
    }
}

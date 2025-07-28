package xyz.terracrypt.chat.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import xyz.terracrypt.chat.viewmodels.ChatListViewModel
import xyz.terracrypt.chat.viewmodels.FriendsViewModel

@Composable
fun BottomAppBarContent(
    navController: NavHostController,
    currentRoute: String?,
    friendsViewModel: FriendsViewModel,
    chatsViewModel: ChatListViewModel,
    isDarkMode: Boolean
) {
    val pendingCount by friendsViewModel.pendingRequestCount.collectAsState()
    val unreadCount by chatsViewModel.totalUnreadCount.collectAsState()

    val items = listOf(
        BottomNavItem.Friends,
        BottomNavItem.Chats,
        BottomNavItem.Settings
    )

    val backgroundColor = if (isDarkMode) Color(0xFF181818) else Color.White
    val selectedIconColor = if (isDarkMode) Color.White else MaterialTheme.colorScheme.onSurface
    val unselectedIconColor = if (isDarkMode) Color.White.copy(alpha = 0.6f) else MaterialTheme.colorScheme.onSurfaceVariant
    val selectedTextColor = if (isDarkMode) Color.White else MaterialTheme.colorScheme.onSurface
    val unselectedTextColor = if (isDarkMode) Color.White.copy(alpha = 0.6f) else MaterialTheme.colorScheme.onSurfaceVariant

    NavigationBar(
        containerColor = backgroundColor,
        tonalElevation = 0.dp,
        windowInsets = WindowInsets.navigationBars,
        modifier = Modifier.fillMaxWidth()
    )
    {
        items.forEach { item ->
            val isSelected = currentRoute == item.route
            val showBadge = when (item) {
                BottomNavItem.Friends -> pendingCount > 0
                BottomNavItem.Chats -> unreadCount > 0
                else -> false
            }
            val badgeText = when (item) {
                BottomNavItem.Friends -> pendingCount.toString()
                BottomNavItem.Chats -> unreadCount.toString()
                else -> ""
            }

            NavigationBarItem(
                selected = isSelected,
                onClick = {
                    if (!isSelected) {
                        navController.navigate(item.route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (showBadge) {
                            BadgedBox(badge = { Badge { Text(badgeText) } }) {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.title,
                                    modifier = Modifier.size(26.dp),
                                    tint = if (isSelected) selectedIconColor else unselectedIconColor
                                )
                            }
                        } else {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.title,
                                modifier = Modifier.size(26.dp),
                                tint = if (isSelected) selectedIconColor else unselectedIconColor
                            )
                        }
                    }
                },
                label = {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isSelected) selectedTextColor else unselectedTextColor
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = Color.Transparent,
                    selectedIconColor = selectedIconColor,
                    unselectedIconColor = unselectedIconColor,
                    selectedTextColor = selectedTextColor,
                    unselectedTextColor = unselectedTextColor
                )
            )
        }
    }
}

package xyz.terracrypt.chat

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.ui.components.BottomAppBarContent
import xyz.terracrypt.chat.ui.theme.SafeSyncTheme
import xyz.terracrypt.chat.viewmodels.ChatListViewModel
import xyz.terracrypt.chat.viewmodels.FriendsViewModel
import xyz.terracrypt.chat.viewmodels.UserViewModel

@Composable
fun MainScreen(
    sessionManager: SessionManager,
    friendService: FriendService,
    participantService: ParticipantService
) {
    val userViewModel: UserViewModel = hiltViewModel()
    val chatsViewModel: ChatListViewModel = hiltViewModel()
    val friendsViewModel: FriendsViewModel = hiltViewModel()

    val isDarkMode by sessionManager.isDarkModeEnabled.collectAsState()
    val isSessionInitialized by sessionManager.isSessionInitialized.collectAsState()
    val isLoggedIn by userViewModel.isLoggedIn.collectAsState(initial = false)

    val navController = rememberNavController()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route

    // ✅ No sessionManager.initializeSession() here anymore

    LaunchedEffect(isLoggedIn, isSessionInitialized) {
        if (isLoggedIn && isSessionInitialized) {
            chatsViewModel.fetchChats()
            friendsViewModel.loadFriends(forceRefresh = true)
            friendsViewModel.loadPendingRequestCount()
        }
    }

    SafeSyncTheme(darkTheme = isDarkMode) {
        when {
            !isSessionInitialized -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(
                            painter = painterResource(id = R.drawable.transparent_terracrypt_logo),
                            contentDescription = "Splash Logo",
                            modifier = Modifier.size(180.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        CircularProgressIndicator()
                    }
                }
            }
            else -> {
                val startDestination = if (isLoggedIn) "chats" else "login"

                Scaffold(
                    bottomBar = {
                        if (isLoggedIn && currentRoute != "chatDetail/{chatId}/{chatName}/{isGroupChat}/{receiverId}") {
                            BottomAppBarContent(
                                navController = navController,
                                currentRoute = currentRoute,
                                friendsViewModel = friendsViewModel,
                                chatsViewModel = chatsViewModel,
                                isDarkMode = isDarkMode
                            )

                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        NavHostContainer(
                            navController = navController,
                            sessionManager = sessionManager,
                            friendService = friendService,
                            participantService = participantService,
                            startDestination = startDestination
                        )
                    }
                }
            }
        }
    }
}

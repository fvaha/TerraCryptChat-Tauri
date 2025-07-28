package xyz.terracrypt.chat

import FriendsScreen
import android.util.Log
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.IntOffset
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.screens.AddParticipantScreen
import xyz.terracrypt.chat.screens.ChatGroupScreen
import xyz.terracrypt.chat.screens.ChatList
import xyz.terracrypt.chat.screens.ChatOptionsScreen
import xyz.terracrypt.chat.screens.LoginScreen
import xyz.terracrypt.chat.screens.PendingFriendsScreen
import xyz.terracrypt.chat.screens.RegistrationScreen
import xyz.terracrypt.chat.screens.SettingsScreen
import xyz.terracrypt.chat.screens.chat.ChatScreen
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.viewmodels.ChatGroupViewModel
import xyz.terracrypt.chat.viewmodels.ChatListViewModel
import xyz.terracrypt.chat.viewmodels.ChatScreenViewModel
import xyz.terracrypt.chat.viewmodels.FriendsViewModel
import xyz.terracrypt.chat.viewmodels.UserViewModel

@Composable
fun NavHostContainer(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    sessionManager: SessionManager,
    startDestination: String,
    friendService: FriendService,
    participantService: ParticipantService,// still passed, maybe used later
) {
    val bottomRoutes = listOf("friends", "chats", "settings")

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition = {
            simpleEnterTransition(initialState.destination.route, targetState.destination.route, bottomRoutes)
        },
        exitTransition = {
            simpleExitTransition(initialState.destination.route, targetState.destination.route, bottomRoutes)
        },
        popEnterTransition = {
            simpleEnterTransition(initialState.destination.route, targetState.destination.route, bottomRoutes)
        },
        popExitTransition = {
            simpleExitTransition(initialState.destination.route, targetState.destination.route, bottomRoutes)
        }
    ) {
        composable("login") {
            val userViewModel: UserViewModel = hiltViewModel()
            LoginScreen(
                navController = navController,
                userViewModel = userViewModel,
                sessionManager = sessionManager,
                onLoginSuccess = {
                    navController.navigate("chats") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("registration") {
            val userViewModel: UserViewModel = hiltViewModel()
            RegistrationScreen(
                navController = navController,
                userViewModel = userViewModel,
                sessionManager = sessionManager,
                onRegistrationSuccess = {
                    navController.navigate("chats") {
                        popUpTo("registration") { inclusive = true }
                    }
                }
            )
        }

        composable("chats") {
            val chatsViewModel: ChatListViewModel = hiltViewModel()
            ChatList(
                navController = navController,
                chatsViewModel = chatsViewModel,
                sessionManager = sessionManager,
                participantService = participantService
            )
        }

        composable("friends") {
            val friendsViewModel: FriendsViewModel = hiltViewModel()
            FriendsScreen(
                viewModel = friendsViewModel,
                navController = navController
            )
        }

        composable("settings") {
            val userViewModel: UserViewModel = hiltViewModel()
            SettingsScreen(
                navController = navController,
                userViewModel = userViewModel,
                sessionManager = sessionManager
            )
        }

        composable("pendingRequests") {
            PendingFriendsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable("chatGroupScreen") {
            val chatGroupViewModel: ChatGroupViewModel = hiltViewModel()
            ChatGroupScreen(
                navController = navController,
                chatGroupViewModel = chatGroupViewModel,
                sessionManager = sessionManager,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = "chatDetail/{chatId}/{chatName}/{isGroupChat}/{receiverId}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("chatName") { type = NavType.StringType },
                navArgument("isGroupChat") { type = NavType.BoolType },
                navArgument("receiverId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId").orEmpty()
            val chatName = backStackEntry.arguments?.getString("chatName").orEmpty()
            val isGroupChat = backStackEntry.arguments?.getBoolean("isGroupChat") ?: false
            val receiverId = backStackEntry.arguments?.getString("receiverId").orEmpty()

            if (chatId.isBlank() || chatName.isBlank()) {
                Log.e("NavHostContainer", "Missing chatId or chatName")
                navController.popBackStack()
                return@composable
            }

            val chatScreenViewModel: ChatScreenViewModel = hiltViewModel()

            ChatScreen(
                navController = navController,
                chatId = chatId,
                chatName = chatName,
                isGroupChat = isGroupChat,
                receiverId = receiverId,
                viewModel = chatScreenViewModel,
                sessionManager = sessionManager
            )
        }

        composable(
            route = "chatOptions/{chatId}/{createdAt}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("createdAt") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId").orEmpty()
            val createdAt = backStackEntry.arguments?.getString("createdAt").orEmpty()

            if (chatId.isBlank() || createdAt.isBlank()) {
                Log.e("NavHostContainer", "Missing required args for ChatOptionsScreen")
                navController.popBackStack()
                return@composable
            }

            ChatOptionsScreen(
                navController = navController,
                chatId = chatId,
                createdAt = createdAt,
                onDeleteChat = {
                    Log.d("ChatOptionsScreen", "Chat deleted with ID: $chatId")
                }
            )
        }

        composable(
            route = "addParticipant/{chatId}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId").orEmpty()

            if (chatId.isBlank()) {
                Log.e("NavHostContainer", "Invalid chatId for AddParticipantScreen")
                navController.popBackStack()
            } else {
                AddParticipantScreen(
                    chatId = chatId,
                    onParticipantAdded = { /* Optional: trigger refresh */ },
                    onDismiss = { navController.popBackStack() }
                )
            }
        }
    }
}

private fun simpleEnterTransition(from: String?, to: String?, bottomRoutes: List<String>): EnterTransition {
    return when {
        from == "login" && to == "registration" -> {
            slideInHorizontally(
                initialOffsetX = { it },
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
            ) + fadeIn()
        }
        from == "registration" && to == "login" -> {
            slideInHorizontally(
                initialOffsetX = { -it },
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
            ) + fadeIn()
        }
        from in bottomRoutes && to in bottomRoutes -> {
            val fromIndex = bottomRoutes.indexOf(from)
            val toIndex = bottomRoutes.indexOf(to)

            val springSpec = spring<IntOffset>(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )

            if (fromIndex < toIndex) {
                slideInHorizontally(initialOffsetX = { it }, animationSpec = springSpec) + fadeIn()
            } else {
                slideInHorizontally(initialOffsetX = { -it }, animationSpec = springSpec) + fadeIn()
            }
        }
        else -> EnterTransition.None
    }
}

private fun simpleExitTransition(from: String?, to: String?, bottomRoutes: List<String>): ExitTransition {
    return when {
        from == "login" && to == "registration" -> {
            slideOutHorizontally(
                targetOffsetX = { -it },
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
            ) + fadeOut()
        }
        from == "registration" && to == "login" -> {
            slideOutHorizontally(
                targetOffsetX = { it },
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
            ) + fadeOut()
        }
        from in bottomRoutes && to in bottomRoutes -> {
            val fromIndex = bottomRoutes.indexOf(from)
            val toIndex = bottomRoutes.indexOf(to)

            val springSpec = spring<IntOffset>(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )

            if (fromIndex < toIndex) {
                slideOutHorizontally(targetOffsetX = { -it }, animationSpec = springSpec) + fadeOut()
            } else {
                slideOutHorizontally(targetOffsetX = { it }, animationSpec = springSpec) + fadeOut()
            }
        }
        else -> ExitTransition.None
    }
}

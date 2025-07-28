@file:Suppress("UnrememberedMutableState")

package xyz.terracrypt.chat.screens

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.Participant
import xyz.terracrypt.chat.ui.components.UserInitialsAvatar
import xyz.terracrypt.chat.viewmodels.ChatGroupViewModel
import java.net.URLEncoder
import kotlin.math.sqrt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatGroupScreen(
    navController: NavHostController,
    chatGroupViewModel: ChatGroupViewModel,
    sessionManager: SessionManager,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedFriends by chatGroupViewModel.selectedFriends.collectAsState()
    val friends by chatGroupViewModel.friends.collectAsState()
    val groupName by chatGroupViewModel.groupName.collectAsState()
    val isLoading by chatGroupViewModel.isLoading.collectAsState()
    val creatingChat by chatGroupViewModel.creatingChat.collectAsState()
    val focusRequester = remember { FocusRequester() }
    val showGroupNameField = selectedFriends.size >= 2
    val isDarkMode by sessionManager.isDarkModeEnabled.collectAsState()
    val context = LocalContext.current
    val canCreateGroup = selectedFriends.size > 1 // Disable if more than 1 selected for group chat

    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    val navigateToChatId = remember { mutableStateOf<String?>(null) }
    val navigateToChatName = remember { mutableStateOf("") }
    val navigateToIsGroup = remember { mutableStateOf(false) }
    val navigateToReceiverId = remember { mutableStateOf("") }

    // Navigacija na chat nakon kreiranja
    LaunchedEffect(navigateToChatId.value) {
        navigateToChatId.value?.let { chatId ->
            val chatNameEscaped = URLEncoder.encode(navigateToChatName.value, "utf-8")
            navController.navigate(
                "chatDetail/$chatId/$chatNameEscaped/${navigateToIsGroup.value}/${navigateToReceiverId.value}"
            )
            navigateToChatId.value = null
        }
    }

    // Fokus na polje za unos imena grupe ako treba
    LaunchedEffect(showGroupNameField) {
        if (showGroupNameField) {
            delay(100)
            withContext(Dispatchers.Main) {
                focusRequester.requestFocus()
            }
        }
    }

    // Shake detection za random ime grupe
    DisposableEffect(Unit) {
        val shakeDetector = ShakeDetector(
            onShake = {
                chatGroupViewModel.updateGroupName(chatGroupViewModel.generateRandomGroupName())
            },
            threshold = 3.0f // Možeš povećati ili smanjiti za osjetljivost
        )
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        sensorManager.registerListener(shakeDetector, accelerometer, SensorManager.SENSOR_DELAY_UI)
        onDispose { sensorManager.unregisterListener(shakeDetector) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Start new chat...") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Button(
                onClick = {
                    if (selectedFriends.size > 1 && groupName.isBlank()) {
                        chatGroupViewModel.updateGroupName(chatGroupViewModel.generateRandomGroupName())
                    }
                    chatGroupViewModel.createGroup(
                        onSuccess = { chatId ->
                            val isGroup = selectedFriends.size > 1
                            val chatName = if (isGroup) groupName.ifBlank { "Group" } else selectedFriends.firstOrNull()?.username ?: "Chat"
                            val receiverId = if (!isGroup) selectedFriends.firstOrNull()?.userId ?: "none" else "none"
                            navigateToChatId.value = chatId
                            navigateToChatName.value = chatName
                            navigateToIsGroup.value = isGroup
                            navigateToReceiverId.value = receiverId
                        },
                        onError = { error ->
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar(
                                    message = error.message ?: "Something went wrong",
                                    withDismissAction = true
                                )
                            }
                        }
                    )
                },
                enabled = selectedFriends.isNotEmpty() && !canCreateGroup, // Disable if group creation
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    if (selectedFriends.size <= 1) "Start Chat"
                    else "Create Group (${selectedFriends.size})"
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(modifier = modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .padding(paddingValues)
                    .fillMaxSize()
            ) {
                // Poruka ako nema prijatelja
                if (friends.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("You don't have any friends to chat with yet.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    if (showGroupNameField) {
                        OutlinedTextField(
                            value = groupName,
                            onValueChange = chatGroupViewModel::updateGroupName,
                            label = { Text("Group Name") },
                            placeholder = { Text("Enter group name") },
                            supportingText = {
                                Text("Tip: Shake your phone or tap the dice for a random group name")
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                .focusRequester(focusRequester),
                            trailingIcon = {
                                IconButton(onClick = {
                                    chatGroupViewModel.updateGroupName(chatGroupViewModel.generateRandomGroupName())
                                }) {
                                    Icon(Icons.Default.Casino, contentDescription = "Randomize name")
                                }
                            }
                        )
                    }

                    LazyColumn {
                        items(friends) { friend ->
                            FriendSelectionItem(
                                friend = friend,
                                isSelected = selectedFriends.any { it.userId == friend.userId },
                                isDarkMode = isDarkMode,
                                onToggleSelection = { chatGroupViewModel.toggleSelection(friend) }
                            )
                        }
                    }
                }
            }

            // Loading overlay
            if (creatingChat || isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f))
                        .blur(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            if (creatingChat) "Creating Chat..." else "Loading...",
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FriendSelectionItem(
    friend: Participant,
    isSelected: Boolean,
    isDarkMode: Boolean,
    onToggleSelection: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggleSelection)
            .padding(vertical = 8.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            UserInitialsAvatar(
                username = friend.username,
                isDarkMode = isDarkMode,
                modifier = Modifier.size(44.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(text = friend.username, style = MaterialTheme.typography.bodyLarge)
        }
        Checkbox(
            checked = isSelected,
            onCheckedChange = { onToggleSelection() }, // Sad je direktno klikabilan
            modifier = Modifier.size(24.dp)
        )
    }
}

// ShakeDetector sa opcionalnim threshold parametrom
class ShakeDetector(
    private val onShake: () -> Unit,
    private val threshold: Float = 3.0f // default: 3.0f, možeš menjati po potrebi
) : SensorEventListener {
    private var lastShakeTime = 0L

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val gX = event.values[0] / SensorManager.GRAVITY_EARTH
            val gY = event.values[1] / SensorManager.GRAVITY_EARTH
            val gZ = event.values[2] / SensorManager.GRAVITY_EARTH
            val gForce = sqrt(gX * gX + gY * gY + gZ * gZ)

            if (gForce > threshold) {
                val now = System.currentTimeMillis()
                if (now - lastShakeTime > 500) {
                    lastShakeTime = now
                    onShake()
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}

package xyz.terracrypt.chat.managers

import android.util.Log
import androidx.appcompat.app.AppCompatDelegate
import dagger.Lazy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.UserDao
import xyz.terracrypt.chat.models.UserEntity
import xyz.terracrypt.chat.network.WebSocketManager
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.MessageService
import xyz.terracrypt.chat.services.ParticipantService
import xyz.terracrypt.chat.services.UserService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    private val userService: UserService,
    private val tokenManager: TokenManager,
    private val webSocketManager: WebSocketManager,
    private val cacheManager: CacheManager,
    private val userDao: UserDao,
    private val friendService: Lazy<FriendService>,
    private val chatService: Lazy<ChatService>,
    private val messageService: Lazy<MessageService>,
    private val participantService: Lazy<ParticipantService>,
    private val deleteManager: DeleteManager
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _isDarkModeEnabled = MutableStateFlow(false)
    val isDarkModeEnabled: StateFlow<Boolean> = _isDarkModeEnabled

    private val _currentUser = MutableStateFlow<UserEntity?>(null)
    val currentUser: StateFlow<UserEntity?> = _currentUser

    private val _isSessionInitialized = MutableStateFlow(false)
    val isSessionInitialized: StateFlow<Boolean> = _isSessionInitialized

    private var currentAccessToken: String? = null

    private val _useRustSdkEncryption = MutableStateFlow(false)
    val useRustSdkEncryption: StateFlow<Boolean> = _useRustSdkEncryption

    private var tokenWatchdogJob: Job? = null

    suspend fun setRustSdkEncryptionEnabled(enabled: Boolean) = withContext(Dispatchers.IO) {
        _useRustSdkEncryption.value = enabled
    }

    private fun loadEncryptionPreferenceFromUser() {
        _currentUser.value?.let { user ->
            // Example: load persisted preference
        }
    }

    suspend fun initializeSession() = withContext(Dispatchers.IO) {
        try {
            val user = userDao.getFirstUser()
            _currentUser.value = user
            val token = user?.tokenHash

            if (!token.isNullOrBlank() && !tokenManager.isTokenExpired(token)) {
                updateTokenAndState(token, user)
            } else {
                attemptSilentRelogin()
            }

            loadEncryptionPreferenceFromUser()
            _isSessionInitialized.value = true

            postLoginInitialization()

        } catch (e: Exception) {
            e.printStackTrace()
            _isSessionInitialized.value = true
        }
    }

    private suspend fun attemptSilentRelogin() = withContext(Dispatchers.IO) {
        val (username, password) = tokenManager.getStoredCredentials()
        val success = !username.isNullOrBlank() && !password.isNullOrBlank() &&
                userService.signIn(username, password)

        if (success) {
            val user = userService.getLoggedInUser()
            updateTokenAndState(user?.tokenHash, user)
        } else {
            logOut()
        }
    }

    suspend fun logIn() = withContext(Dispatchers.IO) {
        val user = userDao.getFirstUser()
        if (user != null && !user.tokenHash.isNullOrBlank()) {
            updateTokenAndState(user.tokenHash, user)
        } else {
            logOut()
        }
    }

    //MARK: Full logout koji briše sve podatke iz baze
    suspend fun logOut() = withContext(Dispatchers.IO) {
        _isLoggedIn.value = false
        _currentUser.value = null
        currentAccessToken = null

        tokenManager.clearAccessToken()
        tokenManager.clearCredentials()
        userService.clearLoggedInUser()
        cacheManager.clearAll()
        stopTokenWatchdog()
        webSocketManager.disconnect()
        _useRustSdkEncryption.value = false

        //MARK: Briši SVE podatke iz baze
        deleteManager.deleteAllLocalData()
    }


    suspend fun clearCache() = withContext(Dispatchers.IO) {
        cacheManager.clearAll()
    }

    suspend fun toggleDarkMode() = withContext(Dispatchers.IO) {
        val newMode = !_isDarkModeEnabled.value
        _isDarkModeEnabled.value = newMode
        _currentUser.value?.let { user ->
            userDao.updateDarkMode(user.userId, newMode)
            _currentUser.value = user.copy(isDarkMode = newMode)
        }
        applyDarkMode(newMode)
    }

    fun getCurrentUsername(): String = _currentUser.value?.username ?: "Unknown"
    fun getCurrentUserId(): String? = _currentUser.value?.userId

    private fun applyDarkMode(enabled: Boolean) {
        CoroutineScope(Dispatchers.Main.immediate).launch {
            AppCompatDelegate.setDefaultNightMode(
                if (enabled) AppCompatDelegate.MODE_NIGHT_YES
                else AppCompatDelegate.MODE_NIGHT_NO
            )
        }
    }

    private suspend fun updateTokenAndState(token: String?, user: UserEntity?) {
        if (token.isNullOrBlank() || user == null) {
            logOut()
            return
        }

        currentAccessToken = token
        tokenManager.updateAccessToken(token)

        _isLoggedIn.value = true
        _currentUser.value = user
        _isDarkModeEnabled.value = user.isDarkMode == true
        applyDarkMode(user.isDarkMode)

        startTokenWatchdog()
        webSocketManager.connect()
    }

    suspend fun postLoginInitialization() = coroutineScope {
        val token = tokenManager.getAccessToken()
        if (token.isNullOrBlank() || tokenManager.isTokenExpired(token)) {
            Log.e("SessionManager", "Token missing or expired. Skipping API syncs.")
            return@coroutineScope
        }

        launch { try { friendService.get().fetchFriendsAndUpdateCoreData() } catch (e: Exception) { e.printStackTrace() } }
        launch { try { chatService.get().syncChatsWithAPI() } catch (e: Exception) { e.printStackTrace() } }
        launch { try { participantService.get().syncAllParticipants() } catch (e: Exception) { e.printStackTrace() } }
        launch { try { preloadMessages() } catch (e: Exception) { e.printStackTrace() } }
    }

    private suspend fun preloadMessages() {
        try {
            val chats = chatService.get().chats.value
            for (chat in chats) {
                messageService.get().fetchMessages(chat.chatId, limit = 1)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    //MARK: Token Watchdog (Signal-like)
    private fun startTokenWatchdog() {
        if (tokenWatchdogJob != null) return

        tokenWatchdogJob = scope.launch {
            while (true) {
                delay(60000) // proverava svakih 60 sekundi

                val token = tokenManager.getCachedAccessToken()
                if (!token.isNullOrBlank()) {
                    val exp = tokenManager.getExpirationTime(token)
                    val now = System.currentTimeMillis() / 1000
                    val secondsLeft = exp - now

                    Log.d("TokenWatchdog", "Token expires in $secondsLeft seconds")

                    if (secondsLeft < 300) {
                        Log.w("TokenWatchdog", "Token expires soon, attempting silent relogin...")

                        attemptSilentRelogin()

                        val refreshedToken = tokenManager.getCachedAccessToken()
                        if (refreshedToken.isNullOrBlank() || tokenManager.isTokenExpired(refreshedToken)) {
                            Log.e("TokenWatchdog", "Silent relogin failed! Logging out...")
                            logOut()
                            break
                        } else {
                            Log.d("TokenWatchdog", "Silent relogin successful, new token refreshed.")
                        }
                    }
                }
            }
        }
    }

    private fun stopTokenWatchdog() {
        tokenWatchdogJob?.cancel()
        tokenWatchdogJob = null
    }
}

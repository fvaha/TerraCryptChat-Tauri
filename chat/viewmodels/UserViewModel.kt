package xyz.terracrypt.chat.viewmodels

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.SignUpParams
import xyz.terracrypt.chat.models.UserEntity
import xyz.terracrypt.chat.services.KeyService
import xyz.terracrypt.chat.services.UserService
import javax.inject.Inject

@HiltViewModel
class UserViewModel @Inject constructor(
    private val userService: UserService,
    private val sessionManager: SessionManager,
    private val keyService: KeyService
) : ViewModel() {

    // --- editable input fields ---
    private val _name     = MutableStateFlow("")
    private val _username = MutableStateFlow("")
    private val _email    = MutableStateFlow("")
    private val _password = MutableStateFlow("")

    val name: StateFlow<String>     get() = _name.asStateFlow()
    val username: StateFlow<String> get() = _username.asStateFlow()
    val email: StateFlow<String>    get() = _email.asStateFlow()
    val password: StateFlow<String> get() = _password.asStateFlow()

    // --- ui state ---
    private val _isLoading    = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow("")

    val isLoading: StateFlow<Boolean> get() = _isLoading.asStateFlow()
    val errorMessage: StateFlow<String> get() = _errorMessage.asStateFlow()

    val isLoggedIn: StateFlow<Boolean> = sessionManager.isLoggedIn
    val user: StateFlow<UserEntity?>   = sessionManager.currentUser

    private var fieldsInflated = false

    init { observeCurrentUser() }

    // --- setters ---
    fun setName(v: String)     { _name.value     = v.trim() }
    fun setUsername(v: String) { _username.value = v.trim() }
    fun setEmail(v: String)    { _email.value    = v.trim() }
    fun setPassword(v: String) { _password.value = v }

    // --- AUTH with KEY GENERATION ---
    fun login(context: Context) = launchIO {
        runCatchingIO { userService.signIn(username.value, password.value) }
            .onSuccess { ok ->
                if (ok) {
                    val userId = sessionManager.getCurrentUserId()
                    if (!userId.isNullOrEmpty()) {
                        val existingKeys = keyService.getKeysForUser(userId)
                        if (existingKeys == null) {
                            keyService.generateAndSaveKeysForUser(context, userId)
                        }
                    }
                    sessionManager.logIn()
                } else {
                    setError("Login failed. Check credentials.")
                }
            }
    }

    fun register(context: Context) = launchIO {
        val p = SignUpParams(
            email    = email.value,
            username = username.value,
            name     = name.value.ifEmpty { null },
            password = password.value
        )
        runCatchingIO { userService.signUp(p) }
            .onSuccess { ok ->
                if (ok) {
                    val userId = sessionManager.getCurrentUserId()
                    if (!userId.isNullOrEmpty()) {
                        val existingKeys = keyService.getKeysForUser(userId)
                        if (existingKeys == null) {
                            keyService.generateAndSaveKeysForUser(context, userId)
                        }
                    }
                    sessionManager.logIn()
                } else {
                    setError("Registration failed.")
                }
            }
    }

    fun logout() = launchIO {
        _isLoading.value = true
        sessionManager.logOut()
        clearFields()
        _isLoading.value = false
    }

    fun updateProfile() = launchIO {
        val updated = runCatchingIO {
            userService.updateProfile(
                name     = name.value,
                username = username.value,
                email    = email.value
            )
        }.getOrNull()

        if (updated != null) setError("Profile updated successfully.")
        else                 setError("Failed to update profile.")
    }

    fun clearError() = setError("")
    fun clearCache() = launchIO { sessionManager.clearCache() }

    private fun observeCurrentUser() = launchIO {
        sessionManager.currentUser.collectLatest { u ->
            when {
                u != null && !fieldsInflated -> {
                    inflateFromUser(u)
                    fieldsInflated = true
                }
                u == null -> {
                    clearFields()
                    fieldsInflated = false
                }
            }
        }
    }

    private fun inflateFromUser(u: UserEntity) {
        _name.value     = u.name.orEmpty()
        _username.value = u.username
        _email.value    = u.email.orEmpty()
    }

    private fun clearFields() {
        _name.value = ""
        _username.value = ""
        _email.value = ""
        _password.value = ""
    }

    fun setError(msg: String) { _errorMessage.value = msg }

    private fun launchIO(block: suspend () -> Unit) =
        viewModelScope.launch(Dispatchers.IO) { block() }

    private suspend inline fun <T> runCatchingIO(crossinline f: suspend () -> T) =
        kotlin.runCatching {
            _isLoading.value = true
            val r = f()
            _isLoading.value = false
            r
        }.onFailure {
            setError(it.localizedMessage ?: "Unknown error.")
            _isLoading.value = false
        }
}

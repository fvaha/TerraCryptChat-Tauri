package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import javax.inject.Inject

@HiltViewModel
class ThemeViewModel @Inject constructor(
    private val sessionManager: SessionManager
) : ViewModel() {

    val isDarkMode: StateFlow<Boolean> = sessionManager.isDarkModeEnabled

    fun toggleDarkMode() {
        viewModelScope.launch {
            sessionManager.toggleDarkMode()
        }
    }
}

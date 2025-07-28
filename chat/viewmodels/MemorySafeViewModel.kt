package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel

/**
 * A safer base ViewModel that auto-cleans heavy StateFlows or background coroutines.
 */
abstract class MemorySafeViewModel : ViewModel() {

    // Lightweight coroutine scope if needed
    private val ioScope = CoroutineScope(Dispatchers.IO)

    override fun onCleared() {
        super.onCleared()
        ioScope.cancel() // Cancel any extra background tasks
        onClearMemory()
    }

    /**
     * Override this to clear large lists, caches, or flows manually if needed.
     */
    protected open fun onClearMemory() {
        // Example:
        // _friendsList.value = emptyList()
    }
}

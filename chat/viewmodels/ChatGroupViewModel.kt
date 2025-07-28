package xyz.terracrypt.chat.viewmodels

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.models.Participant
import xyz.terracrypt.chat.models.Role
import xyz.terracrypt.chat.services.ChatService
import xyz.terracrypt.chat.services.FriendService
import xyz.terracrypt.chat.services.UserService
import java.util.UUID
import javax.inject.Inject

/**
 * ViewModel za kreiranje novog chata ili grupe, sa naprednim random imenom za grupu.
 */
@HiltViewModel
class ChatGroupViewModel @Inject constructor(
    private val userService: UserService,
    private val friendService: FriendService,
    private val _chatService: ChatService
) : MemorySafeViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _friends = MutableStateFlow<List<Participant>>(emptyList())
    val friends: StateFlow<List<Participant>> = _friends.asStateFlow()

    private val _selectedFriends = MutableStateFlow<List<Participant>>(emptyList())
    val selectedFriends: StateFlow<List<Participant>> = _selectedFriends.asStateFlow()

    private val _searchText = MutableStateFlow("")
    val searchText: StateFlow<String> = _searchText.asStateFlow()

    private val _groupName = MutableStateFlow("")
    val groupName: StateFlow<String> = _groupName.asStateFlow()

    private val _creatingChat = MutableStateFlow(false)
    val creatingChat: StateFlow<Boolean> = _creatingChat.asStateFlow()

    // Reactive friend list based on search text
    val filteredFriends: StateFlow<List<Participant>> = _searchText
        .combine(_friends) { search, friends ->
            if (search.isBlank()) friends
            else friends.filter { it.username.contains(search, ignoreCase = true) }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    var currentUsername: String = ""
        private set

    // -- Random name generators (kao u Swift verziji) --
    private val prefixes = listOf(
        "Encrypted", "Quantum", "Zero-Day", "Neural", "Dark", "Cyber", "Silent", "Ghost",
        "Stealth", "Synthetic", "AI", "Coded", "Parallel", "Omega", "Secure", "Echo",
        "Nano", "Meta", "Trusted", "Core", "Hidden", "Invisible", "Private", "Shielded"
    )

    private val cores = listOf(
        "Protocol", "Collective", "Cluster", "Core", "Link", "Vault", "Syndicate", "Unit",
        "Matrix", "Grid", "Node", "Shell", "Instance", "Wave", "Process", "Net", "Nexus",
        "Construct", "Fabric", "Realm", "Channel", "Sector", "Forum", "Circle", "Chamber"
    )

    private val suffixes = listOf(
        "", "Group", "Ops", "Initiative", "Hub", "Division", "Zone", "Array", "Beacon",
        "Assembly", "Sector", "Council", "Network", "Society", "Union"
    )

    // Ako želiš da ne ponavljaš random imena
    private val usedGroupNames = mutableSetOf<String>()

    val chatService: ChatService
        get() = _chatService

    init {
        loadFriends()
    }

    /**
     * Promeni tekst za pretragu prijatelja.
     */
    fun updateSearchText(text: String) {
        _searchText.value = text
    }

    /**
     * Postavi ime grupe.
     */
    fun updateGroupName(name: String) {
        _groupName.value = name
    }

    /**
     * Napravi napredno random ime za grupni chat (prefiks + core + sufiks + opcioni hash).
     */
    fun generateRandomGroupName(): String {
        val prefix = prefixes.randomOrNull() ?: ""
        val core = cores.randomOrNull() ?: ""
        val suffix = suffixes.randomOrNull() ?: ""
        var name = listOf(prefix, core, suffix).filter { it.isNotBlank() }.joinToString(" ")
        if ((0..1).random() == 1) {
            name += " #" + (100..9999).random()
        }
        return name
    }

    /**
     * Napravi jedinstveno ime za grupu (izbegavaj duplikate dok ima slobodnih).
     */
    fun generateUniqueGroupName(): String {
        repeat(50) {
            val name = generateRandomGroupName()
            if (usedGroupNames.add(name)) return name
        }
        return "Secure Group #" + (1000..9999).random()
    }

    /**
     * Selektuj ili deselektuj prijatelja za novi chat/grupu.
     */
    fun toggleSelection(participant: Participant) {
        _selectedFriends.value = _selectedFriends.value.toMutableList().apply {
            if (any { it.userId == participant.userId }) {
                removeAll { it.userId == participant.userId }
            } else {
                add(participant)
            }
        }
    }

    /**
     * Očisti selekciju i ime grupe.
     */
    fun clearSelection() {
        _selectedFriends.value = emptyList()
        _groupName.value = ""
    }

    /**
     * Kreiraj novi chat (1na1 ili grupni). Ako 1na1 već postoji, otvori njega.
     */
    fun createGroup(
        onSuccess: (chatId: String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val participants = _selectedFriends.value
        val participantIds = participants.map { it.userId }
        val isGroup = participantIds.size > 1
        val resolvedName = if (isGroup) _groupName.value.ifBlank { generateUniqueGroupName() }
        else participants.firstOrNull()?.username ?: "Chat"

        viewModelScope.launch {
            _isLoading.value = true
            _creatingChat.value = true
            try {
                // 1-na-1: Prvo proveri da li chat već postoji
                if (!isGroup) {
                    val friendId = participantIds.firstOrNull()
                    val existingChat = friendId?.let { _chatService.getChatWithFriend(it) }
                    if (existingChat != null) {
                        _chatService.currentlyOpenChatId = existingChat.chatId
                        onSuccess(existingChat.chatId)
                        return@launch
                    }
                }
                // Napravi novi chat
                val createdChatId = _chatService.createChat(resolvedName, participantIds)
                if (createdChatId != null) {
                    _chatService.currentlyOpenChatId = createdChatId
                    clearSelection()
                    // Sačekaj dok se novi chat ne pojavi u listi
                    chatService.chats.first { chatList -> chatList.any { it.chatId == createdChatId } }
                    onSuccess(createdChatId)
                } else {
                    onError(Exception("Chat creation failed"))
                }
            } catch (e: Exception) {
                onError(e)
            } finally {
                _creatingChat.value = false
                _isLoading.value = false
            }
        }
    }

    /**
     * Učitaj prijatelje iz servisa i upiši u lokalno stanje.
     */
    private fun loadFriends() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                friendService.fetchFriendsAndUpdateCoreData()
                val user = userService.getLoggedInUser()
                currentUsername = user?.username ?: "You"
                _friends.value = friendService.getFriends().map {
                    Participant(
                        participantId = UUID.randomUUID().toString(),
                        userId = it.friendId,
                        username = it.username,
                        joinedAt = System.currentTimeMillis().toString(),
                        role = Role.MEMBER.name
                    )
                }
            } catch (e: Exception) {
                println("Error loading friends: ${e.localizedMessage}")
            } finally {
                _isLoading.value = false
            }
        }
    }
}

@file:Suppress("AutoboxingStateValueProperty")

package xyz.terracrypt.chat.screens.chat

import android.annotation.SuppressLint
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import xyz.terracrypt.chat.managers.SessionManager
import xyz.terracrypt.chat.models.MessageEntity
import xyz.terracrypt.chat.viewmodels.ChatListViewModel
import xyz.terracrypt.chat.viewmodels.ChatScreenViewModel

@SuppressLint("AutoboxingStateValueProperty")
@Composable
fun ChatScreen(
    navController: NavHostController,
    chatId: String,
    chatName: String,
    isGroupChat: Boolean,
    receiverId: String,
    sessionManager: SessionManager,
    viewModel: ChatScreenViewModel = hiltViewModel(),
    chatListViewModel: ChatListViewModel = hiltViewModel(),
) {
    val messages           by viewModel.messages.collectAsState()
    val currentUserId      = viewModel.currentUserId.orEmpty()
    val participantNames   by viewModel.participantNames.collectAsState()

    val newMessageState    = remember { mutableStateOf("") }
    var replyTo            by remember { mutableStateOf<MessageEntity?>(null) }

    val listState          = rememberLazyListState()
    val coroutineScope     = rememberCoroutineScope()

    val isNearBottom       by remember { derivedStateOf { listState.firstVisibleItemIndex <= 2 } }
    val showScrollToBottom = remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.setChatListViewModel(chatListViewModel) }

    LaunchedEffect(chatId) {
        viewModel.loadMessages(chatId)
        viewModel.observeMessages(chatId)
        viewModel.markMessagesAsRead(chatId)
        viewModel.loadParticipants(chatId)
        chatListViewModel.updateUnreadCount(chatId, 0)
    }

    DisposableEffect(chatId) {
        onDispose {
            viewModel.markMessagesAsRead(chatId)
            chatListViewModel.updateUnreadCount(chatId, 0)
        }
    }

    LaunchedEffect(messages.size) { showScrollToBottom.value = !isNearBottom }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color    = MaterialTheme.colorScheme.background
    ) {
        Box(Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding()
                    .imePadding()
            ) {
                ChatScreenTopBar(
                    chatName           = chatName,
                    participantNames   = participantNames.joinToString(", "),
                    isGroupChat        = isGroupChat,
                    onBack             = { navController.popBackStack() },
                    onSearchClick      = { /* Search logic optional */ },
                    isSearching        = remember { mutableStateOf(false) },
                    searchText         = remember { mutableStateOf("") },
                    onSearchTextChange = {}
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    ChatScreenMessages(
                        messages          = messages,
                        isGroupChat       = isGroupChat,
                        currentUserId     = currentUserId,
                        sessionManager    = sessionManager,
                        listState         = listState,
                        onReply           = { replyTo = it },
                        onLoadMore        = {
                            messages.minOfOrNull { it.timestamp }?.let {
                                viewModel.loadOlderMessages(chatId, it)
                            }
                        },
                        onScrollToMessage = { id ->
                            val idx = messages.indexOfFirst { it.messageId == id }
                            if (idx >= 0) coroutineScope.launch {
                                delay(150)
                                listState.animateScrollToItem(idx)
                            }
                        },
                        onResend          = { viewModel.resendMessage(it, receiverId) }
                    )
                }

                ChatScreenInput(
                    newMessage     = newMessageState,
                    replyTo        = replyTo,
                    onSend         = {
                        val txt = newMessageState.value.trim()
                        if (txt.isNotBlank()) {
                            val prefix = replyTo?.let {
                                "⟪${it.senderUsername ?: "Unknown"}⟫: ${it.content}\n"
                            } ?: ""
                            viewModel.sendMessage(chatId, prefix + txt, receiverId)
                            newMessageState.value = ""
                            replyTo = null
                            coroutineScope.launch { delay(100); listState.scrollToItem(0) }
                        }
                    },
                    onCamera      = { /* TODO: camera */ },
                    onMic         = { /* TODO: mic */ },
                    onCancelReply = { replyTo = null },
                    isDarkMode    = sessionManager.isDarkModeEnabled.collectAsState().value
                )
            }

            if (showScrollToBottom.value) {
                FloatingActionButton(
                    onClick = {
                        coroutineScope.launch {
                            listState.animateScrollToItem(0)
                            showScrollToBottom.value = false
                        }
                    },
                    containerColor = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(end = 16.dp, bottom = 90.dp)
                ) {
                    Text("↓", color = MaterialTheme.colorScheme.onPrimary)
                }
            }
        }
    }
}

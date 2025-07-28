package xyz.terracrypt.chat.managers

import xyz.terracrypt.chat.data.ChatDao
import xyz.terracrypt.chat.data.FriendDao
import xyz.terracrypt.chat.data.KeyDao
import xyz.terracrypt.chat.data.MessageDao
import xyz.terracrypt.chat.data.ParticipantDao
import xyz.terracrypt.chat.data.UserDao

class DeleteManager(
    private val userDao: UserDao,
    private val chatDao: ChatDao,
    private val friendDao: FriendDao,
    private val messageDao: MessageDao,
    private val participantDao: ParticipantDao,
    private val keyDao: KeyDao
) {

    //MARK: Briše sve podatke iz svih lokalnih tabela
    suspend fun deleteAllLocalData() {
        userDao.clearUsers()
        chatDao.clearChats()
        friendDao.clearFriends()
        messageDao.clearMessages()
        participantDao.clearParticipants()
        keyDao.clearKeys()
    }
}

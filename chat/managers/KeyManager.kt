package xyz.terracrypt.chat.managers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.data.KeyDao
import xyz.terracrypt.chat.models.KeyEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KeyManager @Inject constructor(
    private val keyDao: KeyDao
) {

    private var cachedKeys: MutableMap<String, KeyEntity> = mutableMapOf()

    /** Save keys for a user (ONLY PUBLIC KEYS in production) */
    suspend fun savePublicKeysForUser(
        userId: String,
        key1: String, key2: String, key3: String, key4: String
    ) = withContext(Dispatchers.IO) {
        val entity = KeyEntity(
            userId = userId,
            key1 = key1,
            key2 = key2,
            key3 = key3,
            key4 = key4,
            privateKey1 = "",
            privateKey2 = "",
            privateKey3 = "",
            privateKey4 = ""
        )
        keyDao.insert(entity)
        cachedKeys[userId] = entity
    }

    /** Save KeyEntity directly (optional, handy for bulk loads) */
    suspend fun saveKeyEntity(entity: KeyEntity) = withContext(Dispatchers.IO) {
        keyDao.insert(entity)
        cachedKeys[entity.userId] = entity
    }

    /** Fetch keys for a user (checks cache first) */
    suspend fun getKeysForUser(userId: String): KeyEntity? = withContext(Dispatchers.IO) {
        cachedKeys[userId] ?: keyDao.getKeysByUserId(userId)?.also { cachedKeys[userId] = it }
    }

    /** Fetch all keys (loads from DB, updates cache) */
    suspend fun getAllKeys(): List<KeyEntity> = withContext(Dispatchers.IO) {
        val all = keyDao.getAllKeys()
        cachedKeys.clear()
        all.forEach { cachedKeys[it.userId] = it }
        all
    }

    /** Delete keys for a user */
    suspend fun deleteKeysByUserId(userId: String) = withContext(Dispatchers.IO) {
        keyDao.deleteKeysByUserId(userId)
        cachedKeys.remove(userId)
    }

    /** Clear all keys from DB and cache */
    suspend fun clearAllKeys() = withContext(Dispatchers.IO) {
        keyDao.clearKeys()
        cachedKeys.clear()
    }

    /** Refresh the local cache (from DB) */
    suspend fun refreshCache() = withContext(Dispatchers.IO) {
        val all = keyDao.getAllKeys()
        cachedKeys.clear()
        all.forEach { cachedKeys[it.userId] = it }
    }
}

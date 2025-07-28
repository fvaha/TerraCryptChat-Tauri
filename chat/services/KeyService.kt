package xyz.terracrypt.chat.services

import android.content.Context
import android.util.Log
import dagger.Lazy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import xyz.terracrypt.chat.managers.KeyManager
import xyz.terracrypt.chat.models.KeyEntity
import xyz.terracrypt.chat.models.PublicKeysPayload
import xyz.terracrypt.chat.network.ApiService
import xyz.terracrypt.chat.utils.KeyUtils
import xyz.terracrypt.chat.utils.PrivateKeyStore
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KeyService @Inject constructor(
    private val keyManager: KeyManager,
    private val apiService: Lazy<ApiService>
) {

    companion object {
        private const val TAG = "KeyService"
    }

    // --- Generate 4 key pairs, save public to DB and private to PrivateKeyStore ---
    suspend fun generateAndSaveKeysForUser(context: Context, userId: String) = withContext(Dispatchers.IO) {
        val publicKeys = List(4) { KeyUtils.generateRandomHexKey() }
        val privateKeys = List(4) { KeyUtils.generateRandomHexKey() }

        // Save public keys to DB
        keyManager.savePublicKeysForUser(
            userId,
            publicKeys[0], publicKeys[1], publicKeys[2], publicKeys[3]
        )

        // Save private keys to EncryptedSharedPrefs
        PrivateKeyStore.savePrivateKeys(
            context,
            privateKeys[0], privateKeys[1], privateKeys[2], privateKeys[3]
        )

        Log.d(TAG, "Keys generated and saved for $userId\nPUBLIC: $publicKeys\nPRIVATE: $privateKeys")
    }

    // Get all public keys for user
    suspend fun getKeysForUser(userId: String): KeyEntity? = keyManager.getKeysForUser(userId)
    suspend fun getAllKeys(): List<KeyEntity> = keyManager.getAllKeys()

    // Download and save another user's public keys only
    suspend fun downloadAndSaveKeysForUser(userId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val result = apiService.get().getOtherUserPublicKeys(userId)
            if (result.isSuccess) {
                val payload = result.getOrNull()
                if (payload != null) {
                    // Only save public keys. Private keys are not available for other users.
                    keyManager.savePublicKeysForUser(
                        userId,
                        payload.key1, payload.key2, payload.key3, payload.key4
                    )
                    return@withContext true
                }
            } else {
                Log.e(TAG, "Failed to download keys: ${result.exceptionOrNull()?.localizedMessage}")
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading keys for user $userId: ${e.localizedMessage}", e)
            false
        }
    }

    // Upload your *public* keys to server
    suspend fun uploadKeysForCurrentUser(payload: PublicKeysPayload): Boolean = withContext(Dispatchers.IO) {
        try {
            val result = apiService.get().updateUserKeys(payload)
            result.isSuccess
        } catch (e: Exception) {
            Log.e(TAG, "Error uploading keys: ${e.localizedMessage}", e)
            false
        }
    }

    // Check if current user's local and remote keys are synced (public keys only)
    suspend fun areLocalAndRemoteKeysSynced(userId: String): Boolean = withContext(Dispatchers.IO) {
        val local = keyManager.getKeysForUser(userId)
        val remoteResult = apiService.get().getOtherUserPublicKeys(userId)
        if (!remoteResult.isSuccess || local == null) return@withContext false
        val remote = remoteResult.getOrNull()
        return@withContext (remote?.key1 == local.key1 &&
                remote.key2 == local.key2 &&
                remote.key3 == local.key3 &&
                remote.key4 == local.key4)
    }

    suspend fun deleteKeysByUserId(userId: String) { keyManager.deleteKeysByUserId(userId) }
    suspend fun clearAllKeys() { keyManager.clearAllKeys() }
    suspend fun refreshCache() { keyManager.refreshCache() }
}

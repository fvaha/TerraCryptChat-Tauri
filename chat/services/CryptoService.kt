package xyz.terracrypt.chat.services

import android.util.Log
import xyz.terracrypt.chat.managers.MessageEncryptionManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CryptoService @Inject constructor() {

    companion object {
        private const val TAG = "CryptoService"
    }

    fun encrypt(content: String): String {
        return if (content.isEmpty()) {
            Log.e(TAG, "Cannot encrypt empty content.")
            ""
        } else {
            try {
                MessageEncryptionManager.encryptMessage(content)
            } catch (e: Exception) {
                Log.e(TAG, "Encryption failed: ${e.localizedMessage}", e)
                ""
            }
        }
    }

    fun decrypt(encryptedString: String): String {
        return if (encryptedString.isEmpty()) {
            Log.e(TAG, "Cannot decrypt empty string.")
            ""
        } else {
            try {
                MessageEncryptionManager.decryptMessage(encryptedString)
            } catch (e: Exception) {
                Log.e(TAG, "Decryption failed: ${e.localizedMessage}", e)
                ""
            }
        }
    }
}

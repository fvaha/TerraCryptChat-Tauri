package xyz.terracrypt.chat.managers

import xyz.terracrypt.chat.native.CryptoOperationsNative
import xyz.terracrypt.chat.native.KeyManagerNative
import java.util.Base64

object MessageEncryptionManager {
    private const val INTERNAL_KEY = "hardcoded_key" // Must match the Swift version's key

    @Volatile
    var useRustSdkEncryption: Boolean = false // Toggle this for encryption type

    private var sdkInstancePtr: Long? = null

    // XOR encryption fallback
    private fun xorEncrypt(data: ByteArray): ByteArray {
        val keyBytes = INTERNAL_KEY.toByteArray(Charsets.UTF_8)
        return data.mapIndexed { index, byte ->
            byte.toInt().xor(keyBytes[index % keyBytes.size].toInt()).toByte()
        }.toByteArray()
    }

    private fun xorDecrypt(data: ByteArray): ByteArray {
        val keyBytes = INTERNAL_KEY.toByteArray(Charsets.UTF_8)
        return data.mapIndexed { index, byte ->
            byte.toInt().xor(keyBytes[index % keyBytes.size].toInt()).toByte()
        }.toByteArray()
    }

    // Public encrypt method
    fun encryptMessage(message: String, targetUserId: String? = null): String {
        if (message.isEmpty()) {
            println("[Encryption] Cannot encrypt an empty message.")
            return ""
        }

        return if (useRustSdkEncryption && sdkInstancePtr != null && targetUserId != null) {
            encryptMessageWithSdk(targetUserId, message)
        } else {
            val encryptedBytes = xorEncrypt(message.toByteArray(Charsets.UTF_8))
            Base64.getEncoder().encodeToString(encryptedBytes)
        }
    }

    // Public decrypt method
    fun decryptMessage(encryptedString: String, sourceUserId: String? = null): String {
        if (encryptedString.isEmpty()) {
            println("[Decryption] Cannot decrypt an empty message.")
            return ""
        }

        val encryptedBytes = Base64.getDecoder().decode(encryptedString)

        return if (useRustSdkEncryption && sdkInstancePtr != null && sourceUserId != null) {
            decryptMessageWithSdk(sourceUserId, encryptedBytes)
        } else {
            val decryptedBytes = xorDecrypt(encryptedBytes)
            String(decryptedBytes, Charsets.UTF_8)
        }
    }

    // ==================================================================================
    // SDK (Rust native) functions (active but protected by switch)
    // ==================================================================================

    // Initialize the SDK KeyManager instance
    fun initializeSdk() {
        if (sdkInstancePtr == null) {
            sdkInstancePtr = KeyManagerNative.sdk_create_key_manager()
            println("[SDK] Initialized KeyManager instance: $sdkInstancePtr")
        }
    }

    // Import a user's public keys (needed for encryption)
    fun importUserPublicKeys(userId: String, publicKeys: List<String>) {
        sdkInstancePtr?.let { sdk ->
            KeyManagerNative.sdk_import_user_keys(
                sdk,
                userId,
                publicKeys.toTypedArray()
            )
            println("[SDK] Imported public keys for user: $userId")
        } ?: run {
            println("[SDK] SDK instance not initialized. Cannot import keys.")
        }
    }

    // Encrypt a message using SDK
    private fun encryptMessageWithSdk(targetUserId: String, message: String): String {
        val encryptedBytes = sdkInstancePtr?.let { sdk ->
            CryptoOperationsNative.sdk_encrypt_message(
                sdk,
                targetUserId,
                message.toByteArray(Charsets.UTF_8)
            )
        } ?: return ""

        return Base64.getEncoder().encodeToString(encryptedBytes)
    }

    // Decrypt a message using SDK
    private fun decryptMessageWithSdk(sourceUserId: String, encryptedBytes: ByteArray): String {
        val decryptedBytes = sdkInstancePtr?.let { sdk ->
            CryptoOperationsNative.sdk_decrypt_message(
                sdk,
                sourceUserId,
                encryptedBytes
            )
        } ?: return ""

        return String(decryptedBytes, Charsets.UTF_8)
    }
}

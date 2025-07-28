package xyz.terracrypt.chat.native

object CryptoOperationsNative {

    init {
        System.loadLibrary("terracryptbridge") // Rust library still loaded once
    }

    // Encrypt a message using shared keys
    external fun sdk_encrypt_message(
        sdkInstancePtr: Long,
        targetUserId: String,
        data: ByteArray
    ): ByteArray

    // Decrypt a message using shared keys
    external fun sdk_decrypt_message(
        sdkInstancePtr: Long,
        sourceUserId: String,
        encryptedData: ByteArray
    ): ByteArray
}

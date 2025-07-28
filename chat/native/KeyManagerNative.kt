package xyz.terracrypt.chat.native

object KeyManagerNative {

    init {
        System.loadLibrary("terracryptbridge") // Rust library still loaded once
    }

    // Create a new KeyManager instance
    external fun sdk_create_key_manager(): Long

    // Import a user's public keys to generate shared keys
    external fun sdk_import_user_keys(
        sdkInstancePtr: Long,
        userId: String,
        publicKeys: Array<String>
    )
}

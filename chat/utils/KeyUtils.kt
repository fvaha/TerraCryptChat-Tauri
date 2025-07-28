package xyz.terracrypt.chat.utils

import java.security.SecureRandom

object KeyUtils {
    private val random = SecureRandom()

    fun generateRandomHexKey(): String {
        val bytes = ByteArray(32) // 256 bits
        random.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}

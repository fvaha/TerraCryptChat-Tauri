package xyz.terracrypt.chat.utils

import android.content.Context
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

object PrivateKeyStore {

    private const val PREF_FILE = "private_keys_prefs"

    // Keys used to store the private keys
    private const val KEY1 = "private_key_1"
    private const val KEY2 = "private_key_2"
    private const val KEY3 = "private_key_3"
    private const val KEY4 = "private_key_4"

    // Call this to save all 4 private keys securely
    fun savePrivateKeys(context: Context, key1: String, key2: String, key3: String, key4: String) {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        val prefs = EncryptedSharedPreferences.create(
            PREF_FILE,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        prefs.edit {
            putString(KEY1, key1)
            putString(KEY2, key2)
            putString(KEY3, key3)
            putString(KEY4, key4)
        }
    }

    // Retrieve all private keys as a list, or nulls if not found
    fun getPrivateKeys(context: Context): List<String?> {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        val prefs = EncryptedSharedPreferences.create(
            PREF_FILE,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        val k1 = prefs.getString(KEY1, null)
        val k2 = prefs.getString(KEY2, null)
        val k3 = prefs.getString(KEY3, null)
        val k4 = prefs.getString(KEY4, null)
        return listOf(k1, k2, k3, k4)
    }

    // Remove all private keys (optional utility)
    fun clearPrivateKeys(context: Context) {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        val prefs = EncryptedSharedPreferences.create(
            PREF_FILE,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
        prefs.edit { clear() }
    }
}

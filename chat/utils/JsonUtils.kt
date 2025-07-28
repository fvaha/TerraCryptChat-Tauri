package xyz.terracrypt.chat.utils

import android.util.Base64
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import org.json.JSONException
import org.json.JSONObject

object JsonUtils {
    // Make gson public explicitly for inline functions
    val gson: Gson = Gson()

    // Make TAG public explicitly for inline functions
    const val TAG: String = "JsonUtils"

    /**
     * Deserialize a JSON string into an object of type T
     */
    inline fun <reified T> decodeFromStringOrNull(json: String): T? {
        return try {
            gson.fromJson(json, T::class.java)
        } catch (e: JsonSyntaxException) {
            Log.e(TAG, "Failed to decode JSON: ${e.localizedMessage}")
            null
        }
    }

    /**
     * Serialize an object to its JSON string representation
     */
    @Suppress("unused")
    fun <T> encodeToString(obj: T): String {
        return gson.toJson(obj)
    }

    /**
     * Extract the "type" field from a JSON string
     */
    fun getType(rawMessage: String): String {
        return try {
            val jsonObject = JSONObject(rawMessage)
            jsonObject.optString("type")?.takeIf { it.isNotEmpty() }
                ?: if (rawMessage.trim().startsWith("{\"message_id\"")) {
                    "chat_message" // Default to "chat_message" for messages starting with "message_id"
                } else {
                    "unknown" // Fallback for unidentified messages
                }
        } catch (e: JSONException) {
            Log.e("JsonUtils", "Failed to parse message type: ${e.localizedMessage}")
            "unknown"
        }
    }



    fun decodeJwtPayload(token: String): JSONObject? {
        return try {
            val parts = token.split(".")
            if (parts.size < 2) {
                throw IllegalArgumentException("Invalid JWT token format")
            }
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE))
            JSONObject(payload)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

}

package xyz.terracrypt.chat.utils

import android.util.Patterns
import java.text.SimpleDateFormat
import java.util.*

fun Date.formatAsTime(): String {
    val formatter = SimpleDateFormat("hh:mm a", Locale.getDefault())
    return formatter.format(this)
}
object ValidationUtils {
    fun isValidEmail(email: String): Boolean {
        return Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
}
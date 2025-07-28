package xyz.terracrypt.chat.utils

import android.annotation.SuppressLint
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object ISO8601DateFormatter {
    @SuppressLint("ConstantLocale")
    private val fallbackFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    @SuppressLint("ConstantLocale")
    private val javaTimeFormatter: DateTimeFormatter = DateTimeFormatter
        .ofPattern("yyyy-MM-dd'T'HH:mm:ss[.SSSSSS][.SSS]'Z'")
        .withLocale(Locale.getDefault())
        .withZone(ZoneOffset.UTC)

    // Get current timestamp in ISO8601 format
    fun currentTimestamp(): String {
        return try {
            javaTimeFormatter.format(Instant.now())
        } catch (e: Exception) {
            fallbackFormatter.format(Date())
        }
    }

    // Parse ISO8601 or timestamp-in-millis string into a Date object
    fun parseTimestamp(timestamp: String): Date? {
        return try {
            // Ako je broj (timestamp u milisekundama kao string), direktno ga parsiramo
            if (timestamp.matches(Regex("^\\d{13}\$"))) {
                Date(timestamp.toLong())
            } else {
                Date(Instant.parse(timestamp).toEpochMilli())
            }
        } catch (e: Exception) {
            try {
                val instant = ZonedDateTime.parse(timestamp, javaTimeFormatter).toInstant()
                Date(instant.toEpochMilli())
            } catch (e2: Exception) {
                try {
                    fallbackFormatter.parse(timestamp)
                } catch (e3: Exception) {
                    e3.printStackTrace()
                    null
                }
            }
        }
    }

    // Convert ISO8601 or millis-string to milliseconds
    fun toMillis(timestamp: String): Long {
        return parseTimestamp(timestamp)?.time ?: 0L
    }

    // Convert milliseconds to ISO8601 timestamp
    fun fromMillis(millis: Long): String {
        return try {
            javaTimeFormatter.format(Instant.ofEpochMilli(millis))
        } catch (e: Exception) {
            fallbackFormatter.format(Date(millis))
        }
    }

    fun parseIsoToMillis(iso: String): Long {
        return toMillis(iso)
    }
}

// Extension function to format a Long timestamp as a time string (e.g., "14:30")
fun Long.formatAsTime(): String {
    val date = Date(this)
    val format = SimpleDateFormat("HH:mm", Locale.getDefault())
    return format.format(date)
}

fun Long.formatAsFriendlyDate(): String {
    val calendar = Calendar.getInstance()
    val now = Calendar.getInstance()
    calendar.timeInMillis = this

    val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
    val dateFormat = SimpleDateFormat("MMM d", Locale.getDefault())

    return when {
        now.get(Calendar.YEAR) == calendar.get(Calendar.YEAR) &&
                now.get(Calendar.DAY_OF_YEAR) == calendar.get(Calendar.DAY_OF_YEAR) -> {
            "Today at ${timeFormat.format(Date(this))}"
        }
        now.get(Calendar.YEAR) == calendar.get(Calendar.YEAR) &&
                now.get(Calendar.DAY_OF_YEAR) - calendar.get(Calendar.DAY_OF_YEAR) == 1 -> {
            "Yesterday at ${timeFormat.format(Date(this))}"
        }
        else -> "${dateFormat.format(Date(this))} at ${timeFormat.format(Date(this))}"
    }
}

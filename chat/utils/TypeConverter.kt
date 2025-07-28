package xyz.terracrypt.chat.utils

import androidx.room.TypeConverter
import java.util.Date

object TypeConverter {

    @TypeConverter
    @JvmStatic
    fun fromTimestamp(value: Long?): Date? {
        return value?.let { Date(it) }
    }

    @TypeConverter
    @JvmStatic
    fun dateToTimestamp(date: Date?): Long? {
        return date?.time
    }

    // Add any other converters you're using for types like List<String>, etc.
}

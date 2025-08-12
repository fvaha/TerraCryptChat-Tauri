// Timestamp utility functions similar to Kotlin ISO8601DateFormatter

/**
 * Get current timestamp in ISO8601 format
 */
export function currentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse ISO8601 timestamp into milliseconds
 */
export function parseTimestamp(timestamp: string): number {
  try {
    return new Date(timestamp).getTime();
  } catch (error) {
    console.error("Failed to parse timestamp:", timestamp, error);
    return Date.now();
  }
}

/**
 * Convert ISO8601 timestamp to milliseconds
 */
export function toMillis(timestamp: string): number {
  return parseTimestamp(timestamp);
}

/**
 * Convert milliseconds to ISO8601 timestamp
 */
export function fromMillis(millis: number): string {
  return new Date(millis).toISOString();
}

/**
 * Parse ISO string to milliseconds
 */
export function parseIsoToMillis(iso: string): number {
  return toMillis(iso);
}

/**
 * Format timestamp as time string (e.g., "14:30")
 */
export function formatAsTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format timestamp as friendly date string
 */
export function formatAsFriendlyDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeFormat = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (messageDate.getTime() === today.getTime()) {
    return `Today at ${timeFormat.format(date)}`;
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeFormat.format(date)}`;
  } else {
    return `${dateFormat.format(date)} at ${timeFormat.format(date)}`;
  }
}

/**
 * Format timestamp for date separator (e.g., "Jan 15, 2024")
 */
export function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Check if two timestamps are on the same day
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return date1.toDateString() === date2.toDateString();
}

/**
 * Check if timestamp is today
 */
export function isToday(timestamp: number): boolean {
  return isSameDay(timestamp, Date.now());
}

/**
 * Check if timestamp is yesterday
 */
export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(timestamp, yesterday.getTime());
}

/**
 * Get relative date label (Today, Yesterday, or formatted date)
 */
export function getRelativeDateLabel(timestamp: number): string {
  if (isToday(timestamp)) {
    return "Today";
  } else if (isYesterday(timestamp)) {
    return "Yesterday";
  } else {
    return formatDateSeparator(timestamp);
  }
}

/**
 * Ensure timestamp is in milliseconds (convert from seconds or nanoseconds if needed)
 */
export function ensureMilliseconds(timestamp: number): number {
  // If timestamp is in nanoseconds (greater than 1000000000000000000), convert to milliseconds
  if (timestamp > 1000000000000000000) {
    return Math.floor(timestamp / 1_000_000);
  }
  // If timestamp is in seconds (less than 10000000000), convert to milliseconds
  if (timestamp < 10000000000) {
    return timestamp * 1000;
  }
  return timestamp;
}

/**
 * Parse and normalize timestamp from various formats
 */
export function normalizeTimestamp(timestamp: string | number): number {
  if (typeof timestamp === 'string') {
    return parseIsoToMillis(timestamp);
  } else {
    return ensureMilliseconds(timestamp);
  }
} 

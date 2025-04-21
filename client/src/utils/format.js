/**
 * Format functions for dates, times, and other data
 */

import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

/**
 * Format a timestamp into a readable format
 * - For today: shows time (e.g., "2:30 PM")
 * - For yesterday: shows "Yesterday"
 * - For older: shows date (e.g., "Mar 15")
 *
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} The formatted time
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  // Return invalid date message if date is invalid
  if (isNaN(date.getTime())) return "";

  // Format based on how recent
  if (isToday(date)) {
    return format(date, "h:mm a"); // "2:30 PM"
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else if (date.getFullYear() === new Date().getFullYear()) {
    return format(date, "MMM d"); // "Mar 15"
  } else {
    return format(date, "MMM d, yyyy"); // "Mar 15, 2022"
  }
};

/**
 * Format a timestamp into a relative time (e.g., "2 hours ago")
 *
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} The relative time
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  // Return invalid date message if date is invalid
  if (isNaN(date.getTime())) return "";

  return formatDistanceToNow(date, { addSuffix: true });
};

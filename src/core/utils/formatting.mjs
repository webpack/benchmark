/**
 * Formats milliseconds into a human-readable string
 * @param {number} milliseconds
 */
export function formatDuration(milliseconds) {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

const sizes = ["B", "KB", "MB", "GB"];
/**
 * Formats bytes into a human-readable string
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

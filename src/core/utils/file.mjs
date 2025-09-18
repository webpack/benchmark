import fs from "node:fs/promises";
import path from "node:path";

// Get the total size of a directory (recursively)
export async function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Just return the current (probable) size
  }

  return totalSize;
}

// Check if a file exists
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Remove all contents
export async function removeIfExists(filePath) {
  if (await exists(filePath)) {
    await fs.rm(filePath, { recursive: true, force: true });
  }
}

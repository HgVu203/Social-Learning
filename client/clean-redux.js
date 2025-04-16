// Script to clean up Redux files after migrating to React Query + Context API
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reduxDir = path.join(__dirname, "src", "redux");

// Files to keep (maybe needed for reference or has partial migrations)
const filesToKeep = [];

// Delete all Redux files except those in filesToKeep
async function cleanupReduxFiles() {
  try {
    console.log("Starting Redux cleanup...");

    // Check if redux directory exists
    if (!fs.existsSync(reduxDir)) {
      console.error("Redux directory not found at:", reduxDir);
      return;
    }

    // Read all files in the redux directory
    const files = fs.readdirSync(reduxDir);

    // Count for summary
    let deletedCount = 0;
    let keptCount = 0;

    // Process each file
    for (const file of files) {
      const filePath = path.join(reduxDir, file);

      // Skip directories and files that should be kept
      if (fs.statSync(filePath).isDirectory() || filesToKeep.includes(file)) {
        console.log(`Keeping: ${file}`);
        keptCount++;
        continue;
      }

      // Delete the file
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting ${file}:`, err);
      }
    }

    // Summary
    console.log("\nCleanup complete!");
    console.log(`Deleted ${deletedCount} files.`);
    console.log(`Kept ${keptCount} files.`);

    // Check if redux directory is now empty and can be removed
    const remainingFiles = fs.readdirSync(reduxDir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(reduxDir);
      console.log("Removed empty redux directory.");
    }
  } catch (error) {
    console.error("An error occurred during cleanup:", error);
  }
}

// Run the cleanup
cleanupReduxFiles();

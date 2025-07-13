import { authenticatedFetch } from "../src/lib/api-client";

async function cleanInvalidAnalyses() {
  try {
    console.log("Starting cleanup of invalid stock analyses...");

    const response = await authenticatedFetch("/api/analyze/cleanup", {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to clean up invalid records");
    }

    const result = await response.json();
    console.log(result.message);
    if (result.deletedRecords) {
      console.log("Deleted records:", result.deletedRecords);
    }
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Run the cleanup
cleanInvalidAnalyses();

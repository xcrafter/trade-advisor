#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  console.error("");
  console.error("Please set these in your .env.local file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

class StockActivityManager {
  // Helper method to get user by email
  static async getUserByEmail(email) {
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;

      const user = users.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!user) {
        throw new Error(`No user found with email: ${email}`);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete stocks for a specific user
  static async deleteUserStocks() {
    try {
      console.log("\n=== Delete User's Stocks ===");
      const email = await question("Enter user email: ");

      if (!email) {
        console.error("Email is required");
        return;
      }

      if (!isValidEmail(email)) {
        console.error("Invalid email format");
        return;
      }

      // Get user data by email
      let user;
      try {
        user = await this.getUserByEmail(email);
      } catch (error) {
        console.error("Error:", error.message);
        return;
      }

      console.log("\nUser details:");
      console.log("Email:", user.email);
      console.log("Role:", user.user_metadata?.role || "user");

      // Get user's stocks count
      const { data: stocksData, error: stocksError } = await supabase
        .from("stocks")
        .select("id")
        .eq("user_id", user.id);

      if (stocksError) {
        console.error("Error fetching stocks:", stocksError.message);
        return;
      }

      const stockCount = stocksData.length;

      // Get user's analyses count
      const { data: analysesData, error: analysesError } = await supabase
        .from("stock_analysis")
        .select("id")
        .eq("user_id", user.id);

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError.message);
        return;
      }

      const analysisCount = analysesData.length;

      console.log(
        `\nFound ${stockCount} stocks and ${analysisCount} analyses for ${email}`
      );

      const confirmation = await question(
        `\nAre you sure you want to delete all stocks and analyses for ${email}? (yes/no): `
      );

      if (confirmation.toLowerCase() !== "yes") {
        console.log("Operation cancelled");
        return;
      }

      // Delete stock analyses first (due to foreign key constraints)
      const { error: deleteAnalysesError } = await supabase
        .from("stock_analysis")
        .delete()
        .eq("user_id", user.id);

      if (deleteAnalysesError) {
        console.error("Error deleting analyses:", deleteAnalysesError.message);
        return;
      }

      // Then delete stocks
      const { error: deleteStocksError } = await supabase
        .from("stocks")
        .delete()
        .eq("user_id", user.id);

      if (deleteStocksError) {
        console.error("Error deleting stocks:", deleteStocksError.message);
        return;
      }

      console.log(
        `✅ Successfully deleted all stocks and analyses for ${email}!`
      );
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Delete all stocks for all users
  static async deleteAllStocks() {
    try {
      console.log("\n=== Delete All Stocks ===");

      // Get total counts
      const { data: stocksData, error: stocksError } = await supabase
        .from("stocks")
        .select("id");

      if (stocksError) {
        console.error("Error fetching stocks:", stocksError.message);
        return;
      }

      const { data: analysesData, error: analysesError } = await supabase
        .from("stock_analysis")
        .select("id");

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError.message);
        return;
      }

      console.log(
        `Found ${stocksData.length} stocks and ${analysesData.length} analyses in total.`
      );

      const confirmation = await question(
        "\n⚠️  WARNING: This will delete ALL stocks and analyses for ALL users!\nAre you absolutely sure? (type 'DELETE ALL' to confirm): "
      );

      if (confirmation !== "DELETE ALL") {
        console.log("Operation cancelled");
        return;
      }

      // Delete all stock analyses first
      const { error: deleteAnalysesError } = await supabase
        .from("stock_analysis")
        .delete()
        .neq("id", 0); // Delete all records

      if (deleteAnalysesError) {
        console.error("Error deleting analyses:", deleteAnalysesError.message);
        return;
      }

      // Then delete all stocks
      const { error: deleteStocksError } = await supabase
        .from("stocks")
        .delete()
        .neq("id", 0); // Delete all records

      if (deleteStocksError) {
        console.error("Error deleting stocks:", deleteStocksError.message);
        return;
      }

      console.log(
        "✅ Successfully deleted all stocks and analyses from the system!"
      );
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // List users with stock counts
  static async listUsersWithStocks() {
    try {
      console.log("\n=== Users with Stocks ===");

      // Get all users
      const { data: users, error: usersError } =
        await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error("Error fetching users:", usersError.message);
        return;
      }

      console.log("\nFetching stock counts for each user...");

      // Sort users by email for better readability
      const sortedUsers = users.users.sort((a, b) =>
        a.email.localeCompare(b.email)
      );

      for (const user of sortedUsers) {
        // Get stock count
        const { data: stocks, error: stocksError } = await supabase
          .from("stocks")
          .select("id")
          .eq("user_id", user.id);

        if (stocksError) {
          console.error(
            `Error fetching stocks for ${user.email}:`,
            stocksError.message
          );
          continue;
        }

        // Get analysis count
        const { data: analyses, error: analysesError } = await supabase
          .from("stock_analysis")
          .select("id")
          .eq("user_id", user.id);

        if (analysesError) {
          console.error(
            `Error fetching analyses for ${user.email}:`,
            analysesError.message
          );
          continue;
        }

        // Only show users who have stocks or analyses
        if (stocks.length > 0 || analyses.length > 0) {
          console.log(`\nEmail: ${user.email}`);
          console.log(`Role: ${user.user_metadata?.role || "user"}`);
          console.log(`Stocks: ${stocks.length}`);
          console.log(`Analyses: ${analyses.length}`);
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}

// Main menu
async function showMenu() {
  console.log("\n=== Stock Activity Management ===");
  console.log("1. Delete stocks for a specific user (by email)");
  console.log("2. Delete ALL stocks (all users)");
  console.log("3. List users with stock counts");
  console.log("0. Exit");

  const choice = await question("\nEnter your choice (0-3): ");

  switch (choice) {
    case "1":
      await StockActivityManager.deleteUserStocks();
      break;
    case "2":
      await StockActivityManager.deleteAllStocks();
      break;
    case "3":
      await StockActivityManager.listUsersWithStocks();
      break;
    case "0":
      console.log("Goodbye!");
      rl.close();
      return;
    default:
      console.log("Invalid choice. Please try again.");
  }

  await showMenu();
}

// Start the application
async function main() {
  console.log("🚀 Stock Activity Management System Starting...");
  console.log("Using Supabase URL:", supabaseUrl);

  try {
    await showMenu();
  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  rl.close();
  process.exit(0);
});

main();

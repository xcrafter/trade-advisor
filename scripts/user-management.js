#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env" });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; // Service key for admin operations
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error(
    "- SUPABASE_SERVICE_KEY (for admin operations) or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  process.exit(1);
}

// Use service key for admin operations, fallback to anon key
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

class UserManager {
  // Add a new user
  static async addUser() {
    try {
      console.log("\n=== Add New User ===");
      const email = await question("Enter email: ");
      const password = await question("Enter password: ");
      const role =
        (await question("Enter role (admin/user) [default: user]: ")) || "user";

      if (!email || !password) {
        console.error("Email and password are required");
        return;
      }

      if (!["admin", "user"].includes(role)) {
        console.error('Role must be either "admin" or "user"');
        return;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role: role,
        },
        email_confirm: true, // Auto-confirm email for admin-created users
      });

      if (error) {
        console.error("Error creating user:", error.message);
        return;
      }

      console.log("✅ User created successfully!");
      console.log("User ID:", data.user.id);
      console.log("Email:", data.user.email);
      console.log("Role:", data.user.user_metadata.role);
      console.log("Created at:", data.user.created_at);
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Update an existing user
  static async updateUser() {
    try {
      console.log("\n=== Update User ===");
      const userId = await question("Enter user ID: ");

      if (!userId) {
        console.error("User ID is required");
        return;
      }

      // Get current user data
      const { data: currentUser, error: fetchError } =
        await supabase.auth.admin.getUserById(userId);

      if (fetchError) {
        console.error("Error fetching user:", fetchError.message);
        return;
      }

      console.log("\nCurrent user data:");
      console.log("Email:", currentUser.user.email);
      console.log("Role:", currentUser.user.user_metadata?.role || "user");
      console.log(
        "Email confirmed:",
        currentUser.user.email_confirmed_at ? "Yes" : "No"
      );

      console.log("\nEnter new values (press Enter to keep current value):");
      const newEmail = await question(
        `New email [${currentUser.user.email}]: `
      );
      const newPassword = await question(
        "New password (leave empty to keep current): "
      );
      const newRole = await question(
        `New role [${currentUser.user.user_metadata?.role || "user"}]: `
      );

      const updates = {};

      if (newEmail && newEmail !== currentUser.user.email) {
        updates.email = newEmail;
      }

      if (newPassword) {
        updates.password = newPassword;
      }

      if (
        newRole &&
        newRole !== (currentUser.user.user_metadata?.role || "user")
      ) {
        if (!["admin", "user"].includes(newRole)) {
          console.error('Role must be either "admin" or "user"');
          return;
        }
        updates.user_metadata = {
          ...currentUser.user.user_metadata,
          role: newRole,
        };
      }

      if (Object.keys(updates).length === 0) {
        console.log("No changes made");
        return;
      }

      const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        updates
      );

      if (error) {
        console.error("Error updating user:", error.message);
        return;
      }

      console.log("✅ User updated successfully!");
      console.log("Updated fields:", Object.keys(updates).join(", "));
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Delete a user
  static async deleteUser() {
    try {
      console.log("\n=== Delete User ===");
      const userId = await question("Enter user ID: ");

      if (!userId) {
        console.error("User ID is required");
        return;
      }

      // Get user data for confirmation
      const { data: userData, error: fetchError } =
        await supabase.auth.admin.getUserById(userId);

      if (fetchError) {
        console.error("Error fetching user:", fetchError.message);
        return;
      }

      console.log("\nUser to delete:");
      console.log("Email:", userData.user.email);
      console.log("Role:", userData.user.user_metadata?.role || "user");
      console.log("Created at:", userData.user.created_at);

      const confirmation = await question(
        "\nAre you sure you want to delete this user? (yes/no): "
      );

      if (confirmation.toLowerCase() !== "yes") {
        console.log("Operation cancelled");
        return;
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        console.error("Error deleting user:", error.message);
        return;
      }

      console.log("✅ User deleted successfully!");
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // List all users
  static async listUsers() {
    try {
      console.log("\n=== List Users ===");

      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error("Error fetching users:", error.message);
        return;
      }

      if (data.users.length === 0) {
        console.log("No users found");
        return;
      }

      console.log(`\nFound ${data.users.length} user(s):\n`);

      data.users.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.user_metadata?.role || "user"}`);
        console.log(
          `   Created: ${new Date(user.created_at).toLocaleDateString()}`
        );
        console.log(
          `   Last sign in: ${
            user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleDateString()
              : "Never"
          }`
        );
        console.log(
          `   Email confirmed: ${user.email_confirmed_at ? "Yes" : "No"}`
        );
        console.log("");
      });
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Get user by ID
  static async getUserById() {
    try {
      console.log("\n=== Get User by ID ===");
      const userId = await question("Enter user ID: ");

      if (!userId) {
        console.error("User ID is required");
        return;
      }

      const { data, error } = await supabase.auth.admin.getUserById(userId);

      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }

      console.log("\nUser details:");
      console.log("ID:", data.user.id);
      console.log("Email:", data.user.email);
      console.log("Role:", data.user.user_metadata?.role || "user");
      console.log("Created at:", data.user.created_at);
      console.log("Last sign in:", data.user.last_sign_in_at || "Never");
      console.log(
        "Email confirmed:",
        data.user.email_confirmed_at ? "Yes" : "No"
      );
      console.log(
        "User metadata:",
        JSON.stringify(data.user.user_metadata, null, 2)
      );
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Reset user password
  static async resetUserPassword() {
    try {
      console.log("\n=== Reset User Password ===");
      const userId = await question("Enter user ID: ");
      const newPassword = await question("Enter new password: ");

      if (!userId || !newPassword) {
        console.error("User ID and new password are required");
        return;
      }

      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        console.error("Error resetting password:", error.message);
        return;
      }

      console.log("✅ Password reset successfully!");
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}

// Main menu
async function showMenu() {
  console.log("\n=== User Management System ===");
  console.log("1. Add new user");
  console.log("2. Update user");
  console.log("3. Delete user");
  console.log("4. List all users");
  console.log("5. Get user by ID");
  console.log("6. Reset user password");
  console.log("0. Exit");

  const choice = await question("\nEnter your choice (0-6): ");

  switch (choice) {
    case "1":
      await UserManager.addUser();
      break;
    case "2":
      await UserManager.updateUser();
      break;
    case "3":
      await UserManager.deleteUser();
      break;
    case "4":
      await UserManager.listUsers();
      break;
    case "5":
      await UserManager.getUserById();
      break;
    case "6":
      await UserManager.resetUserPassword();
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
  console.log("🚀 User Management System Starting...");
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

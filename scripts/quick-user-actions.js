#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

// Command line argument parsing
const args = process.argv.slice(2);
const command = args[0];

async function addUser(email, password, role = "user") {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      email_confirm: true,
    });

    if (error) throw error;

    console.log("✅ User created successfully!");
    console.log(`ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    console.log(`Role: ${data.user.user_metadata.role}`);

    return data.user;
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    process.exit(1);
  }
}

async function deleteUser(userId) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    console.log("✅ User deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    process.exit(1);
  }
}

async function listUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log(`\n📋 Found ${data.users.length} user(s):\n`);

    data.users.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.email} (${user.user_metadata?.role || "user"})`
      );
      console.log(`   ID: ${user.id}`);
      console.log(
        `   Created: ${new Date(user.created_at).toLocaleDateString()}`
      );
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error listing users:", error.message);
    process.exit(1);
  }
}

async function updateUser(userId, updates) {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      updates
    );
    if (error) throw error;

    console.log("✅ User updated successfully!");
    console.log(`Updated: ${Object.keys(updates).join(", ")}`);
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    process.exit(1);
  }
}

async function resetPassword(userId, newPassword) {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw error;

    console.log("✅ Password reset successfully!");
  } catch (error) {
    console.error("❌ Error resetting password:", error.message);
    process.exit(1);
  }
}

// Main command handler
async function main() {
  switch (command) {
    case "add":
      if (args.length < 3) {
        console.error(
          "Usage: node quick-user-actions.js add <email> <password> [role]"
        );
        process.exit(1);
      }
      await addUser(args[1], args[2], args[3]);
      break;

    case "delete":
      if (args.length < 2) {
        console.error("Usage: node quick-user-actions.js delete <user-id>");
        process.exit(1);
      }
      await deleteUser(args[1]);
      break;

    case "list":
      await listUsers();
      break;

    case "update-role":
      if (args.length < 3) {
        console.error(
          "Usage: node quick-user-actions.js update-role <user-id> <role>"
        );
        process.exit(1);
      }
      await updateUser(args[1], {
        user_metadata: { role: args[2] },
      });
      break;

    case "reset-password":
      if (args.length < 3) {
        console.error(
          "Usage: node quick-user-actions.js reset-password <user-id> <new-password>"
        );
        process.exit(1);
      }
      await resetPassword(args[1], args[2]);
      break;

    default:
      console.log("🔧 User Management CLI");
      console.log("");
      console.log("Available commands:");
      console.log("  add <email> <password> [role]     - Add new user");
      console.log("  delete <user-id>                  - Delete user");
      console.log("  list                              - List all users");
      console.log("  update-role <user-id> <role>      - Update user role");
      console.log("  reset-password <user-id> <pass>   - Reset user password");
      console.log("");
      console.log("Examples:");
      console.log(
        "  node quick-user-actions.js add john@example.com password123 admin"
      );
      console.log("  node quick-user-actions.js list");
      console.log("  node quick-user-actions.js delete 12345-67890-abcde");
      process.exit(1);
  }
}

main();

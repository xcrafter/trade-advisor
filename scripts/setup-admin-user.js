#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Initialize Supabase client with service key for admin operations
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

async function createAdminUser() {
  console.log("🔧 Setting up Admin User");
  console.log("======================");

  try {
    const email = await question("Enter admin email: ");
    const password = await question("Enter admin password: ");

    if (!email || !password) {
      console.error("❌ Email and password are required");
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("❌ Invalid email format");
      process.exit(1);
    }

    // Validate password strength
    if (password.length < 6) {
      console.error("❌ Password must be at least 6 characters long");
      process.exit(1);
    }

    console.log("\n🚀 Creating admin user...");

    // Create user using Supabase Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        role: "admin",
      },
      email_confirm: true, // Auto-confirm email for admin user
    });

    if (error) {
      console.error("❌ Error creating admin user:", error.message);
      process.exit(1);
    }

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("📋 User Details:");
    console.log(`   ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Role: ${data.user.user_metadata.role}`);
    console.log(`   Created: ${data.user.created_at}`);
    console.log(
      `   Email Confirmed: ${data.user.email_confirmed_at ? "Yes" : "No"}`
    );
    console.log("");
    console.log("🎉 You can now sign in with these credentials!");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function checkExistingAdmins() {
  try {
    console.log("🔍 Checking for existing admin users...");

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("❌ Error checking users:", error.message);
      return false;
    }

    const adminUsers = data.users.filter(
      (user) => user.user_metadata?.role === "admin"
    );

    if (adminUsers.length > 0) {
      console.log("⚠️  Found existing admin users:");
      adminUsers.forEach((user) => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      console.log("");

      const proceed = await question(
        "Do you want to create another admin user? (y/n): "
      );
      return proceed.toLowerCase() === "y" || proceed.toLowerCase() === "yes";
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking existing admins:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Supabase Admin User Setup");
  console.log("============================");
  console.log("");

  const shouldProceed = await checkExistingAdmins();

  if (!shouldProceed) {
    console.log("👋 Setup cancelled");
    process.exit(0);
  }

  await createAdminUser();
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Setup cancelled");
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});

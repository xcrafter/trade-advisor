/* eslint-disable @typescript-eslint/no-require-imports */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "..", ".env.local"),
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 Testing database connection...");
console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Service Key:", supabaseServiceKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log("\n📡 Testing basic connection...");

    // Test basic connection
    const { error } = await supabase
      .from("sessions")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("❌ Basic connection failed:", error.message);
      console.error("Full error:", error);
      return;
    }

    console.log("✅ Basic connection successful");

    // Test if instruments table exists
    console.log("\n🔍 Checking if instruments table exists...");

    const { data: instrumentsData, error: instrumentsError } = await supabase
      .from("instruments")
      .select("count", { count: "exact", head: true });

    if (instrumentsError) {
      console.error("❌ Instruments table check failed:");
      console.error("Error message:", instrumentsError.message);
      console.error("Error code:", instrumentsError.code);
      console.error("Error details:", instrumentsError.details);
      console.error("Error hint:", instrumentsError.hint);

      if (instrumentsError.code === "42P01") {
        console.error("\n💡 The 'instruments' table does not exist.");
        console.error("Please run the database migration first:");
        console.error("1. Open your Supabase SQL Editor");
        console.error(
          "2. Run the SQL from: database/add-instruments-table.sql"
        );
      }
      return;
    }

    console.log("✅ Instruments table exists");
    console.log(
      `📊 Current instruments count: ${instrumentsData?.length || 0}`
    );

    // Test stock_analysis table
    console.log("\n🔍 Checking if stock_analysis table exists...");
    const { data: analysisData, error: analysisError } = await supabase
      .from("stock_analysis")
      .select("count", { count: "exact", head: true });

    if (analysisError) {
      console.error("❌ Stock analysis table check failed:");
      console.error("Error message:", analysisError.message);
      console.error("Error code:", analysisError.code);
      console.error("Error details:", analysisError.details);
      console.error("Error hint:", analysisError.hint);

      if (analysisError.code === "42P01") {
        console.error("\n💡 The 'stock_analysis' table does not exist.");
        console.error("Please run the database migration first:");
        console.error("1. Open your Supabase SQL Editor");
        console.error("2. Run the SQL from: database/migrate-to-json.sql");
      }
      return;
    }

    console.log("✅ Stock analysis table exists");
    console.log(`📊 Current analysis count: ${analysisData?.length || 0}`);

    // Test a simple query
    console.log("\n🧪 Testing a simple query...");
    const { data: testData, error: testError } = await supabase
      .from("instruments")
      .select("symbol, company_clean")
      .limit(3);

    if (testError) {
      console.error("❌ Test query failed:", testError.message);
      return;
    }

    console.log("✅ Test query successful");
    if (testData && testData.length > 0) {
      console.log("Sample data:");
      testData.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.symbol} - ${item.company_clean}`);
      });
    } else {
      console.log("📭 Table is empty (ready for migration)");
    }

    console.log("\n🎉 Database connection test completed successfully!");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testConnection();

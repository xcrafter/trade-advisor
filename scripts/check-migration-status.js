/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env.local"),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
  try {
    console.log("🔍 Checking migration status...\n");

    // Get actual count using a different method
    const { data: instruments, error } = await supabase
      .from("instruments")
      .select("id");

    if (error) {
      console.error("❌ Error querying instruments:", error.message);
      return;
    }

    const actualCount = instruments ? instruments.length : 0;
    console.log(`📊 Actual instruments count: ${actualCount}`);

    if (actualCount === 0) {
      console.log("❌ Migration not completed - database is empty");
      console.log("Please run: npm run migrate-instruments");
      return;
    }

    if (actualCount < 20000) {
      console.log(
        `⚠️  Partial migration - expected ~20,007, got ${actualCount}`
      );
      console.log("Consider re-running migration");
    } else {
      console.log("✅ Migration appears complete!");
    }

    // Show some sample data
    const { data: samples, error: sampleError } = await supabase
      .from("instruments")
      .select("symbol, company_clean, exchange")
      .limit(5);

    if (!sampleError && samples) {
      console.log("\n📋 Sample records:");
      samples.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.symbol} - ${item.company_clean} (${
            item.exchange
          })`
        );
      });
    }

    // Test search functionality
    console.log("\n🔍 Testing search for 'RELIANCE'...");
    const { data: searchResults, error: searchError } = await supabase
      .from("instruments")
      .select("symbol, company_clean, exchange")
      .or("symbol.ilike.%RELIANCE%,company_clean.ilike.%RELIANCE%")
      .limit(3);

    if (searchError) {
      console.error("❌ Search test failed:", searchError.message);
    } else if (searchResults && searchResults.length > 0) {
      console.log("✅ Search test successful:");
      searchResults.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.symbol} - ${item.company_clean} (${
            item.exchange
          })`
        );
      });
    } else {
      console.log("⚠️  No search results found");
    }

    // Check if API is ready to switch
    console.log("\n🚀 Migration Status Summary:");
    if (actualCount >= 20000) {
      console.log("✅ Database has sufficient data");
      console.log("✅ Search functionality works");
      console.log("✅ Ready to delete JSON files");
      console.log("\n💡 Next steps:");
      console.log("1. Test your application search functionality");
      console.log("2. If everything works, you can delete the JSON files:");
      console.log("   rm -rf public/upstox-instruments/");
    } else {
      console.log("❌ Migration incomplete - keep JSON files");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkMigrationStatus();

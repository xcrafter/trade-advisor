/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateInstrumentsToDatabase() {
  console.log("🚀 Starting instrument data migration to database...");

  try {
    // Read the searchable instruments JSON file
    const jsonPath = path.join(
      __dirname,
      "..",
      "public",
      "upstox-instruments",
      "searchable-instruments.json"
    );

    if (!fs.existsSync(jsonPath)) {
      console.error("❌ Searchable instruments file not found:", jsonPath);
      console.error(
        "Please run the convert-upstox-instruments.js script first"
      );
      process.exit(1);
    }

    console.log("📖 Reading searchable instruments data...");
    const instrumentsData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    console.log(`📊 Found ${instrumentsData.length} instruments to migrate`);

    // Check if instruments table exists and has data
    const { data: existingCount, error: countError } = await supabase
      .from("instruments")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Error checking existing instruments:");
      console.error("Error message:", countError.message);
      console.error("Error details:", countError);
      console.error("\nMake sure you have run the database migration first:");
      console.error(
        "Run: database/add-instruments-table.sql in your Supabase SQL editor"
      );
      process.exit(1);
    }

    if (existingCount && existingCount.length > 0) {
      console.log(
        `⚠️  Found ${existingCount.length} existing instruments in database`
      );
      console.log("Do you want to clear existing data and reload? (y/N)");

      // For now, we'll skip if data exists. You can uncomment below for interactive mode
      // const readline = require('readline').createInterface({
      //   input: process.stdin,
      //   output: process.stdout
      // });
      // const answer = await new Promise(resolve => readline.question('', resolve));
      // readline.close();

      // if (answer.toLowerCase() !== 'y') {
      //   console.log('✅ Migration cancelled. Existing data preserved.');
      //   return;
      // }

      console.log("🗑️  Clearing existing instruments data...");
      const { error: deleteError } = await supabase
        .from("instruments")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (deleteError) {
        console.error("❌ Error clearing existing data:", deleteError.message);
        process.exit(1);
      }
    }

    // Transform data for database insertion
    console.log("🔄 Transforming data for database insertion...");
    const dbInstruments = instrumentsData.map((instrument) => ({
      symbol: instrument.symbol,
      instrument_key: instrument.instrument_key,
      company: instrument.company,
      company_clean: instrument.companyClean,
      exchange: instrument.exchange,
      search_terms: instrument.searchTerms || [],
    }));

    // Insert data in batches to avoid memory issues
    const batchSize = 1000;
    let inserted = 0;
    let errors = 0;

    console.log(
      `📝 Inserting ${dbInstruments.length} instruments in batches of ${batchSize}...`
    );

    for (let i = 0; i < dbInstruments.length; i += batchSize) {
      const batch = dbInstruments.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase
          .from("instruments")
          .insert(batch)
          .select("id");

        if (error) {
          console.error(
            `❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
            error.message
          );
          errors += batch.length;
        } else {
          inserted += data.length;
          console.log(
            `✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
              dbInstruments.length / batchSize
            )} (${inserted} total)`
          );
        }
      } catch (err) {
        console.error(
          `❌ Exception in batch ${Math.floor(i / batchSize) + 1}:`,
          err.message
        );
        errors += batch.length;
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   Successfully inserted: ${inserted}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total processed: ${inserted + errors}`);

    if (inserted > 0) {
      // Verify the migration
      console.log("\n🔍 Verifying migration...");
      const { data: verifyData, error: verifyError } = await supabase
        .from("instruments")
        .select("id", { count: "exact", head: true });

      if (verifyError) {
        console.error("❌ Error verifying migration:", verifyError.message);
      } else {
        console.log(
          `✅ Verification: ${verifyData.length} instruments in database`
        );
      }

      // Test search functionality
      console.log("\n🧪 Testing search functionality...");
      const { data: searchTest, error: searchError } = await supabase
        .from("instruments")
        .select("symbol, company_clean, exchange")
        .or("symbol.ilike.%reliance%,company_clean.ilike.%reliance%")
        .limit(3);

      if (searchError) {
        console.error("❌ Error testing search:", searchError.message);
      } else {
        console.log("✅ Search test results:");
        searchTest.forEach((result, index) => {
          console.log(
            `   ${index + 1}. ${result.symbol} - ${result.company_clean} (${
              result.exchange
            })`
          );
        });
      }
    }

    console.log("\n🎉 Instrument migration completed!");
    console.log("📝 Next steps:");
    console.log(
      "   1. Update your search API to use database instead of JSON files"
    );
    console.log("   2. Test the search functionality in your application");
    console.log(
      "   3. Consider removing the JSON files to save space (optional)"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node migrate-instruments-to-db.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --help, -h    Show this help message");
    console.log("");
    console.log("Environment variables required:");
    console.log("  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL");
    console.log(
      "  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key"
    );
    console.log("");
    console.log("Prerequisites:");
    console.log(
      "  1. Run database/add-instruments-table.sql in Supabase SQL editor"
    );
    console.log(
      "  2. Ensure searchable-instruments.json exists (run convert-upstox-instruments.js)"
    );
    process.exit(0);
  }

  migrateInstrumentsToDatabase().catch(console.error);
}

module.exports = {
  migrateInstrumentsToDatabase,
};

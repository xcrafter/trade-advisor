/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env.local"),
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔄 Running migration to JSON storage...");
console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Service Key:", supabaseServiceKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("\n🔄 Step 1: Dropping existing stock_analysis table...");

    // We'll recreate the table manually since direct SQL execution might not work
    // Let's just test if we can insert with the new structure

    console.log("\n🧪 Testing current table structure...");

    const { data: testData, error: testError } = await supabase
      .from("stock_analysis")
      .select("*")
      .limit(1);

    if (testError) {
      console.log("Current table structure:", testError.message);
    } else {
      console.log("Current records:", testData?.length || 0);
    }

    console.log(
      "\n💡 Please run the following SQL manually in your Supabase SQL Editor:"
    );
    console.log("---");
    console.log(`
DROP TABLE IF EXISTS stock_analysis CASCADE;

CREATE TABLE stock_analysis (
  id SERIAL PRIMARY KEY,
  instrument_key VARCHAR(50) NOT NULL REFERENCES instruments(instrument_key),
  symbol VARCHAR(50) NOT NULL,
  analysis_data JSONB NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_key)
);

CREATE INDEX idx_stock_analysis_instrument_key ON stock_analysis(instrument_key);
CREATE INDEX idx_stock_analysis_symbol ON stock_analysis(symbol);
CREATE INDEX idx_stock_analysis_last_updated_at ON stock_analysis(last_updated_at DESC);
CREATE INDEX idx_stock_analysis_data ON stock_analysis USING GIN (analysis_data);
    `);
    console.log("---");
    console.log(
      "\nAfter running the SQL, the database writes should work correctly!"
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

runMigration();

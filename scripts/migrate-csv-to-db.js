#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to clean company name
function cleanCompanyName(company) {
  if (!company) return "";

  return company
    .replace(/\s+LTD\.?$/i, "")
    .replace(/\s+LIMITED$/i, "")
    .replace(/\s+COMPANY$/i, "")
    .replace(/\s+CORP\.?$/i, "")
    .replace(/\s+CORPORATION$/i, "")
    .replace(/\s+INC\.?$/i, "")
    .replace(/\s+PVT$/i, "")
    .replace(/\s+PRIVATE$/i, "")
    .replace(/\s+PLC$/i, "")
    .replace(/\s+\(.+\)$/g, "") // Remove anything in parentheses at the end
    .trim();
}

// Function to generate search terms
function generateSearchTerms(symbol, company, companyClean) {
  const terms = new Set();

  // Add symbol variations
  terms.add(symbol.toLowerCase());

  // Add company name variations
  if (company) {
    terms.add(company.toLowerCase());
    // Add individual words from company name
    company
      .toLowerCase()
      .split(/\s+/)
      .forEach((word) => {
        if (word.length > 2) terms.add(word);
      });
  }

  if (companyClean && companyClean !== company) {
    terms.add(companyClean.toLowerCase());
    // Add individual words from clean company name
    companyClean
      .toLowerCase()
      .split(/\s+/)
      .forEach((word) => {
        if (word.length > 2) terms.add(word);
      });
  }

  return Array.from(terms);
}

// Function to parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current); // Add the last field
  return result;
}

async function migrateInstruments() {
  console.log("🚀 Starting CSV to Database Migration...\n");

  const csvPath = path.join(__dirname, "complete.csv");

  if (!fs.existsSync(csvPath)) {
    console.error("❌ complete.csv not found in scripts folder");
    process.exit(1);
  }

  console.log("📁 Reading CSV file...");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");

  console.log(`📊 Total lines in CSV: ${lines.length}`);

  // Skip header line
  const dataLines = lines.slice(1).filter((line) => line.trim());
  console.log(`📋 Data lines to process: ${dataLines.length}`);

  // Filter for NSE_EQ and BSE_EQ equity instruments only
  const equityInstruments = [];
  let processedCount = 0;

  console.log("🔍 Filtering NSE and BSE equity instruments...");

  for (const line of dataLines) {
    processedCount++;

    if (processedCount % 5000 === 0) {
      console.log(
        `   Processed ${processedCount}/${dataLines.length} lines...`
      );
    }

    try {
      const fields = parseCSVLine(line);

      if (fields.length < 12) continue; // Skip malformed lines

      const [
        instrument_key,
        exchange_token,
        tradingsymbol,
        name,
        last_price,
        expiry,
        strike,
        tick_size,
        lot_size,
        instrument_type,
        option_type,
        exchange,
      ] = fields;

      // Filter for NSE_EQ and BSE_EQ equity instruments only
      if (
        (exchange === "NSE_EQ" || exchange === "BSE_EQ") &&
        instrument_type === "EQUITY" &&
        tradingsymbol &&
        name
      ) {
        const companyClean = cleanCompanyName(name);
        const searchTerms = generateSearchTerms(
          tradingsymbol,
          name,
          companyClean
        );

        equityInstruments.push({
          instrument_key: instrument_key,
          symbol: tradingsymbol,
          company: name,
          company_clean: companyClean,
          exchange: exchange,
          search_terms: searchTerms,
        });
      }
    } catch (error) {
      console.warn(
        `⚠️  Error parsing line ${processedCount}: ${error.message}`
      );
    }
  }

  console.log(
    `\n✅ Found ${equityInstruments.length} NSE/BSE equity instruments`
  );

  // Clear existing instruments table
  console.log("🗑️  Clearing existing instruments table...");
  const { error: deleteError } = await supabase
    .from("instruments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

  if (deleteError) {
    console.warn("⚠️  Warning clearing table:", deleteError.message);
  }

  // Insert in batches
  const batchSize = 1000;
  const totalBatches = Math.ceil(equityInstruments.length / batchSize);
  let successCount = 0;
  let errorCount = 0;

  console.log(
    `📦 Inserting ${equityInstruments.length} instruments in ${totalBatches} batches...\n`
  );

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, equityInstruments.length);
    const batch = equityInstruments.slice(start, end);

    console.log(
      `📤 Batch ${i + 1}/${totalBatches}: Inserting ${
        batch.length
      } instruments...`
    );

    try {
      const { data, error } = await supabase.from("instruments").insert(batch);

      if (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Batch ${i + 1} completed successfully`);
        successCount += batch.length;
      }
    } catch (error) {
      console.error(`❌ Batch ${i + 1} exception:`, error.message);
      errorCount += batch.length;
    }

    // Small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n📊 Migration Summary:");
  console.log(`✅ Successfully inserted: ${successCount} instruments`);
  console.log(`❌ Failed insertions: ${errorCount} instruments`);
  console.log(
    `📈 Success rate: ${(
      (successCount / equityInstruments.length) *
      100
    ).toFixed(1)}%`
  );

  // Test the migration
  console.log("\n🧪 Testing migration...");

  const testQueries = ["RELIANCE", "TATA", "INFY", "HDFC"];

  for (const query of testQueries) {
    const { data, error } = await supabase
      .from("instruments")
      .select("symbol, company, exchange")
      .or(`symbol.ilike.%${query}%,company.ilike.%${query}%`)
      .limit(3);

    if (error) {
      console.error(`❌ Test query "${query}" failed:`, error.message);
    } else {
      console.log(`🔍 Test query "${query}": Found ${data.length} results`);
      data.forEach((item) => {
        console.log(`   ${item.symbol} - ${item.company} (${item.exchange})`);
      });
    }
  }

  console.log("\n🎉 Migration completed!");
}

// Run the migration
migrateInstruments().catch((error) => {
  console.error("💥 Migration failed:", error);
  process.exit(1);
});

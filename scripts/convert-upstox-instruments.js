const fs = require("fs");
const path = require("path");

// Function to parse CSV line with proper quote handling
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

// Function to clean and normalize company names
function cleanCompanyName(name) {
  if (!name) return "";

  return name
    .replace(/\s+LTD\.?$/i, "") // Remove LTD/LTD.
    .replace(/\s+LIMITED$/i, "") // Remove LIMITED
    .replace(/\s+CORPORATION$/i, "") // Remove CORPORATION
    .replace(/\s+COMPANY$/i, "") // Remove COMPANY
    .replace(/\s+CORP\.?$/i, "") // Remove CORP/CORP.
    .replace(/\s+INC\.?$/i, "") // Remove INC/INC.
    .replace(/\s+PVT\.?$/i, "") // Remove PVT/PVT.
    .replace(/\s+PRIVATE$/i, "") // Remove PRIVATE
    .replace(/\s+PUBLIC$/i, "") // Remove PUBLIC
    .replace(/\s+&\s+/g, " & ") // Normalize ampersands
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Function to calculate search relevance score
function calculateRelevanceScore(symbol, name, query) {
  const queryLower = query.toLowerCase();
  const symbolLower = symbol.toLowerCase();
  const nameLower = name.toLowerCase();

  // Exact symbol match gets highest score
  if (symbolLower === queryLower) return 100;

  // Symbol starts with query
  if (symbolLower.startsWith(queryLower)) return 90;

  // Symbol contains query
  if (symbolLower.includes(queryLower)) return 80;

  // Exact company name match
  if (nameLower === queryLower) return 85;

  // Company name starts with query
  if (nameLower.startsWith(queryLower)) return 75;

  // Company name contains query
  if (nameLower.includes(queryLower)) return 65;

  // Word boundary matches in company name
  const nameWords = nameLower.split(/\s+/);
  for (const word of nameWords) {
    if (word.startsWith(queryLower)) return 60;
    if (word.includes(queryLower)) return 50;
  }

  return 0;
}

// Main conversion function
async function convertUpstoxInstruments() {
  console.log("🚀 Starting Upstox instruments conversion...");

  const csvPath = path.join(__dirname, "complete.csv");
  const outputDir = path.join(__dirname, "..", "public", "upstox-instruments");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Read the CSV file
    console.log("📖 Reading CSV file...");
    const csvData = fs.readFileSync(csvPath, "utf-8");
    const lines = csvData.split("\n").filter((line) => line.trim());

    console.log(`📊 Found ${lines.length} lines in CSV`);

    // Parse header
    const header = parseCSVLine(lines[0]);
    console.log("📋 CSV Headers:", header);

    // Process data
    const allInstruments = [];
    const equityInstruments = [];
    const searchableInstruments = [];
    const symbolToInstrument = {};
    const instrumentToSymbol = {};

    let processed = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);

        if (fields.length < header.length) {
          skipped++;
          continue;
        }

        const instrument = {
          instrument_key: fields[0] || "",
          exchange_token: fields[1] || "",
          tradingsymbol: fields[2] || "",
          name: fields[3] || "",
          last_price: parseFloat(fields[4]) || 0,
          expiry: fields[5] || "",
          strike: parseFloat(fields[6]) || 0,
          tick_size: parseFloat(fields[7]) || 0,
          lot_size: parseInt(fields[8]) || 0,
          instrument_type: fields[9] || "",
          option_type: fields[10] || "",
          exchange: fields[11] || "",
        };

        allInstruments.push(instrument);

        // Create symbol mappings
        if (instrument.tradingsymbol) {
          symbolToInstrument[instrument.tradingsymbol] =
            instrument.instrument_key;
          instrumentToSymbol[instrument.instrument_key] =
            instrument.tradingsymbol;
        }

        // Filter equity instruments for search
        if (
          instrument.instrument_type === "EQUITY" &&
          (instrument.exchange === "NSE_EQ" || instrument.exchange === "BSE_EQ")
        ) {
          const cleanName = cleanCompanyName(instrument.name);

          const equityData = {
            symbol: instrument.tradingsymbol,
            instrument_key: instrument.instrument_key,
            exchange_token: instrument.exchange_token,
            name: instrument.name,
            cleanName: cleanName,
            exchange: instrument.exchange,
            last_price: instrument.last_price,
            tick_size: instrument.tick_size,
          };

          equityInstruments.push(equityData);

          // Create searchable version
          const searchableData = {
            symbol: instrument.tradingsymbol,
            instrument_key: instrument.instrument_key,
            company: instrument.name,
            companyClean: cleanName,
            exchange: instrument.exchange.replace("_EQ", ""), // NSE, BSE
            searchTerms: [
              instrument.tradingsymbol,
              instrument.name.toLowerCase(),
              cleanName.toLowerCase(),
              ...cleanName.toLowerCase().split(/\s+/),
              ...instrument.name.toLowerCase().split(/\s+/),
            ].filter((term) => term.length > 0),
          };

          searchableInstruments.push(searchableData);
        }

        processed++;

        if (processed % 10000 === 0) {
          console.log(`✅ Processed ${processed} instruments...`);
        }
      } catch (error) {
        console.error(`❌ Error processing line ${i}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📈 Processing Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   All instruments: ${allInstruments.length}`);
    console.log(`   Equity instruments: ${equityInstruments.length}`);
    console.log(`   Searchable instruments: ${searchableInstruments.length}`);

    // Write output files
    console.log("\n💾 Writing essential output files...");

    // 1. Searchable instruments (optimized for search) - Main file for API
    fs.writeFileSync(
      path.join(outputDir, "searchable-instruments.json"),
      JSON.stringify(searchableInstruments, null, 2)
    );
    console.log("✅ Created: searchable-instruments.json");

    // 2. Symbol to instrument key mapping - For quick lookups
    fs.writeFileSync(
      path.join(outputDir, "symbol-to-instrument.json"),
      JSON.stringify(symbolToInstrument, null, 2)
    );
    console.log("✅ Created: symbol-to-instrument.json");

    // 3. Create exchange-wise splits - For exchange-specific searches
    const nseEquity = equityInstruments.filter(
      (item) => item.exchange === "NSE_EQ"
    );
    const bseEquity = equityInstruments.filter(
      (item) => item.exchange === "BSE_EQ"
    );

    fs.writeFileSync(
      path.join(outputDir, "nse-equity.json"),
      JSON.stringify(nseEquity, null, 2)
    );
    console.log("✅ Created: nse-equity.json");

    fs.writeFileSync(
      path.join(outputDir, "bse-equity.json"),
      JSON.stringify(bseEquity, null, 2)
    );
    console.log("✅ Created: bse-equity.json");

    // 4. Create statistics file
    const stats = {
      totalInstruments: allInstruments.length,
      equityInstruments: equityInstruments.length,
      nseEquity: nseEquity.length,
      bseEquity: bseEquity.length,
      searchableInstruments: searchableInstruments.length,
      exchanges: [...new Set(allInstruments.map((item) => item.exchange))],
      instrumentTypes: [
        ...new Set(allInstruments.map((item) => item.instrument_type)),
      ],
      generatedAt: new Date().toISOString(),
      fileSize: {
        csvSizeMB: (fs.statSync(csvPath).size / (1024 * 1024)).toFixed(2),
      },
    };

    fs.writeFileSync(
      path.join(outputDir, "stats.json"),
      JSON.stringify(stats, null, 2)
    );
    console.log("✅ Created: stats.json");

    console.log("\n🎉 Conversion completed successfully!");
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📊 Files created: 5 essential JSON files`);
    console.log(`🔍 Search-ready instruments: ${searchableInstruments.length}`);
  } catch (error) {
    console.error("❌ Error during conversion:", error);
    throw error;
  }
}

// Search function for testing
function searchInstruments(query, limit = 10) {
  const searchablePath = path.join(
    __dirname,
    "..",
    "public",
    "upstox-instruments",
    "searchable-instruments.json"
  );

  if (!fs.existsSync(searchablePath)) {
    console.error(
      "❌ Searchable instruments file not found. Run conversion first."
    );
    return [];
  }

  const instruments = JSON.parse(fs.readFileSync(searchablePath, "utf-8"));
  const queryLower = query.toLowerCase();

  const results = instruments
    .map((instrument) => ({
      ...instrument,
      relevanceScore: calculateRelevanceScore(
        instrument.symbol,
        instrument.companyClean,
        query
      ),
    }))
    .filter((instrument) => instrument.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run conversion
    convertUpstoxInstruments().catch(console.error);
  } else if (args[0] === "search") {
    // Test search
    const query = args[1];
    const limit = parseInt(args[2]) || 10;

    if (!query) {
      console.log(
        "Usage: node convert-upstox-instruments.js search <query> [limit]"
      );
      process.exit(1);
    }

    console.log(`🔍 Searching for: "${query}"`);
    const results = searchInstruments(query, limit);

    if (results.length === 0) {
      console.log("❌ No results found");
    } else {
      console.log(`✅ Found ${results.length} results:`);
      results.forEach((result, index) => {
        console.log(
          `${index + 1}. ${result.symbol} - ${result.companyClean} (${
            result.exchange
          }) [${result.relevanceScore}%]`
        );
      });
    }
  } else {
    console.log("Usage:");
    console.log(
      "  node convert-upstox-instruments.js          # Convert CSV to JSON"
    );
    console.log(
      "  node convert-upstox-instruments.js search <query> [limit]  # Test search"
    );
  }
}

module.exports = {
  convertUpstoxInstruments,
  searchInstruments,
  calculateRelevanceScore,
};

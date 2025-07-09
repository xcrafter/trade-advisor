import fetch from "node-fetch";

async function testSearch() {
  console.log("🧪 Testing Stock Search...\n");

  try {
    // Test 1: Search for RELIANCE
    console.log("1️⃣ Testing search for RELIANCE...");
    const searchResponse = await fetch(
      "http://localhost:3002/api/upstox/search?q=RELIANCE"
    );

    if (!searchResponse.ok) {
      console.log("❌ Search API not responding");
      return;
    }

    const searchData = await searchResponse.json();
    const results = searchData.results || [];
    console.log(`✅ Found ${results.length} results for RELIANCE`);

    if (results.length > 0) {
      console.log("📋 First few results:");
      results.slice(0, 3).forEach((stock, index) => {
        console.log(
          `   ${index + 1}. ${stock.symbol} - ${stock.exchange} (${
            stock.instrument_key
          })`
        );
      });
    }

    // Test 2: Test analyze API with RELIANCE
    if (results.length > 0) {
      console.log("\n2️⃣ Testing analyze API with RELIANCE...");
      const analyzeResponse = await fetch("http://localhost:3002/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: "RELIANCE",
        }),
      });

      console.log(`   Analyze Status: ${analyzeResponse.status}`);

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        console.log("✅ Analysis successful!");
        console.log(`   Signal: ${analyzeData.signal}`);
        console.log(`   Price: ₹${analyzeData.price}`);
        console.log(`   Swing Score: ${analyzeData.swing_score}`);
      } else {
        const errorData = await analyzeResponse.json();
        console.log("❌ Analysis failed:");
        console.log(`   Error: ${errorData.error}`);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSearch();

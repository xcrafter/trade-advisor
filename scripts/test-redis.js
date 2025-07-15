import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testRedis() {
  try {
    // Initialize Redis client
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    console.log("🔄 Testing Redis connection...");

    console.log(process.env.UPSTASH_REDIS_REST_URL);
    console.log(process.env.UPSTASH_REDIS_REST_TOKEN);

    // Test 1: Set a value
    const testKey = "test_key";
    await redis.set(testKey, "Hello from Redis!");
    console.log("✅ Set operation successful");

    // Test 2: Get the value
    const value = await redis.get(testKey);
    console.log("📖 Retrieved value:", value);

    // Test 3: Check if UPSTOX_ACCESS_TOKEN exists
    const token = await redis.get("UPSTOX_ACCESS_TOKEN");
    console.log("🔑 Current Upstox token:", token || "Not found");

    // Test 4: Delete test key
    await redis.del(testKey);
    console.log("🗑️  Cleanup successful");

    console.log("\n✨ All Redis tests passed!");
  } catch (error) {
    console.error("❌ Redis test failed:", error);
  }
}

testRedis();

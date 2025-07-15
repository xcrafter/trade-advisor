import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const UPSTOX_API_URL = "https://api.upstox.com/v2";

export async function GET(request: NextRequest) {
  try {
    // Get token from Redis
    const token = await redis.get("UPSTOX_ACCESS_TOKEN");
    if (!token) {
      console.log("[UpstoxAPI] No token found in Redis");
      return NextResponse.json({ isValid: false });
    }

    // Make a test API call to validate the token
    const response = await fetch(`${UPSTOX_API_URL}/user/profile`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("[UpstoxAPI] Token validation failed:", response.status);
      return NextResponse.json({ isValid: false });
    }

    return NextResponse.json({ isValid: true });
  } catch (error) {
    console.error("[UpstoxAPI] Token validation error:", error);
    return NextResponse.json({ isValid: false });
  }
}

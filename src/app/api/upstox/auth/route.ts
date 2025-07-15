import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Hardcoded redirect URL since this is a temporary setup
const REDIRECT_URI =
  "https://archives-paper-dangerous-achievement.trycloudflare.com/api/upstox/auth";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    // If no code is present, show the initial auth page
    if (!code) {
      const params = new URLSearchParams({
        client_id: process.env.UPSTOX_CLIENT_ID!,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
      });

      const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?${params}`;

      // Return simple HTML page with the auth button
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Get Upstox Token</title>
            <style>
              body { 
                font-family: system-ui; 
                max-width: 800px; 
                margin: 40px auto; 
                padding: 20px;
                line-height: 1.6;
              }
              .button { 
                background: #2563eb;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                display: inline-block;
                margin: 20px 0;
              }
              .info {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <h1>Get Upstox Extended Token</h1>
            <div class="info">
              <p>This page will help you generate an extended access token for Upstox API.</p>
              <p>Steps:</p>
              <ol>
                <li>Click the "Connect Upstox" button below</li>
                <li>Log in to your Upstox account</li>
                <li>Authorize the application</li>
                <li>You'll be redirected back here with your token</li>
              </ol>
            </div>
            <a href="${authUrl}" class="button">Connect Upstox</a>
          </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Exchange code for token
    const formData = new URLSearchParams();
    formData.append("code", code);
    formData.append("client_id", process.env.UPSTOX_CLIENT_ID!);
    formData.append("client_secret", process.env.UPSTOX_CLIENT_SECRET!);
    formData.append("redirect_uri", REDIRECT_URI);
    formData.append("grant_type", "authorization_code");

    const tokenResponse = await fetch(
      "https://api.upstox.com/v2/login/authorization/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: formData.toString(),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(`Failed to exchange code: ${JSON.stringify(error)}`);
    }

    const data = await tokenResponse.json();
    const { access_token, expires_in } = data;

    // Store token in Upstash Redis
    try {
      await redis.set("UPSTOX_ACCESS_TOKEN", access_token);
      console.log("✅ Token stored in Upstash Redis successfully");
    } catch (redisError) {
      console.error("Failed to store token in Redis:", redisError);
      // Continue execution even if Redis storage fails
    }

    // Log the token (you can copy it from your server logs)
    console.log("\n=== UPSTOX EXTENDED TOKEN ===");
    console.log("Access Token:", access_token);
    console.log("Expires In:", expires_in, "seconds");
    console.log("============================\n");

    // Show success page with the token
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Upstox Token Generated</title>
          <style>
            body { 
              font-family: system-ui; 
              max-width: 800px; 
              margin: 40px auto; 
              padding: 20px;
              line-height: 1.6;
            }
            .success { 
              background: #dcfce7;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .token {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 6px;
              word-break: break-all;
              font-family: monospace;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Extended Token Generated Successfully!</h1>
            <p>Your token has been generated and stored in Edge Config.</p>
          </div>
          
          <h2>Token Details:</h2>
          <div class="token">
            <p><strong>Access Token:</strong><br>${access_token}</p>
            <p><strong>Expires In:</strong> ${expires_in} seconds (${Math.floor(
      expires_in / 86400
    )} days)</p>
          </div>

          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>The token has been automatically stored in Edge Config</li>
            <li>You can now use this token in your application</li>
            <li>The token will be available via Edge Config throughout your application</li>
          </ol>
        </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

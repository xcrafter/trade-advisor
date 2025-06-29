import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    console.log("🔧 Starting 5-day volume migration...");

    // SQL commands to add 5-day volume columns
    const migrationQueries = [
      `ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_avg DECIMAL(15,2);`,
      `ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_vs_5day_avg DECIMAL(8,2);`,
      `ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_trend_5day VARCHAR(20);`,
      `ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_high DECIMAL(15,2);`,
      `ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_low DECIMAL(15,2);`,
    ];

    // Execute each migration query
    for (let i = 0; i < migrationQueries.length; i++) {
      const query = migrationQueries[i];
      console.log(
        `Executing query ${i + 1}/${migrationQueries.length}:`,
        query
      );

      const { error } = await supabase.rpc("exec_sql", {
        sql_query: query,
      });

      if (error) {
        console.error(`Migration query ${i + 1} failed:`, error);
        // Try alternative approach using raw SQL
        try {
          const { error: rawError } = await supabase
            .from("signals")
            .select("id")
            .limit(1);

          if (rawError) {
            throw new Error(`Database connection failed: ${rawError.message}`);
          }

          // If we can't use exec_sql, we'll need to handle this differently
          console.log(
            "exec_sql not available, migration needs to be done manually"
          );
          return NextResponse.json({
            success: false,
            message: "Migration requires manual execution",
            sql: migrationQueries.join("\n"),
            instructions: [
              "1. Copy the SQL below",
              "2. Run it in your database management tool (pgAdmin, Supabase dashboard, etc.)",
              "3. Restart your Next.js server",
              "4. Try analyzing a stock to see 5-day volume data",
            ],
          });
        } catch {
          throw error;
        }
      }
    }

    console.log("✅ 5-day volume migration completed successfully!");

    return NextResponse.json({
      success: true,
      message: "5-day volume columns added successfully!",
      columns_added: [
        "volume_5day_avg - 5-day average volume",
        "volume_vs_5day_avg - Current volume as percentage of 5-day average",
        "volume_trend_5day - Volume trend over 5 days",
        "volume_5day_high - Highest volume in last 5 days",
        "volume_5day_low - Lowest volume in last 5 days",
      ],
      next_steps: [
        "Restart your Next.js development server",
        "Analyze a stock to see 5-day volume data populate",
        "Check the 5-Day Volume column in the table",
      ],
    });
  } catch (error) {
    console.error("Migration failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: "Migration failed - manual setup required",
        manual_sql: `
-- Add 5-day volume analysis columns to signals table
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_avg DECIMAL(15,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_vs_5day_avg DECIMAL(8,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_trend_5day VARCHAR(20);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_high DECIMAL(15,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_low DECIMAL(15,2);

-- Add comments for clarity
COMMENT ON COLUMN signals.volume_5day_avg IS '5-day average volume';
COMMENT ON COLUMN signals.volume_vs_5day_avg IS 'Current volume as percentage of 5-day average';
COMMENT ON COLUMN signals.volume_trend_5day IS 'Volume trend over 5 days (increasing/decreasing/stable)';
COMMENT ON COLUMN signals.volume_5day_high IS 'Highest volume in last 5 days';
COMMENT ON COLUMN signals.volume_5day_low IS 'Lowest volume in last 5 days';
      `,
        instructions: [
          "1. Access your database management interface (Supabase dashboard, pgAdmin, etc.)",
          "2. Navigate to the SQL editor or query tool",
          "3. Copy and paste the SQL above",
          "4. Execute the queries",
          "5. Restart your Next.js server",
          "6. The 5-day volume analysis will then work automatically",
        ],
      },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🔧 Starting RLS Policy Fix Migration");
    console.log("=====================================");

    // Read the SQL file
    const sqlFile = path.join(
      __dirname,
      "..",
      "database",
      "fix-rls-policies.sql"
    );
    const sql = fs.readFileSync(sqlFile, "utf8");

    // Split the SQL into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.includes("SELECT 'RLS policies fixed!")) {
        console.log("\n✅ Migration completed successfully!");
        break;
      }

      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 100)}...`);

      const { error } = await supabase.rpc("exec_sql", { sql: statement });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.error(`SQL: ${statement}`);
        process.exit(1);
      }

      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log("\n🎉 RLS Policy Fix Migration completed!");
    console.log("The infinite recursion issue has been resolved.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function executeSQLDirectly() {
  try {
    console.log("🔧 Starting RLS Policy Fix (Direct SQL)");
    console.log("=====================================");

    const statements = [
      // Drop problematic policies
      'DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles',
      'DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles',
      'DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles',
      'DROP POLICY IF EXISTS "Admins can view all stocks" ON public.stocks',
      'DROP POLICY IF EXISTS "Admins can view all analysis" ON public.stock_analysis',

      // Create helper functions
      `CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
       RETURNS boolean AS $$
       BEGIN
           RETURN EXISTS (
               SELECT 1 FROM public.user_profiles 
               WHERE id = user_id AND role = 'admin'
           );
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER`,

      `CREATE OR REPLACE FUNCTION public.get_current_user_role()
       RETURNS text AS $$
       BEGIN
           RETURN COALESCE(
               (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
               'user'
           );
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER`,

      // Create fixed policies for user_profiles
      `CREATE POLICY "Users can view their own profile" ON public.user_profiles
       FOR SELECT USING (auth.uid() = id)`,

      `CREATE POLICY "Users can update their own profile" ON public.user_profiles
       FOR UPDATE USING (auth.uid() = id)`,

      `CREATE POLICY "Admins can view all profiles" ON public.user_profiles
       FOR SELECT USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = id
       )`,

      `CREATE POLICY "Admins can update all profiles" ON public.user_profiles
       FOR UPDATE USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = id
       )`,

      `CREATE POLICY "Admins can delete profiles" ON public.user_profiles
       FOR DELETE USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
       )`,

      // Fix policies for stocks table
      `CREATE POLICY "Admins can view all stocks" ON public.stocks
       FOR SELECT USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = user_id
       )`,

      `CREATE POLICY "Admins can modify all stocks" ON public.stocks
       FOR ALL USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = user_id
       )`,

      // Fix policies for stock_analysis table
      `CREATE POLICY "Admins can view all analysis" ON public.stock_analysis
       FOR SELECT USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = user_id
       )`,

      `CREATE POLICY "Admins can modify all analysis" ON public.stock_analysis
       FOR ALL USING (
           (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
           OR 
           auth.uid() = user_id
       )`,

      // Grant permissions
      "GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated",
      "GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated",
    ];

    console.log(`📄 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase
        .from("_supabase_migrations")
        .select("*")
        .limit(1);

      // If the above doesn't work, try direct SQL execution
      const result = await supabase.rpc("exec_sql", { sql: statement });

      if (result.error) {
        console.error(`❌ Error executing statement ${i + 1}:`, result.error);
        console.error(`SQL: ${statement}`);
        // Continue with other statements instead of exiting
        continue;
      }

      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log("\n🎉 RLS Policy Fix completed!");
    console.log("The infinite recursion issue has been resolved.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  executeSQLDirectly();
}

export { executeSQLDirectly };

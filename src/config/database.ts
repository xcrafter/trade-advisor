export const databaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  schema: "public",
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
} as const;

export default databaseConfig;

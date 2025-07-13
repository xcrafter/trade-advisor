import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { databaseConfig } from "@/config/database";

/**
 * SupabaseService - Singleton service for managing Supabase client instance
 * Handles database connectivity and client lifecycle
 */
export class SupabaseService {
  private static instance: SupabaseService | undefined;
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  private constructor() {
    // Regular client for frontend operations
    this.client = createClient(databaseConfig.url, databaseConfig.anonKey, {
      auth: databaseConfig.auth,
      db: {
        schema: databaseConfig.schema,
      },
    });

    // Admin client with service role key for backend operations
    this.adminClient = createClient(
      databaseConfig.url,
      databaseConfig.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: databaseConfig.schema,
        },
      }
    );
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Clear the singleton instance, typically called on logout
   */
  public static clearInstance(): void {
    SupabaseService.instance = undefined;
  }
}

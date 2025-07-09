import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { databaseConfig } from "@/config/database";

/**
 * SupabaseService - Singleton service for managing Supabase client instance
 * Handles database connectivity and client lifecycle
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;

  private constructor() {
    this.client = createClient(databaseConfig.url, databaseConfig.anonKey, {
      auth: databaseConfig.auth,
      db: {
        schema: databaseConfig.schema,
      },
    });
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
}

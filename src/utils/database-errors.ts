import { PostgrestError } from "@supabase/supabase-js";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: PostgrestError
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function handleDatabaseError(
  error: PostgrestError | null,
  context: string
): never {
  if (error) {
    console.error(`Database error in ${context}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new DatabaseError(
      `Operation failed: ${error.message}`,
      context,
      error
    );
  }
  throw new DatabaseError("Unknown database error", context);
}

export function isNotFoundError(error: PostgrestError): boolean {
  return error.code === "PGRST116";
}

export function isDuplicateError(error: PostgrestError): boolean {
  return error.code === "23505";
}

export function isForeignKeyError(error: PostgrestError): boolean {
  return error.code === "23503";
}

const databaseErrorUtils = {
  DatabaseError,
  handleDatabaseError,
  isNotFoundError,
  isDuplicateError,
  isForeignKeyError,
} as const;

export default databaseErrorUtils;

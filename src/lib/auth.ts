import { createClient } from "@supabase/supabase-js";
import { User, Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  role?: "admin" | "user";
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService {
  // Sign up new user
  static async signUp(data: SignUpData) {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role || "user",
          },
        },
      });

      if (error) {
        throw error;
      }

      return {
        user: authData.user,
        session: authData.session,
        success: true,
      };
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }

  // Sign in user
  static async signIn(data: SignInData) {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      return {
        user: authData.user,
        session: authData.session,
        success: true,
      };
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      return user;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  // Get current session
  static async getCurrentSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return session;
    } catch (error) {
      console.error("Get current session error:", error);
      return null;
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(updates: {
    email?: string;
    data?: Record<string, unknown>;
  }) {
    try {
      const { error } = await supabase.auth.updateUser(updates);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Check if user has specific role
  static async hasRole(role: "admin" | "user"): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const userRole = user.user_metadata?.role || "user";
      return userRole === role || userRole === "admin"; // Admin has access to everything
    } catch (error) {
      console.error("Check role error:", error);
      return false;
    }
  }

  // Check if user is admin
  static async isAdmin(): Promise<boolean> {
    return this.hasRole("admin");
  }
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (updates: Record<string, unknown>) => Promise<void>;
}

// Auth errors
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_NOT_CONFIRMED: "Please confirm your email address",
  USER_NOT_FOUND: "User not found",
  EMAIL_ALREADY_EXISTS: "Email already exists",
  WEAK_PASSWORD: "Password is too weak",
  UNAUTHORIZED: "Unauthorized access",
  SESSION_EXPIRED: "Session has expired",
} as const;

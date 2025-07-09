import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required environment variables for Supabase admin operations"
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
      console.error("Error getting user:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || "user",
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
        email_confirmed_at: data.user.email_confirmed_at,
        user_metadata: data.user.user_metadata,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/auth/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update user by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { email, password, role } = body;

    const updates: Record<string, unknown> = {};

    if (email) {
      updates.email = email;
    }

    if (password) {
      updates.password = password;
    }

    if (role) {
      if (!["admin", "user"].includes(role)) {
        return NextResponse.json(
          { error: 'Role must be either "admin" or "user"' },
          { status: 400 }
        );
      }
      updates.user_metadata = { role };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      updates
    );

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || "user",
        updated_at: data.user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/auth/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/auth/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

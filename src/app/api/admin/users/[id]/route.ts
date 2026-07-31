import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import type { UserRole } from "@/lib/types";

function adminClientOrError() {
  try {
    return { admin: createAdminClient() };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY (required to manage auth users)." },
        { status: 503 },
      ),
    };
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const privileged = adminClientOrError();
  if ("error" in privileged) return privileged.error;

  const { id } = await context.params;
  const body = await request.json();

  const name = body.name !== undefined ? String(body.name).trim() : undefined;
  const role =
    body.role === "admin" || body.role === "user" ? (body.role as UserRole) : undefined;
  const student_id =
    body.student_id !== undefined
      ? body.student_id
        ? String(body.student_id).trim()
        : null
      : undefined;
  const college =
    body.college !== undefined ? (body.college ? String(body.college).trim() : null) : undefined;
  const department =
    body.department !== undefined
      ? body.department
        ? String(body.department).trim()
        : null
      : undefined;
  const phone =
    body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined;

  const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
  const password = body.password !== undefined ? String(body.password) : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }
  if (password !== undefined && password !== "" && password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters (or leave blank)." },
      { status: 400 },
    );
  }

  const authUpdates: { email?: string; password?: string; user_metadata?: Record<string, unknown> } =
    {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;

  const profilePatch: Record<string, unknown> = {};
  if (name !== undefined) profilePatch.name = name;
  if (role !== undefined) profilePatch.role = role;
  if (student_id !== undefined) profilePatch.student_id = student_id;
  if (college !== undefined) profilePatch.college = college;
  if (department !== undefined) profilePatch.department = department;
  if (phone !== undefined) profilePatch.phone = phone;

  if (Object.keys(profilePatch).length > 0) {
    const meta: Record<string, unknown> = {};
    if (name !== undefined) meta.name = name;
    if (role !== undefined) meta.role = role;
    if (student_id !== undefined) meta.student_id = student_id;
    if (college !== undefined) meta.college = college;
    if (phone !== undefined) meta.phone = phone;
    if (Object.keys(meta).length > 0) authUpdates.user_metadata = meta;
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await privileged.admin.auth.admin.updateUserById(id, authUpdates);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  }

  if (Object.keys(profilePatch).length === 0 && Object.keys(authUpdates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  let profile = null;
  if (Object.keys(profilePatch).length > 0) {
    const { data, error: profileError } = await privileged.admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", id)
      .select("id, name, role, student_id, college, department, phone, created_at")
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    profile = data;
  } else {
    const { data } = await privileged.admin
      .from("profiles")
      .select("id, name, role, student_id, college, department, phone, created_at")
      .eq("id", id)
      .maybeSingle();
    profile = data;
  }

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { data: authUser } = await privileged.admin.auth.admin.getUserById(id);

  return NextResponse.json({
    user: { ...profile, email: authUser.user?.email ?? null },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  if (id === auth.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const privileged = adminClientOrError();
  if ("error" in privileged) return privileged.error;

  const { error } = await privileged.admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

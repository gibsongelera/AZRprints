import { NextResponse } from "next/server";
import { serviceClientOrError } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import type { UserRole } from "@/lib/types";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const privileged = serviceClientOrError("manage auth users");
  if ("error" in privileged) return privileged.error;

  const { data: profiles, error: profileError } = await auth.supabase
    .from("profiles")
    .select("id, name, role, student_id, college, department, phone, created_at")
    .order("created_at", { ascending: false });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const emailById = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data: listed, error: listError } = await privileged.admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    for (const u of listed.users) {
      emailById.set(u.id, u.email ?? null);
    }
    if (listed.users.length < perPage) break;
    page += 1;
  }

  const users = (profiles || []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const privileged = serviceClientOrError("manage auth users");
  if ("error" in privileged) return privileged.error;

  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const role = (body.role === "admin" ? "admin" : "user") as UserRole;
  const student_id = body.student_id ? String(body.student_id).trim() : null;
  const college = body.college ? String(body.college).trim() : null;
  const department = body.department ? String(body.department).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email and password (min 6 characters) are required." },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data: created, error: createError } = await privileged.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      student_id,
      college,
      phone,
      role,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Failed to create user." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await privileged.admin
    .from("profiles")
    .update({
      name,
      role,
      student_id,
      college,
      department,
      phone,
    })
    .eq("id", created.user.id)
    .select("id, name, role, student_id, college, department, phone, created_at")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    user: { ...profile, email: created.user.email ?? email },
  });
}

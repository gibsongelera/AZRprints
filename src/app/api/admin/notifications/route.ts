import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json();
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const type = String(body.type || "info");

  if (!title || !message) {
    return NextResponse.json({ error: "Title and message required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase!
    .from("notifications")
    .insert({ title, message, type, user_id: null })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notification: data });
}

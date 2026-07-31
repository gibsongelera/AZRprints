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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { data, error } = await auth.supabase!
    .from("printer_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json();
  const { data, error } = await auth.supabase!
    .from("printer_settings")
    .update({
      auto_print_enabled: Boolean(body.auto_print_enabled),
      direct_print_enabled: Boolean(body.direct_print_enabled),
      default_printer_name: String(body.default_printer_name || ""),
      poll_interval_seconds: Math.min(
        300,
        Math.max(5, parseInt(String(body.poll_interval_seconds || "15"), 10) || 15)
      ),
      max_job_retries: Math.min(
        10,
        Math.max(0, parseInt(String(body.max_job_retries || "3"), 10) || 3)
      ),
      spool_retention_hours: Math.min(
        168,
        Math.max(1, parseInt(String(body.spool_retention_hours || "24"), 10) || 24)
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

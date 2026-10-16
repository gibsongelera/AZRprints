import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

const DEFAULTS = {
  id: 1,
  auto_print_enabled: true,
  direct_print_enabled: true,
  default_printer_name: "",
  poll_interval_seconds: 15,
  max_job_retries: 3,
  spool_retention_hours: 24,
};

function explain(message: string) {
  if (/printer_settings|relation .* does not exist|schema cache/i.test(message)) {
    return "Printer settings table is missing. Run supabase/migrations/002_print_queue.sql in the Supabase SQL editor, then reload this page.";
  }
  return message;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("printer_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  }
  if (data) return NextResponse.json({ settings: data });

  // Table exists but the singleton row was never seeded: create it with defaults.
  const { data: created, error: insertError } = await auth.supabase
    .from("printer_settings")
    .upsert(DEFAULTS, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (insertError || !created) {
    // RLS has no insert policy for this table; show defaults so the page still works.
    return NextResponse.json({
      settings: { ...DEFAULTS, updated_at: new Date().toISOString() },
      notice:
        "Using default printer settings. Run migration 002 again to save them to the database.",
    });
  }
  return NextResponse.json({ settings: created });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { data, error } = await auth.supabase
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
        Math.max(0, parseInt(String(body.max_job_retries ?? "3"), 10) || 0)
      ),
      spool_retention_hours: Math.min(
        168,
        Math.max(1, parseInt(String(body.spool_retention_hours || "24"), 10) || 24)
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Printer settings row is missing. Run migration 002, then save again." },
      { status: 404 }
    );
  }
  return NextResponse.json({ settings: data });
}

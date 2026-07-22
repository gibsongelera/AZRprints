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

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json();
  const { data, error } = await auth.supabase!
    .from("shop_settings")
    .update({
      shop_name: String(body.shop_name || ""),
      tagline: String(body.tagline || ""),
      open_time: String(body.open_time || "07:00"),
      close_time: String(body.close_time || "18:00"),
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

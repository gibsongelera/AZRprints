import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeNextPath } from "@/lib/site-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/");
  const site = getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${site}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // Password recovery lands on reset form; email confirm lands on login.
  return NextResponse.redirect(`${site}${next}`);
}

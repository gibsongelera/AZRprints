import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Service-role client for webhooks and privileged server tasks. Never import in client components. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client for API routes, or a 503 response that explains the
 * missing environment variable. `purpose` finishes the sentence "required to …".
 */
export function serviceClientOrError(
  purpose: string
): { admin: SupabaseClient } | { error: NextResponse } {
  try {
    return { admin: createAdminClient() };
  } catch {
    return {
      error: NextResponse.json(
        { error: `Server is missing SUPABASE_SERVICE_ROLE_KEY (required to ${purpose}).` },
        { status: 503 }
      ),
    };
  }
}

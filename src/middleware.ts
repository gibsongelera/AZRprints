import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets AND /api/* so API routes always return JSON
     * (never an HTML login redirect / soft 404 from middleware).
     */
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password";
  const isAdminRoute = path.startsWith("/admin");
  const isUserRoute = path.startsWith("/user");
  const isProtected = isAdminRoute || isUserRoute;

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Allow recovery session to stay on /reset-password (not treated as auth bounce).
  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname =
      profile?.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && (isAdminRoute || isUserRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? "user";

    if (isAdminRoute && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/user/dashboard";
      return NextResponse.redirect(url);
    }

    if (isUserRoute && role === "admin") {
      // Admins may still browse user routes if desired; keep them on admin by default
      // Allow access so admin can preview — or redirect. Plan says role guards:
      // "admin cannot access /user-only routes" — redirect admins away from /user
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

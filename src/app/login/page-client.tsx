"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  const notice = useMemo(() => {
    if (searchParams.get("registered") === "1") {
      return "Account created. Check your email for a confirmation link, then sign in here.";
    }
    if (searchParams.get("confirmed") === "1") {
      return "Email confirmed. You can sign in now.";
    }
    if (searchParams.get("reset") === "1") {
      return "Password updated. Sign in with your new password.";
    }
    if (searchParams.get("forgot") === "1") {
      return "If that email is registered, we sent a password reset link. Check your inbox.";
    }
    return "";
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !data.user) {
      setError(authError?.message || "Login failed");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const redirect = searchParams.get("redirect");
    if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
      router.replace(redirect);
    } else {
      router.replace(
        profile?.role === "admin" ? "/admin/dashboard" : "/user/dashboard",
      );
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-pp-bg">
      <nav className="bg-pp-primary-dark text-white px-4 py-3 flex items-center gap-3">
        <Image
          src="/assets/azr-prints-logo.png"
          alt="AZR PRINT'S"
          width={40}
          height={40}
          className="rounded"
        />
        <div>
          <div className="brand-title font-bold text-lg">AZR PRINT&apos;S</div>
          <small className="text-white/60">ZPPSU Printing Services</small>
        </div>
      </nav>

      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-center p-12 bg-pp-primary-dark text-white">
          <h2 className="text-4xl font-bold mb-4">Streamlining Campus Printing</h2>
          <p className="text-white/75 text-lg mb-6">
            Efficient document management for ZPPSU students and faculty. Pay
            securely via PayMongo — InstaPay QR Ph, GCash, Maya, or card.
          </p>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-green-600/90 px-3 py-1 text-sm">
            System Operational
          </span>
        </div>

        <div className="flex items-center justify-center p-6 md:p-12 bg-white">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
            <p className="text-pp-muted mb-6">Sign in to manage your print orders.</p>

            {notice && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {notice}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  className="w-full min-h-11 rounded-lg border border-pp-border px-3 outline-none focus:border-pp-accent focus:ring-2 focus:ring-red-200"
                  placeholder="student@zppsu.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-pp-accent font-medium underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="flex gap-2">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="w-full min-h-11 rounded-lg border border-pp-border px-3 outline-none focus:border-pp-accent focus:ring-2 focus:ring-red-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-pp-border px-3 text-sm"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-[#b91c1c] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Login to Dashboard"}
              </button>
            </form>

            <p className="text-center text-pp-muted mt-6 text-sm">
              No account?{" "}
              <Link href="/signup" className="text-pp-accent font-medium underline">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

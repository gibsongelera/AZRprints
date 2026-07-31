"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const site = getSiteUrl();
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${site}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    // Same message whether or not the email exists (avoid account enumeration).
    router.replace("/login?forgot=1");
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

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border border-pp-border shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-1">Forgot password</h2>
          <p className="text-pp-muted mb-6 text-sm">
            Enter your account email and we&apos;ll send a reset link.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-pp-muted mt-6 text-sm">
            <Link href="/login" className="text-pp-accent font-medium underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

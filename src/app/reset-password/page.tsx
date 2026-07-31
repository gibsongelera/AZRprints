"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(!!session);
      setReady(true);
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reset=1");
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
          <h2 className="text-2xl font-bold mb-1">Set new password</h2>
          <p className="text-pp-muted mb-6 text-sm">
            Choose a new password for your AZR PRINT&apos;S account.
          </p>

          {!ready && <p className="text-sm text-pp-muted">Checking reset link…</p>}

          {ready && !hasSession && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                This reset link is invalid or expired. Request a new one.
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-pp-accent px-4 text-white font-semibold"
              >
                Request new link
              </Link>
            </div>
          )}

          {ready && hasSession && (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="password">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="confirm">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-[#b91c1c] disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

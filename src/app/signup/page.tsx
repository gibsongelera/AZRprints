"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [college, setCollege] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          student_id: studentId,
          college,
          role: "user",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/user/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. Check your email to confirm, then sign in. If email confirmation is disabled, you can log in now."
    );
    setLoading(false);
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
          <h2 className="text-2xl font-bold mb-1">Join AZR PRINT&apos;S</h2>
          <p className="text-pp-muted mb-6 text-sm">
            Register to submit print jobs online.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {message}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input
                required
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ZPPSU ID</label>
              <input
                required
                placeholder="ZPPSU-2024-0000"
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">College</label>
              <input
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-pp-muted mt-6 text-sm">
            Already registered?{" "}
            <Link href="/login" className="text-pp-accent font-medium underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

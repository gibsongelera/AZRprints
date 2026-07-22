"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UserProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setCollege(data.college || "");
        setStudentId(data.student_id || "");
      }
    })();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase
      .from("profiles")
      .update({
        name,
        phone,
        college,
        student_id: studentId,
      })
      .eq("id", user.id);
    if (err) setError(err.message);
    else setMsg("Profile saved.");
  }

  return (
    <form
      onSubmit={onSave}
      className="max-w-lg rounded-xl border border-pp-border bg-white p-5 space-y-3"
    >
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input
          disabled
          className="w-full min-h-11 rounded-lg border border-pp-border px-3 bg-slate-50"
          value={email}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Student ID</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">College</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Phone</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4"
      >
        Save Profile
      </button>
    </form>
  );
}

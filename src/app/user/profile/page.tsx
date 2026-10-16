"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/AvatarUploader";
import { useToast } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";

type ProfileForm = {
  email: string;
  name: string;
  phone: string;
  college: string;
  studentId: string;
  avatarUrl: string | null;
};

export default function UserProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!active) return;
      setForm({
        email: user.email || "",
        name: data?.name || "",
        phone: data?.phone || "",
        college: data?.college || "",
        studentId: data?.student_id || "",
        avatarUrl: data?.avatar_url || null,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toast.error("Session expired", "Sign in again to save your profile.");
      return;
    }
    const { error: err } = await supabase
      .from("profiles")
      .update({
        name: form.name,
        phone: form.phone,
        college: form.college,
        student_id: form.studentId,
      })
      .eq("id", user.id);
    setSaving(false);
    if (err) {
      toast.error("Couldn't save profile", err.message);
      return;
    }
    toast.success("Profile saved");
    router.refresh();
  }

  if (!form) return <p className="text-pp-muted">Loading profile…</p>;

  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div className="max-w-lg space-y-4">
      <section className="rounded-xl border border-pp-border bg-white p-5">
        <AvatarUploader name={form.name || form.email} initialUrl={form.avatarUrl} />
      </section>

      <form
        onSubmit={onSave}
        className="rounded-xl border border-pp-border bg-white p-5 space-y-3"
      >
        <h2 className="font-semibold">Personal details</h2>
        <div>
          <label htmlFor="p-email" className="block text-sm mb-1">Email</label>
          <input
            id="p-email"
            disabled
            className="w-full min-h-11 rounded-lg border border-pp-border px-3 bg-slate-50"
            value={form.email}
          />
        </div>
        <div>
          <label htmlFor="p-name" className="block text-sm mb-1">Name</label>
          <input
            id="p-name"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={form.name}
            onChange={set("name")}
          />
        </div>
        <div>
          <label htmlFor="p-sid" className="block text-sm mb-1">Student ID</label>
          <input
            id="p-sid"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={form.studentId}
            onChange={set("studentId")}
          />
        </div>
        <div>
          <label htmlFor="p-college" className="block text-sm mb-1">College</label>
          <input
            id="p-college"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={form.college}
            onChange={set("college")}
          />
        </div>
        <div>
          <label htmlFor="p-phone" className="block text-sm mb-1">Phone</label>
          <input
            id="p-phone"
            inputMode="tel"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={form.phone}
            onChange={set("phone")}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

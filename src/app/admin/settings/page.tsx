"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminSettingsPage() {
  const [shopName, setShopName] = useState("");
  const [tagline, setTagline] = useState("");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setShopName(data.shop_name || "");
        setTagline(data.tagline || "");
        setOpenTime(data.open_time || "07:00");
        setCloseTime(data.close_time || "18:00");
      });
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: shopName,
        tagline,
        open_time: openTime,
        close_time: closeTime,
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Save failed");
    else setMsg("Settings saved.");
  }

  return (
    <form
      onSubmit={onSave}
      className="max-w-lg rounded-xl border border-pp-border bg-white p-5 space-y-3"
    >
      <div>
        <label className="block text-sm mb-1">Shop name</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Tagline</label>
        <input
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Open</label>
          <input
            type="time"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Close</label>
          <input
            type="time"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4"
      >
        Save Settings
      </button>
    </form>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPricingPage() {
  const [documentBw, setDocumentBw] = useState("2");
  const [documentColor, setDocumentColor] = useState("5");
  const [photo, setPhoto] = useState("10");
  const [largeFormat, setLargeFormat] = useState("50");
  const [binding, setBinding] = useState("25");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pricing")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setDocumentBw(String(data.document_bw));
        setDocumentColor(String(data.document_color));
        setPhoto(String(data.photo));
        setLargeFormat(String(data.large_format));
        setBinding(String(data.binding));
      });
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_bw: Number(documentBw),
        document_color: Number(documentColor),
        photo: Number(photo),
        large_format: Number(largeFormat),
        binding: Number(binding),
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Save failed");
    else setMsg("Pricing saved (₱ PHP).");
  }

  return (
    <form
      onSubmit={onSave}
      className="max-w-lg rounded-xl border border-pp-border bg-white p-5 space-y-3"
    >
      <p className="text-sm text-pp-muted">
        Payments are handled by PayMongo. Configure print rates here.
      </p>
      {[
        ["Document B&W / page", documentBw, setDocumentBw],
        ["Document Color / page", documentColor, setDocumentColor],
        ["Photo (per print)", photo, setPhoto],
        ["Large format", largeFormat, setLargeFormat],
        ["Binding", binding, setBinding],
      ].map(([label, value, setter]) => (
        <div key={label as string}>
          <label className="block text-sm mb-1">{label as string}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={value as string}
            onChange={(e) =>
              (setter as (v: string) => void)(e.target.value)
            }
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4"
      >
        Save Pricing
      </button>
    </form>
  );
}

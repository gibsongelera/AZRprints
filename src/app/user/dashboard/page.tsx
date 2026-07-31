"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeUploadContent } from "@/lib/content-analysis";
import { formatPHP } from "@/lib/format";
import { calculateOrderBreakdown } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import type { OrderColor, OrderType, Pricing } from "@/lib/types";

export default function UserDashboardPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [type, setType] = useState<OrderType>("document");
  const [color, setColor] = useState<OrderColor>("bw");
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState(1);
  const [documentPages, setDocumentPages] = useState(0);
  const [photoPages, setPhotoPages] = useState(0);
  const [pageLabel, setPageLabel] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pricing")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setPricing(data as Pricing);
      });
  }, []);

  const breakdown = useMemo(() => {
    if (!pricing) return null;
    return calculateOrderBreakdown(
      pricing,
      type,
      color,
      pages,
      copies,
      documentPages,
      photoPages
    );
  }, [pricing, type, color, pages, copies, documentPages, photoPages]);

  const amount = breakdown?.total ?? 0;

  const onFileChange = useCallback(async (f: File | null) => {
    setFile(f);
    setPageLabel("");
    if (!f) {
      setPages(1);
      setDocumentPages(0);
      setPhotoPages(0);
      return;
    }
    setAnalyzing(true);
    setPageLabel("analyzing…");
    try {
      const result = await analyzeUploadContent(f);
      setPages(result.totalPages);
      setDocumentPages(result.documentPages);
      setPhotoPages(result.photoPages);
      setPageLabel(result.label);
      if (f.type.startsWith("image/") || result.photoPages > result.documentPages) {
        setType("photo");
      } else if (result.isMixed) {
        setType("document");
      }
    } catch {
      setPages(1);
      setDocumentPages(1);
      setPhotoPages(0);
      setPageLabel("default");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  async function submitOrder() {
    setError("");
    setStatusMsg("");
    if (!file) {
      setError("Please upload a file.");
      return;
    }
    if (!agree) {
      setError("Please agree to the terms.");
      return;
    }
    if (analyzing) {
      setError("Please wait for file analysis to finish.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("color", color);
      form.append("pages", String(pages));
      form.append("copies", String(copies));
      form.append("document_pages", String(documentPages));
      form.append("photo_pages", String(photoPages));
      form.append("content_label", pageLabel);

      const createRes = await fetch("/api/orders", { method: "POST", body: form });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error || "Could not create order");
      }

      const orderId = createJson.order.id as string;
      setStatusMsg(`Order ${orderId} created. Opening PayMongo checkout…`);

      const payRes = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const payText = await payRes.text();
      let payJson: { error?: string; checkoutUrl?: string } = {};
      try {
        payJson = payText ? JSON.parse(payText) : {};
      } catch {
        throw new Error(
          payRes.ok
            ? "Invalid checkout response"
            : `Checkout failed (${payRes.status}). Is the dev server up to date? Restart npm run dev.`
        );
      }
      if (!payRes.ok) {
        throw new Error(payJson.error || `Checkout failed (${payRes.status})`);
      }
      if (!payJson.checkoutUrl) {
        throw new Error("PayMongo did not return a checkout URL");
      }

      window.location.assign(payJson.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-pp-border bg-white p-4">
          <div className="text-xs text-pp-muted">Document B&W</div>
          <div className="font-semibold">
            {pricing ? formatPHP(pricing.document_bw) : "—"}/page
          </div>
        </div>
        <div className="rounded-xl border border-pp-border bg-white p-4">
          <div className="text-xs text-pp-muted">Photo</div>
          <div className="font-semibold">
            {pricing ? formatPHP(pricing.photo) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-pp-border bg-white p-4">
          <div className="text-xs text-pp-muted">Large format</div>
          <div className="font-semibold">
            {pricing ? formatPHP(pricing.large_format) : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-pp-border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Printing Type</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["document", "photo", "large"] as OrderType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`min-h-11 rounded-lg border text-sm font-medium capitalize ${
                type === t
                  ? "border-pp-accent bg-red-50 text-pp-accent"
                  : "border-pp-border"
              }`}
            >
              {t === "large" ? "Large format" : t}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Color</label>
            <select
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={color}
              onChange={(e) => setColor(e.target.value as OrderColor)}
              disabled={type !== "document"}
            >
              <option value="bw">Black &amp; White</option>
              <option value="color">Color</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">
              Pages {pageLabel ? `(${pageLabel})` : ""}
            </label>
            <input
              type="number"
              min={1}
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={pages}
              onChange={(e) => setPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Copies</label>
            <input
              type="number"
              min={1}
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
        </div>

        {type === "document" && (documentPages > 0 || photoPages > 0) && (
          <div className="rounded-lg border border-dashed border-pp-border bg-slate-50 p-3 text-sm space-y-1">
            <div className="font-medium text-pp-muted">Content breakdown</div>
            <div className="flex flex-wrap gap-3">
              <span>Text pages: {documentPages}</span>
              <span>Photo pages: {photoPages}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Upload file (PDF, DOCX, images)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="w-full text-sm"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          {file && (
            <p className="text-xs text-pp-muted mt-1">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
              {analyzing ? " · analyzing…" : ""}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-slate-50 border border-pp-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Estimated total</span>
            <span className="text-xl font-bold text-pp-accent">{formatPHP(amount)}</span>
          </div>
          {breakdown && breakdown.lines.length > 1 && (
            <ul className="text-xs text-pp-muted space-y-0.5 border-t border-pp-border pt-2">
              {breakdown.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-2">
                  <span>
                    {line.label} × {line.quantity} @ {formatPHP(line.unitPrice)}
                  </span>
                  <span>{formatPHP(line.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>
            I confirm this file is ready to print and agree to pay securely via
            PayMongo (InstaPay QR Ph, GCash, Maya, or card).
          </span>
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {statusMsg && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {statusMsg}
          </div>
        )}

        <button
          type="button"
          disabled={loading || !file || !agree || analyzing}
          onClick={submitOrder}
          className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-[#b91c1c] disabled:opacity-50"
        >
          {loading ? "Processing…" : "Submit & Pay — InstaPay / GCash"}
        </button>
      </div>
    </div>
  );
}

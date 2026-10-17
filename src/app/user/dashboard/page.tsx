"use client";

import {
  FileText,
  ImageIcon,
  Info,
  Palette,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/feedback";
import { analyzeUploadContent } from "@/lib/content-analysis";
import { formatPHP } from "@/lib/format";
import { calculateOrderBreakdown } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import type { OrderColor, OrderType, Pricing } from "@/lib/types";

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}
function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

const TYPE_OPTIONS: {
  value: OrderType;
  title: string;
  body: string;
  icon: typeof FileText;
}[] = [
  {
    value: "document",
    title: "Document",
    body: "Reports, modules, forms, assignments. Pages with pictures are detected and charged at the photo rate.",
    icon: FileText,
  },
  {
    value: "photo",
    title: "Photo",
    body: "Photo prints from JPG or PNG images. Charged per print.",
    icon: ImageIcon,
  },
];

export default function UserDashboardPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [reviewOpen, setReviewOpen] = useState(false);

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
  const formatWarning = !!file && type === "document" && !isPdf(file);

  const onFileChange = useCallback(
    async (f: File | null) => {
      setFile(f);
      setPageLabel("");
      setError("");
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
        if (isImage(f) || result.photoPages > result.documentPages) {
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
    },
    []
  );

  function openReview() {
    setError("");
    if (!file) {
      setError("Upload the file you want to print.");
      return;
    }
    if (!agree) {
      setError("Tick the confirmation box to continue.");
      return;
    }
    if (analyzing) {
      setError("Please wait while we finish counting the pages.");
      return;
    }
    setReviewOpen(true);
  }

  function chooseAnotherFile() {
    setReviewOpen(false);
    fileInputRef.current?.click();
  }

  async function submitOrder() {
    if (!file) return;
    setError("");
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
      toast.info("Order created", `${orderId} — opening secure checkout…`);

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
            : `Checkout failed (${payRes.status}). Your order was saved — retry from My Orders.`
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
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error("Payment didn't start", msg);
      setReviewOpen(false);
      setLoading(false);
    }
  }

  const priceCards = [
    {
      label: "Document, black & white",
      value: pricing ? `${formatPHP(pricing.document_bw)}` : "—",
      unit: "per page",
      icon: FileText,
      cls: "border-slate-300 bg-gradient-to-br from-slate-50 to-white",
      chip: "bg-slate-900 text-white",
    },
    {
      label: "Document, color",
      value: pricing ? `${formatPHP(pricing.document_color)}` : "—",
      unit: "per page",
      icon: Palette,
      cls: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
      chip: "bg-sky-600 text-white",
    },
    {
      label: "Photo",
      value: pricing ? `${formatPHP(pricing.photo)}` : "—",
      unit: "per print or photo page",
      icon: ImageIcon,
      cls: "border-rose-200 bg-gradient-to-br from-rose-50 to-white",
      chip: "bg-rose-500 text-white",
    },
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {priceCards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.chip}`}
              aria-hidden
            >
              <c.icon className="h-4 w-4" />
            </span>
            <div className="mt-3 text-sm text-pp-muted">{c.label}</div>
            <div className="text-xl font-bold">{c.value}</div>
            <div className="text-xs text-pp-muted">{c.unit}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-pp-border bg-white p-5 space-y-5">
        <fieldset>
          <legend className="font-semibold">What are you printing?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TYPE_OPTIONS.map((opt) => {
              const selected = type === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pp-accent ${
                    selected
                      ? "border-pp-accent bg-red-50/60"
                      : "border-pp-border hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="print-type"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setType(opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-pp-accent text-white" : "bg-slate-100 text-pp-muted"
                    }`}
                    aria-hidden
                  >
                    <opt.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{opt.title}</span>
                    <span className="mt-0.5 block text-sm text-pp-muted">{opt.body}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-pp-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
            <span>
              Printing a lot of documents that include photos? Choose{" "}
              <strong className="text-pp-primary">Document</strong> and combine them
              into one PDF. We count text pages and photo pages separately, so the photo
              rate only applies to pages with pictures.
            </span>
          </p>
        </fieldset>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="o-color" className="block text-sm mb-1">Color</label>
            <select
              id="o-color"
              className="w-full min-h-11 rounded-lg border border-pp-border px-3 disabled:bg-slate-50"
              value={color}
              onChange={(e) => setColor(e.target.value as OrderColor)}
              disabled={type !== "document"}
            >
              <option value="bw">Black &amp; White</option>
              <option value="color">Color</option>
            </select>
          </div>
          <div>
            <label htmlFor="o-pages" className="block text-sm mb-1">
              Pages {pageLabel ? `(${pageLabel})` : ""}
            </label>
            <input
              id="o-pages"
              type="number"
              min={1}
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={pages}
              onChange={(e) => setPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div>
            <label htmlFor="o-copies" className="block text-sm mb-1">Copies</label>
            <input
              id="o-copies"
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
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="o-file" className="text-sm">Upload file</label>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              PDF recommended
            </span>
          </div>
          <div className="w-full min-h-11 rounded-lg border border-pp-border bg-white px-3 py-2.5">
            <input
              id="o-file"
              ref={fileInputRef}
              type="file"
              accept={type === "photo" ? "image/*,.pdf" : ".pdf,.doc,.docx,image/*"}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-pp-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:cursor-pointer cursor-pointer"
              onChange={(e) => void onFileChange(e.target.files?.[0] || null)}
            />
          </div>
          {file && (
            <p className="text-xs text-pp-muted mt-2">
              {file.name}, {(file.size / 1024).toFixed(1)} KB
              {analyzing ? ", counting pages…" : ""}
            </p>
          )}
          {formatWarning && (
            <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>
                <strong>This isn&apos;t a PDF.</strong> Word files can print with different
                fonts, margins or page breaks than on your computer, which can mess up
                your template. For an exact print, save it as PDF first (in Word: File,
                Save As, PDF) and upload that instead.
              </span>
            </div>
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
            I confirm this file is ready to print and agree to pay securely online
            (InstaPay QR Ph, GCash, Maya, or card).
          </span>
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading || !file || !agree || analyzing}
          onClick={openReview}
          className="w-full min-h-11 rounded-lg bg-pp-accent text-white font-semibold hover:bg-pp-accent-hover disabled:opacity-50"
        >
          {loading ? "Processing…" : "Review & pay"}
        </button>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => !loading && setReviewOpen(false)}
        title="Review your order"
        description="Check the details before you pay."
        size="md"
        footer={
          <>
            {formatWarning ? (
              <button
                type="button"
                disabled={loading}
                onClick={chooseAnotherFile}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pp-border bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" aria-hidden />
                Choose a PDF instead
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => setReviewOpen(false)}
                className="min-h-11 rounded-lg border border-pp-border bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Edit order
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => void submitOrder()}
              className="min-h-11 rounded-lg bg-pp-accent px-4 text-sm font-semibold text-white hover:bg-pp-accent-hover disabled:opacity-60"
            >
              {loading
                ? "Opening checkout…"
                : formatWarning
                  ? `Continue anyway, pay ${formatPHP(amount)}`
                  : `Pay ${formatPHP(amount)}`}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          {formatWarning && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>
                You&apos;re uploading a <strong>{file?.name.split(".").pop()?.toUpperCase()}</strong>{" "}
                file. PDF is highly recommended so your layout prints exactly as designed.
              </span>
            </div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-pp-muted">File</dt>
            <dd className="truncate font-medium" title={file?.name}>{file?.name}</dd>
            <dt className="text-pp-muted">Print type</dt>
            <dd className="font-medium capitalize">
              {type}
              {type === "document" ? (color === "color" ? ", color" : ", black & white") : ""}
            </dd>
            <dt className="text-pp-muted">Pages × copies</dt>
            <dd className="font-medium">
              {pages} × {copies}
            </dd>
          </dl>
          {breakdown && (
            <ul className="space-y-1 border-t border-pp-border pt-3">
              {breakdown.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-2 text-pp-muted">
                  <span>
                    {line.label} × {line.quantity}
                  </span>
                  <span className="tnum">{formatPHP(line.subtotal)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-2 border-t border-pp-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tnum text-pp-accent">{formatPHP(amount)}</span>
              </li>
            </ul>
          )}
          <div className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="font-semibold">Pay to AZR PRINT&apos;S</p>
              <p className="text-pp-muted">
                ZPPSU Printing Services. You&apos;ll finish payment on PayMongo&apos;s secure
                checkout (InstaPay QR Ph, GCash, Maya or card), then come back here
                automatically.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

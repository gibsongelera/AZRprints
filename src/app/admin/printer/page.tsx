"use client";

import { FormEvent, useEffect, useState } from "react";
import { PrintQueue } from "@/components/PrintQueue";
import { useToast } from "@/components/ui/feedback";
import type { PrinterSettings } from "@/lib/types";

async function fetchPrinterSettings(): Promise<{
  settings: PrinterSettings | null;
  error: string;
  notice: string;
}> {
  try {
    const res = await fetch("/api/admin/printer", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.settings) {
      return {
        settings: null,
        error: json.error || `Couldn't load printer settings (error ${res.status}).`,
        notice: "",
      };
    }
    return { settings: json.settings as PrinterSettings, error: "", notice: json.notice || "" };
  } catch {
    return {
      settings: null,
      error: "Couldn't reach the server. Check your connection and try again.",
      notice: "",
    };
  }
}

export default function AdminPrinterPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPrinterSettings().then((res) => {
      if (!active) return;
      setSettings(res.settings);
      setLoadError(res.error);
      setNotice(res.notice);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function retry() {
    setLoading(true);
    fetchPrinterSettings().then((res) => {
      setSettings(res.settings);
      setLoadError(res.error);
      setNotice(res.notice);
      setLoading(false);
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/admin/printer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't save printer settings", json.error);
      return;
    }
    setSettings(json.settings);
    setNotice("");
    toast.success("Printer settings saved");
  }

  if (loading) {
    return <p className="text-sm text-pp-muted">Loading printer settings…</p>;
  }

  if (!settings) {
    return (
      <div role="alert" className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
        <p className="font-semibold text-red-800">Printer settings didn&apos;t load</p>
        <p className="text-sm text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={retry}
          className="min-h-10 rounded-lg bg-pp-accent px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-4">
        {notice && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {notice}
          </div>
        )}
        <p className="text-sm text-pp-muted">
          Configure automatic queuing after PayMongo payment. The local print worker on
          the shop laptop polls Supabase and sends jobs to the default printer.
        </p>
        <form
          onSubmit={onSave}
          className="rounded-xl border border-pp-border bg-white p-5 space-y-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.auto_print_enabled}
              onChange={(e) =>
                setSettings({ ...settings, auto_print_enabled: e.target.checked })
              }
            />
            Auto-queue print jobs when payment is confirmed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.direct_print_enabled}
              onChange={(e) =>
                setSettings({ ...settings, direct_print_enabled: e.target.checked })
              }
            />
            Allow direct printer integration (local worker)
          </label>
          <div>
            <label className="block text-sm mb-1">Default printer name (optional)</label>
            <input
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              placeholder="Leave blank for system default"
              value={settings.default_printer_name}
              onChange={(e) =>
                setSettings({ ...settings, default_printer_name: e.target.value })
              }
            />
            <p className="text-xs text-pp-muted mt-1">
              Must match the name shown in Windows Settings → Printers or{" "}
              <code className="text-xs">Get-Printer</code> in PowerShell.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Worker poll (seconds)</label>
              <input
                type="number"
                min={5}
                max={300}
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={settings.poll_interval_seconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    poll_interval_seconds: parseInt(e.target.value, 10) || 15,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Max retries</label>
              <input
                type="number"
                min={0}
                max={10}
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={settings.max_job_retries}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_job_retries: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Spool retention (hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                className="w-full min-h-11 rounded-lg border border-pp-border px-3"
                value={settings.spool_retention_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    spool_retention_hours: parseInt(e.target.value, 10) || 24,
                  })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-pp-accent px-5 text-white font-semibold hover:bg-pp-accent-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save printer settings"}
          </button>
        </form>
      </div>
      <PrintQueue />
    </div>
  );
}

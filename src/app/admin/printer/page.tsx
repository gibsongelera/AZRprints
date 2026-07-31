"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PrinterSettings } from "@/lib/types";

export default function AdminPrinterPage() {
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/printer")
      .then((r) => r.json())
      .then((json) => {
        if (json.settings) setSettings(json.settings as PrinterSettings);
      })
      .catch(() => setError("Could not load printer settings"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/printer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Save failed");
    else {
      setSettings(json.settings);
      setMsg("Printer settings saved.");
    }
  }

  if (!settings) {
    return (
      <p className="text-sm text-pp-muted">
        {error || "Loading printer settings… (run migration 002 if this hangs)"}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
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
                  max_job_retries: parseInt(e.target.value, 10) || 3,
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
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {msg && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {msg}
          </div>
        )}
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-pp-accent px-5 text-white font-semibold hover:bg-[#b91c1c]"
        >
          Save printer settings
        </button>
      </form>
    </div>
  );
}

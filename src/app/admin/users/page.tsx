"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Profile, UserRole } from "@/lib/types";

type AdminUser = Pick<
  Profile,
  "id" | "name" | "role" | "student_id" | "college" | "department" | "phone" | "created_at"
> & { email: string | null };

const emptyForm = {
  email: "",
  password: "",
  name: "",
  role: "user" as UserRole,
  student_id: "",
  college: "",
  department: "",
  phone: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load users");
      setUsers([]);
    } else {
      setUsers(json.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
    setModal("create");
  }

  function openEdit(u: AdminUser) {
    setForm({
      email: u.email || "",
      password: "",
      name: u.name || "",
      role: u.role,
      student_id: u.student_id || "",
      college: u.college || "",
      department: u.department || "",
      phone: u.phone || "",
    });
    setFormError("");
    setEditingId(u.id);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      role: form.role,
      student_id: form.student_id.trim() || null,
      college: form.college.trim() || null,
      department: form.department.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim(),
      ...(form.password ? { password: form.password } : {}),
    };

    const res =
      modal === "create"
        ? await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, password: form.password }),
          })
        : await fetch(`/api/admin/users/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(json.error || "Save failed");
      return;
    }

    if (modal === "create") {
      setUsers((prev) => [json.user as AdminUser, ...prev]);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingId ? (json.user as AdminUser) : u)),
      );
    }
    closeModal();
  }

  async function onDelete(u: AdminUser) {
    const label = u.name || u.email || u.id;
    if (!confirm(`Delete user "${label}"? Their orders and files will be removed.`)) return;

    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Delete failed");
      return;
    }
    setUsers((prev) => prev.filter((row) => row.id !== u.id));
  }

  if (loading) return <p className="text-pp-muted">Loading…</p>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pp-muted">
          Create accounts, change roles, and remove users. Requires{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          on the server.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-10 rounded-lg bg-pp-accent text-white font-semibold px-4 text-sm"
        >
          Add user
        </button>
      </div>

      <div className="rounded-xl border border-pp-border bg-white overflow-hidden">
        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">ZPPSU ID</th>
                <th className="px-3 py-2">College / Dept</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-pp-border">
                  <td className="px-3 py-2 font-medium">{u.name || "—"}</td>
                  <td className="px-3 py-2">{u.email || "—"}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">{u.student_id || "—"}</td>
                  <td className="px-3 py-2">
                    {[u.college, u.department].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">{u.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-pp-accent font-medium hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(u)}
                        className="text-red-600 font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && !error && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-pp-muted">
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-pp-border bg-white p-5 shadow-lg">
            <h2 id="user-modal-title" className="text-lg font-bold mb-4">
              {modal === "create" ? "Add user" : "Edit user"}
            </h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Password {modal === "edit" && "(leave blank to keep)"}
                </label>
                <input
                  type="password"
                  minLength={modal === "create" ? 6 : undefined}
                  required={modal === "create"}
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Full name</label>
                <input
                  required
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as UserRole }))
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">ZPPSU ID</label>
                <input
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.student_id}
                  onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">College</label>
                <input
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.college}
                  onChange={(e) => setForm((f) => ({ ...f, college: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Department</label>
                <input
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input
                  className="w-full min-h-10 rounded-lg border border-pp-border px-3"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-10 rounded-lg bg-pp-accent text-white font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving…" : modal === "create" ? "Create user" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="min-h-10 rounded-lg border border-pp-border px-4 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

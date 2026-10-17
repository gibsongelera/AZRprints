"use client";

import { Search, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { RowAction, RowActions } from "@/components/ui/RowActions";
import { useConfirm, useToast } from "@/components/ui/feedback";
import type { ExportSpec } from "@/lib/export";
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

async function fetchUsers(): Promise<{ users: AdminUser[]; error: string }> {
  const res = await fetch("/api/admin/users");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { users: [], error: json.error || "Failed to load users" };
  return { users: json.users || [], error: "" };
}

export default function AdminUsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    fetchUsers().then((res) => {
      if (!active) return;
      setUsers(res.users);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

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
      toast.success("User created", `${payload.name || payload.email} can now sign in.`);
    } else {
      toast.success("Changes saved", payload.name || payload.email);
      setUsers((prev) =>
        prev.map((u) => (u.id === editingId ? (json.user as AdminUser) : u)),
      );
    }
    closeModal();
  }

  async function onDelete(u: AdminUser) {
    const label = u.name || u.email || u.id;
    const ok = await confirm({
      title: `Delete ${label}?`,
      message: "Their account, orders and uploaded files will be removed. This can't be undone.",
      confirmLabel: "Delete user",
      tone: "danger",
    });
    if (!ok) return;

    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error("Couldn't delete user", json.error);
      return;
    }
    setUsers((prev) => prev.filter((row) => row.id !== u.id));
    toast.success("User deleted", label);
  }

  const visible = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (!q.trim()) return true;
    const hay = `${u.name} ${u.email} ${u.student_id} ${u.college} ${u.department}`.toLowerCase();
    return hay.includes(q.toLowerCase().trim());
  });

  const exportSpec = (): ExportSpec<AdminUser> => ({
    filename: "azr-users",
    title: "Users",
    subtitle: roleFilter === "all" ? "All accounts" : roleFilter === "admin" ? "Admins" : "Students",
    sheetName: "Users",
    rows: visible,
    columns: [
      { header: "Name", value: (u) => u.name, width: 24 },
      { header: "Email", value: (u) => u.email, width: 30 },
      { header: "Role", value: (u) => (u.role === "admin" ? "Admin" : "Student"), width: 10 },
      { header: "ZPPSU ID", value: (u) => u.student_id, width: 18 },
      { header: "College", value: (u) => u.college, width: 14 },
      { header: "Department", value: (u) => u.department, width: 16 },
      { header: "Phone", value: (u) => u.phone, width: 16 },
      { header: "Joined", value: (u) => u.created_at, type: "date", width: 12 },
    ],
    summary: [
      { label: "Accounts", value: String(visible.length) },
      { label: "Students", value: String(visible.filter((u) => u.role === "user").length) },
      { label: "Admins", value: String(visible.filter((u) => u.role === "admin").length) },
    ],
  });

  if (loading) return <p className="text-pp-muted">Loading users…</p>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label htmlFor="u-search" className="sr-only">Search users</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pp-muted" aria-hidden />
            <input
              id="u-search"
              type="search"
              placeholder="Search name, email or ID"
              className="min-h-10 w-64 max-w-full rounded-lg border border-pp-border bg-white pl-9 pr-3 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label htmlFor="u-role" className="sr-only">Role</label>
          <select
            id="u-role"
            className="min-h-10 rounded-lg border border-pp-border bg-white px-3 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          >
            <option value="all">All roles ({users.length})</option>
            <option value="user">Students ({users.filter((u) => u.role === "user").length})</option>
            <option value="admin">Admins ({users.filter((u) => u.role === "admin").length})</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu getSpec={exportSpec} disabled={!visible.length} />
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pp-accent text-white font-semibold px-4 text-sm"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Add user
          </button>
        </div>
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
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className="border-t border-pp-border">
                  <td className="px-3 py-2 font-medium">{u.name || "—"}</td>
                  <td className="px-3 py-2">{u.email || "—"}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">{u.student_id || "—"}</td>
                  <td className="px-3 py-2">
                    {[u.college, u.department].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">{u.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <RowActions>
                      <RowAction
                        kind="edit"
                        label="Edit user"
                        ariaLabel={`Edit ${u.name || u.email || "user"}`}
                        onClick={() => openEdit(u)}
                      />
                      <RowAction
                        kind="delete"
                        label="Delete user"
                        ariaLabel={`Delete ${u.name || u.email || "user"}`}
                        onClick={() => void onDelete(u)}
                      />
                    </RowActions>
                  </td>
                </tr>
              ))}
              {!visible.length && !error && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-pp-muted">
                    {users.length ? "No users match your search." : "No users yet."}
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
                  <option value="user">Student</option>
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

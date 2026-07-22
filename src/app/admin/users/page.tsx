import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, role, student_id, college, department, phone, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-xl border border-pp-border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Student / Staff ID</th>
              <th className="px-4 py-2">College / Dept</th>
              <th className="px-4 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} className="border-t border-pp-border">
                <td className="px-4 py-2 font-medium">{u.name || "—"}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.student_id || "—"}</td>
                <td className="px-4 py-2">{u.college || u.department || "—"}</td>
                <td className="px-4 py-2">{u.phone || "—"}</td>
              </tr>
            ))}
            {!users?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-pp-muted">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

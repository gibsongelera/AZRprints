import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") redirect("/admin/dashboard");

  return (
    <AppShell role="user" name={profile?.name || user.email || "User"}>
      {children}
    </AppShell>
  );
}

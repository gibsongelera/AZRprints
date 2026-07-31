"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string };

const TITLE_MAP: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Manage Orders",
  "/admin/users": "Manage Users",
  "/admin/pricing": "Pricing",
  "/admin/printer": "Printer",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
  "/user/dashboard": "New Order",
  "/user/orders": "My Orders",
  "/user/profile": "Profile",
};

export function AppShell({
  role,
  name,
  children,
}: {
  role: "admin" | "user";
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const title = TITLE_MAP[pathname] || "AZR PRINT'S";

  const adminNav: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/orders", label: "Manage Orders" },
    { href: "/admin/users", label: "Manage Users" },
    { href: "/admin/pricing", label: "Pricing" },
    { href: "/admin/printer", label: "Printer" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/profile", label: "Profile" },
  ];

  const userNav: NavItem[] = [
    { href: "/user/dashboard", label: "New Order" },
    { href: "/user/orders", label: "My Orders" },
    { href: "/user/profile", label: "Profile" },
  ];

  const nav = role === "admin" ? adminNav : userNav;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-pp-bg">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-pp-primary-dark text-white transform transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/20">
          <Link href={role === "admin" ? "/admin/dashboard" : "/user/dashboard"} className="flex items-center gap-2 text-white">
            <Image
              src="/assets/azr-prints-logo.png"
              alt="AZR PRINT'S"
              width={36}
              height={36}
              className="rounded"
            />
            <div>
              <div className="brand-title font-bold text-sm">AZR PRINT&apos;S</div>
              <small className="text-white/50">
                {role === "admin" ? "Admin Portal" : "Student Portal"}
              </small>
            </div>
          </Link>
        </div>
        <nav className="flex flex-col py-3 gap-0.5 px-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-pp-accent text-white" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="mt-2 text-left rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
          >
            Logout
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-pp-border px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden rounded-lg border border-pp-border px-3 py-2 text-sm"
              onClick={() => setOpen(true)}
            >
              Menu
            </button>
            <h1 className="text-lg font-semibold text-pp-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-pp-muted">{name}</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pp-accent text-white text-xs font-bold">
              {initials}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

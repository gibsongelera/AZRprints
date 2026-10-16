"use client";

import {
  Bell,
  ClipboardList,
  FilePlus2,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Printer,
  Settings,
  Tag,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

type NavItem = { href: string; label: string; icon: typeof Bell };
type NavGroup = { label: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Print shop",
    items: [
      { href: "/admin/orders", label: "Manage Orders", icon: ClipboardList },
      { href: "/admin/files", label: "Order Files", icon: FolderOpen },
      { href: "/admin/printer", label: "Printer", icon: Printer },
      { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/users", label: "Manage Users", icon: Users },
      { href: "/admin/pricing", label: "Pricing", icon: Tag },
      { href: "/admin/notifications", label: "Notifications", icon: Megaphone },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/admin/profile", label: "Profile", icon: UserRound }],
  },
];

const USER_NAV: NavGroup[] = [
  {
    label: "Printing",
    items: [
      { href: "/user/dashboard", label: "New Order", icon: FilePlus2 },
      { href: "/user/orders", label: "My Orders", icon: ClipboardList },
    ],
  },
  {
    label: "Help",
    items: [
      { href: "/user/tickets", label: "Support", icon: LifeBuoy },
      { href: "/user/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/user/profile", label: "Profile", icon: UserRound }],
  },
];

function titleFor(pathname: string, groups: NavGroup[]) {
  for (const g of groups) {
    for (const it of g.items) {
      if (pathname === it.href || pathname.startsWith(`${it.href}/`)) return it.label;
    }
  }
  return "AZR PRINT'S";
}

export function AppShell({
  role,
  userId,
  name,
  email,
  avatarUrl,
  children,
}: {
  role: UserRole;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const groups = role === "admin" ? ADMIN_NAV : USER_NAV;
  const title = titleFor(pathname, groups);

  const logout = useCallback(async () => {
    const ok = await confirm({
      title: "Log out of AZR PRINT'S?",
      message: "You'll need to sign in again to place or track print orders.",
      confirmLabel: "Yes, log out",
      cancelLabel: "No, stay",
      tone: "danger",
    });
    if (!ok) return;
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      toast.error("Couldn't log out", error.message);
      return;
    }
    toast.success("Logged out", "See you next time.");
    router.replace("/login");
    router.refresh();
  }, [confirm, router, toast]);

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
        className={`fixed z-40 inset-y-0 left-0 flex w-64 flex-col bg-pp-primary-dark text-white transform transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/15 p-4">
          <Link
            href={role === "admin" ? "/admin/dashboard" : "/user/dashboard"}
            className="flex items-center gap-2 text-white"
          >
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-white/40">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        active
                          ? "bg-pp-accent text-white"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout always sits at the very bottom of the sidebar */}
        <div className="border-t border-white/15 p-2">
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/80 hover:bg-red-600/20 hover:text-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-pp-border bg-white px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-pp-border lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <h1 className="truncate text-lg font-semibold text-pp-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell userId={userId} role={role} />
            <ProfileMenu
              role={role}
              name={name}
              email={email}
              avatarUrl={avatarUrl}
              onLogout={() => void logout()}
            />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

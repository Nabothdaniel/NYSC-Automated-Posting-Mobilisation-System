"use client";

import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLE_LABEL, type Notification, type Role } from "@/lib/types";
import { InfoHint } from "./InfoHint";

interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  corps_member: [
    { href: "/member/dashboard", label: "My Dashboard", hint: "See your current registration and posting progress", icon: LayoutDashboard },
    { href: "/member/profile", label: "My Details & Documents", hint: "Fill in your personal details, NIN, school info, and upload your photo & certificate", icon: UserCheck },
    { href: "/member/preferences", label: "Choose Preferred States", hint: "Pick up to 4 states you would like to serve in and view state safety levels", icon: MapPin },
    { href: "/member/allocation", label: "My State Posting", hint: "See your assigned state, orientation camp, call-up number, and why you were posted there", icon: Cpu },
    { href: "/member/ppa", label: "My Primary Assignment (PPA)", hint: "View the workplace matched to your course of study", icon: Building2 },
    { href: "/member/letters", label: "Download Letters", hint: "Download and print your official Call-Up and Posting letters", icon: FileText },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Overview Dashboard", hint: "Summary of registrations, postings, camp space, and safety alerts", icon: LayoutDashboard },
    { href: "/admin/allocation", label: "State Posting Engine", hint: "Set posting priorities and run automated state & camp posting", icon: Sliders },
    { href: "/admin/ppa-matching", label: "Workplace (PPA) Matching", hint: "Match posted corps members to employers that need their course of study", icon: Award },
    { href: "/admin/verification", label: "Flagged Registrations", hint: "Review graduates whose details did not match their school list or NIN record", icon: ClipboardCheck },
    { href: "/admin/batches", label: "Batches & Camp Space", hint: "Manage service batches and set how many corps members each state camp can hold", icon: Building2 },
    { href: "/admin/reports", label: "Reports & Downloads", hint: "View national distribution charts and download Excel/CSV reports", icon: BarChart3 },
    { href: "/admin/audit", label: "System Activity Log", hint: "Read-only history of every action and posting decision made by the system", icon: Scale },
    { href: "/admin/users", label: "Staff & Portal Accounts", hint: "Create accounts for schools, employers, security officers, or reset demo data", icon: Users },
  ],
  auditor: [
    { href: "/admin/dashboard", label: "Oversight Dashboard", hint: "Read-only view of all national posting figures", icon: LayoutDashboard },
    { href: "/admin/allocation", label: "Inspect Posting Rules", hint: "Verify priority weights and how states were scored", icon: Sliders },
    { href: "/admin/reports", label: "Fairness & Unity Reports", hint: "Check regional mixing and download full CSV reports", icon: BarChart3 },
    { href: "/admin/audit", label: "System Activity Log", hint: "Tamper-proof record of every system action and posting reason", icon: Scale },
  ],
  institution: [
    { href: "/institution/dashboard", label: "School Overview", hint: "Summary of your uploaded graduate lists", icon: LayoutDashboard },
    { href: "/institution/senate-list", label: "Upload Graduate List", hint: "Upload your school's approved Senate List (CSV) so graduates can be verified automatically", icon: FileSpreadsheet },
  ],
  employer: [
    { href: "/employer/dashboard", label: "Employer Overview", hint: "Your organisation profile and placement summary", icon: LayoutDashboard },
    { href: "/employer/vacancies", label: "Available Job Slots", hint: "Post open positions and specify the courses/degrees you need", icon: Building2 },
    { href: "/employer/placements", label: "Posted Corps Members", hint: "View corps members sent to your organisation and confirm their arrival", icon: Users },
  ],
  security: [
    { href: "/security/dashboard", label: "National Safety Map", hint: "Overview of safety levels across all 36 states and FCT", icon: ShieldAlert },
    { href: "/security/states", label: "Update State Safety", hint: "Set state safety levels (Low, Moderate, High, or Critical risk)", icon: MapPin },
    { href: "/security/incidents", label: "Report Security Incident", hint: "Log field incidents and travel advisories for corps members", icon: AlertTriangle },
  ],
};

export interface PortalShellProps {
  user: {
    uid: string;
    name: string;
    email: string;
    role: Role;
    mfaEnrolled?: boolean;
  };
  children: React.ReactNode;
}

export function PortalShell({ user, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const navItems = NAV_BY_ROLE[user.role] ?? NAV_BY_ROLE.corps_member;
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-emerald-800/70 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg shadow-inner">
              NY
            </div>
            <div>
              <div className="font-bold tracking-tight text-white leading-none">NYSC NAPS</div>
              <div className="text-[11px] text-emerald-300 mt-1">Automated Posting Portal</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-emerald-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 bg-emerald-900/50 border-b border-emerald-800/60">
          <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">
            {ROLE_LABEL[user.role]}
          </div>
          <div className="text-sm font-medium text-white truncate mt-0.5">{user.name}</div>
          <div className="text-xs text-emerald-300/80 truncate">{user.email}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.hint}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-100/85 hover:bg-emerald-900 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-800/70 space-y-1.5">
          {(user.role === "admin" || user.role === "auditor") && (
            <Link
              href="/2fa/setup"
              title="Protect your admin account with a 6-digit phone authenticator code"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-emerald-900/70 hover:bg-emerald-900 text-emerald-200"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                2-Step Login Security
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  user.mfaEnrolled ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {user.mfaEnrolled ? "On" : "Set up"}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm text-emerald-200 hover:bg-red-900/40 hover:text-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-800">Fair Automated Posting</span>
              <InfoHint text="Postings are calculated automatically by computer rules based on safety, your course of study, your chosen states, national unity, and camp space. No staff member can manually change or influence a posting." />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <Link
              href="/verify/NYSC%2FNSUK%2F26AI%2F00001"
              title="Check if a printed Call-Up Letter is genuine"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg border border-slate-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Check Call-Up Letter
            </Link>

            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">Alerts &amp; Updates</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No new alerts.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 text-xs ${n.read ? "bg-white" : "bg-emerald-50/50"}`}
                      >
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>{n.title}</span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                        <div className="text-[10px] text-slate-400 mt-1.5">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

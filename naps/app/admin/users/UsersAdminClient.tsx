"use client";

import { RotateCcw, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ROLE_LABEL, type AppUser, type Role } from "@/lib/types";

export function UsersAdminClient({
  users,
  readOnly,
}: {
  users: AppUser[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("institution");
  const [orgId, setOrgId] = useState("inst_nsuk");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName, role, orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create user");
        return;
      }
      toast.success(`Created ${ROLE_LABEL[role]} account for ${email}`);
      setEmail("");
      setDisplayName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset_demo" }),
      });
      if (res.ok) {
        toast.success("Simulated database reset to clean initial seed state!");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Role-Based Access Control (RBAC) &amp; Stakeholder Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Invite Institution Senate Officers, Employers, Security Agency Liaisons, or Independent Auditors.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            disabled={loading}
            onClick={handleResetDemo}
            className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo Database to Pre-Allocation Seed
          </button>
        )}
      </div>

      {!readOnly && (
        <form
          onSubmit={handleInvite}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid sm:grid-cols-5 gap-3 items-end text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dr. Musa Bello"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@abu.edu.ng"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {(["institution", "employer", "security", "auditor", "admin"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Org ID (Optional)</label>
            <input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="inst_nsuk or emp_01"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Registered Users ({users.length})
        </h2>
        <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Org ID</th>
                <th className="py-2.5 px-3">2FA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.slice(0, 40).map((u) => (
                <tr key={u.uid}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{u.displayName}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-500">{u.orgId ?? "—"}</td>
                  <td className="py-2 px-3">{u.mfaEnabled ? "Enabled" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

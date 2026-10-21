"use client";

import { ArrowLeft, KeyRound, Lock, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DEMO_USERS } from "@/lib/seedData";
import { ROLE_LABEL } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nysc.gov.ng");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);

  async function signInWithCredentials(loginEmail: string, loginPass: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Sign in failed");
        setLoading(false);
        return;
      }
      toast.success(`Signed in as ${data.email}`);
      router.push(data.nextPath || "/");
      router.refresh();
    } catch (err) {
      toast.error(String(err));
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signInWithCredentials(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to NAPS Home &amp; Risk Map
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            RBAC + TOTP 2FA Enabled
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Standard Login Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-lg mb-3">
                NY
              </div>
              <h1 className="text-xl font-bold text-slate-900">Sign in to NYSC NAPS</h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or click any role card on the right to sign in immediately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Authenticating…" : "Sign In to Portal"}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Prospective Corps Member?</span>
              <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
                Create PCM Account →
              </Link>
            </div>
          </div>

          {/* Right: One-Click Demo Accounts for Project Defense */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  One-Click Role Switcher (Project Defense Demo)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any stakeholder account below to log in immediately and test that portal&apos;s workflow.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    signInWithCredentials(u.email, u.password);
                  }}
                  className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {ROLE_LABEL[u.role]}
                    </span>
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                  <div className="font-semibold text-sm text-slate-900">{u.displayName}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{u.email}</div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">{u.subtitle}</p>
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Recommended Evaluation Sequence:</span>{" "}
                1) Sign in as <b>NYSC Administrator</b> to run AHP + TOPSIS state allocation &amp; PPA matching →{" "}
                2) Sign in as <b>Amina Bello (Corps Member)</b> to inspect her Call-Up Letter, QR verification, and{" "}
                <i>&ldquo;Why this state?&rdquo;</i> TOPSIS explanation → 3) Sign in as <b>Employer</b> or{" "}
                <b>Security Agency</b>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

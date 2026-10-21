"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA verification failed");
        setLoading(false);
        return;
      }
      toast.success("Two-factor authentication verified!");
      router.push(data.nextPath || "/admin/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Two-Factor Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter the 6-digit code from your Authenticator app (Google Authenticator / Authy) or one of your
            8-character backup codes.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            required
            placeholder="000000 or Backup Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-widest"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? "Verifying…" : "Verify & Enter Admin Portal"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Need to reconfigure your Authenticator?{" "}
          <Link href="/2fa/setup" className="text-emerald-700 font-semibold hover:underline">
            Open 2FA Setup
          </Link>
        </div>
      </div>
    </div>
  );
}

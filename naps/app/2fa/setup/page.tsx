"use client";

import { ArrowLeft, CheckCircle2, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SetupTwoFactorPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/2fa/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.secret) setSecret(d.secret);
        if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl);
        setMfaEnrolled(Boolean(d.mfaEnrolled));
      })
      .catch(() => {});
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        setLoading(false);
        return;
      }
      setBackupCodes(data.backupCodes ?? []);
      setMfaEnrolled(true);
      toast.success("TOTP 2FA enabled! Save your 8 backup codes.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      setMfaEnrolled(false);
      setBackupCodes(null);
      toast.info("TOTP 2FA disabled for this account.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Admin Dashboard
          </Link>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              mfaEnrolled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {mfaEnrolled ? "2FA Enrolled & Active" : "2FA Not Yet Enforced"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Administrator TOTP Two-Factor Authentication (2FA)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Server-side RFC 6238 TOTP (works on Firebase Spark free plan). Scan the QR code with Google
                Authenticator or Authy and enter the 6-digit code to activate.
              </p>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="TOTP QR Code"
                className="w-44 h-44 rounded-lg border border-slate-200 bg-white p-2"
              />
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Manual Setup Key (Base32):</div>
                <div className="font-mono bg-white px-3 py-2 rounded border border-slate-200 text-emerald-800 break-all">
                  {secret}
                </div>
                <p className="text-slate-500">
                  Issuer: <b>NYSC-NAPS</b> • Interval: 30s • Digits: 6
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleEnable} className="flex flex-col sm:flex-row gap-3">
            <input
              required
              placeholder="Enter 6-digit code from Authenticator app"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "Verifying…" : "Verify & Activate 2FA"}
            </button>
          </form>

          {mfaEnrolled && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Want to turn off 2FA for quick demo role switching?
              </span>
              <button
                type="button"
                onClick={handleDisable}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Disable 2FA
              </button>
            </div>
          )}

          {backupCodes && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                One-Time Emergency Backup Codes (Hashed in Database)
              </div>
              <p className="text-xs text-emerald-800">
                Each backup code can be used once at <code>/2fa</code> if you lose access to your authenticator device:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {backupCodes.map((c) => (
                  <div
                    key={c}
                    className="font-mono text-xs bg-white px-2.5 py-1.5 rounded border border-emerald-200 text-center font-bold text-slate-800"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

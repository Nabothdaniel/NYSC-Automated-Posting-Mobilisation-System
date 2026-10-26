import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deployment health check. Reports the runtime Node version, which data
 * backend is active, and whether the server-side store can be read.
 * Never exposes secret values, only whether they are set.
 */
export async function GET() {
  const base = {
    ok: false,
    node: process.version,
    vercel: Boolean(process.env.VERCEL),
    backend: "unknown" as "firestore" | "local" | "unknown",
    firebaseEnv: {
      projectId: Boolean(process.env.FIREBASE_PROJECT_ID),
      clientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      privateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      useLocalStore: process.env.USE_LOCAL_STORE === "true",
    },
    states: 0,
    error: null as string | null,
  };

  try {
    const admin = await import("@/lib/firebase/admin");
    base.backend = admin.hasFirebaseCredentials() ? "firestore" : "local";
    const snap = await admin.db().collection("states").get();
    base.states = snap.docs.length;
    base.ok = base.states > 0;
  } catch (err) {
    base.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json(base, { status: base.ok ? 200 : 500 });
}

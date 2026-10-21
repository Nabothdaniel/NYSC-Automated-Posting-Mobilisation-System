import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { LocalAdminAuth, LocalFirestore, type LocalQuerySnapshot } from "./localStore";

let app: App | undefined;
let firestore: Firestore | undefined;
const localFirestore = new LocalFirestore();
const localAuth = new LocalAdminAuth();

export function hasFirebaseCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.USE_LOCAL_STORE !== "true",
  );
}

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export const adminAuth = (): LocalAdminAuth => {
  if (!hasFirebaseCredentials()) return localAuth;
  return getAuth(getAdminApp()) as unknown as LocalAdminAuth;
};

export const db = (): LocalFirestore => {
  if (!hasFirebaseCredentials()) return localFirestore;
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
    try {
      firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* settings already applied */
    }
  }
  return firestore as unknown as LocalFirestore;
};

export const nowIso = () => new Date().toISOString();

/** Typed helper: map a query snapshot to plain objects with `id`. */
export function docsOf<T>(snap: FirebaseFirestore.QuerySnapshot | LocalQuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}

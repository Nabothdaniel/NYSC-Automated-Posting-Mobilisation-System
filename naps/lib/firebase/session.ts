import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, db } from "./admin";
import { MFA_ROLES, ROLE_HOME, type AppUser, type Role } from "../types";

export const SESSION_COOKIE = "__session";
export const MFA_COOKIE = "naps_mfa";
export const SESSION_DAYS = 5;

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  orgId?: string;
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  needsMfa: boolean;
}

const secret = () => process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

/** MFA proof cookie: `${uid}.${expMs}.${hmac}` — bound to the user and expiry. */
export function makeMfaToken(uid: string) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${uid}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyMfaToken(token: string | undefined, uid: string) {
  if (!token) return false;
  const [tUid, exp, sig] = token.split(".");
  if (tUid !== uid || !exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(`${tUid}.${exp}`);
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export const cookieOptions = (maxAgeSec: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSec,
});

/** Reads + verifies the session cookie. Returns null if absent/invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const userSnap = await db().collection("users").doc(decoded.uid).get();
    const userDoc = userSnap.data() as AppUser | undefined;
    const role = (userDoc?.role ?? (decoded.role as Role)) ?? "corps_member";
    const mfaEnrolled = Boolean(userDoc?.mfaEnabled ?? decoded.mfaEnrolled);
    const needsMfa = MFA_ROLES.includes(role) && mfaEnrolled;
    return {
      uid: decoded.uid,
      email: userDoc?.email ?? decoded.email ?? "",
      name: userDoc?.displayName ?? (decoded.name as string) ?? decoded.email ?? "User",
      role,
      orgId: (userDoc?.orgId ?? decoded.orgId) as string | undefined,
      mfaEnrolled,
      mfaVerified: needsMfa ? verifyMfaToken(jar.get(MFA_COOKIE)?.value, decoded.uid) : true,
      needsMfa,
    };
  } catch {
    return null;
  }
}

/** For server components/layouts: enforce login, role and (when enrolled) completed 2FA. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.needsMfa && !user.mfaVerified) redirect("/2fa");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role] ?? "/");
  return user;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** For route handlers: throws ApiError(401/403) instead of redirecting. */
export async function requireApiRole(roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not signed in");
  if (user.needsMfa && !user.mfaVerified) throw new ApiError(403, "Two-factor verification required");
  if (!roles.includes(user.role)) throw new ApiError(403, "Forbidden for your role");
  return user;
}

/** For 2FA setup/verification endpoints where session is valid. */
export async function requireApiSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not signed in");
  return user;
}

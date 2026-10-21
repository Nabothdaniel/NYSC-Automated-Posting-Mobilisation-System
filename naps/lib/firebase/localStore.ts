import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { buildSeedBundle, type FullSeedBundle } from "../seedData";
import type { Role } from "../types";

const DB_FILE = process.env.VERCEL
  ? path.join("/tmp", ".local-naps-db.json")
  : path.join(process.cwd(), ".local-naps-db.json");

interface LocalDbState {
  collections: Record<string, Record<string, Record<string, unknown>>>;
  passwords: Record<string, string>;
  customClaims: Record<string, Record<string, unknown>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __napsLocalDb: LocalDbState | undefined;
}

function loadState(): LocalDbState {
  if (global.__napsLocalDb) return global.__napsLocalDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as LocalDbState;
      if (raw && raw.collections && raw.collections.states) {
        global.__napsLocalDb = raw;
        return raw;
      }
    }
  } catch {
    // Rebuild from seed if corrupted
  }
  return resetLocalStore();
}

function saveState(state: LocalDbState) {
  global.__napsLocalDb = state;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Ignore write failure on read-only serverless fs; in-memory state still works
  }
}

export function resetLocalStore(): LocalDbState {
  const seed: FullSeedBundle = buildSeedBundle();
  const customClaims: Record<string, Record<string, unknown>> = {};
  for (const u of Object.values(seed.users)) {
    customClaims[u.uid] = {
      role: u.role,
      orgId: u.orgId,
      mfaEnrolled: Boolean(u.mfaEnabled),
    };
  }
  const state: LocalDbState = {
    collections: {
      users: seed.users as unknown as Record<string, Record<string, unknown>>,
      states: seed.states as unknown as Record<string, Record<string, unknown>>,
      camps: seed.camps as unknown as Record<string, Record<string, unknown>>,
      institutions: seed.institutions as unknown as Record<string, Record<string, unknown>>,
      batches: seed.batches as unknown as Record<string, Record<string, unknown>>,
      config: seed.config as unknown as Record<string, Record<string, unknown>>,
      nimcRecords: seed.nimcRecords as unknown as Record<string, Record<string, unknown>>,
      senateLists: seed.senateLists as unknown as Record<string, Record<string, unknown>>,
      corpsMembers: seed.corpsMembers as unknown as Record<string, Record<string, unknown>>,
      employers: seed.employers as unknown as Record<string, Record<string, unknown>>,
      vacancies: seed.vacancies as unknown as Record<string, Record<string, unknown>>,
      securityIncidents: seed.securityIncidents as unknown as Record<string, Record<string, unknown>>,
      auditLogs: seed.auditLogs as unknown as Record<string, Record<string, unknown>>,
      notifications: seed.notifications as unknown as Record<string, Record<string, unknown>>,
      counters: seed.counters as unknown as Record<string, Record<string, unknown>>,
      userSecrets: seed.userSecrets as unknown as Record<string, Record<string, unknown>>,
      allocationRuns: {},
      memberFiles: {},
    },
    passwords: { ...seed.userPasswords },
    customClaims,
  };
  saveState(state);
  return state;
}

function getNestedValue(obj: Record<string, unknown>, fieldPath: string): unknown {
  return fieldPath.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function setNestedFields(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur: Record<string, unknown> = target;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i]!;
        if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]!] = val;
    } else {
      target[key] = val;
    }
  }
}

export class LocalDocSnapshot {
  constructor(
    public readonly id: string,
    private readonly _data: Record<string, unknown> | undefined,
  ) {}
  get exists(): boolean {
    return this._data !== undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(): Record<string, any> | undefined {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }
}

export class LocalQuerySnapshot {
  constructor(public readonly docs: LocalDocSnapshot[]) {}
  get empty(): boolean {
    return this.docs.length === 0;
  }
  get size(): number {
    return this.docs.length;
  }
}

type WhereFilter = { field: string; op: string; value: unknown };
type OrderRule = { field: string; dir: "asc" | "desc" };

export class LocalQuery {
  constructor(
    protected readonly colName: string,
    protected readonly filters: WhereFilter[] = [],
    protected readonly orders: OrderRule[] = [],
    protected readonly maxDocs?: number,
  ) {}

  where(field: string, op: string, value: unknown): LocalQuery {
    return new LocalQuery(this.colName, [...this.filters, { field, op, value }], this.orders, this.maxDocs);
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): LocalQuery {
    return new LocalQuery(this.colName, this.filters, [...this.orders, { field, dir }], this.maxDocs);
  }

  limit(n: number): LocalQuery {
    return new LocalQuery(this.colName, this.filters, this.orders, n);
  }

  async get(): Promise<LocalQuerySnapshot> {
    const state = loadState();
    const col = state.collections[this.colName] ?? {};
    let entries = Object.entries(col).map(([id, doc]) => ({ id, doc }));

    for (const f of this.filters) {
      entries = entries.filter(({ id, doc }) => {
        const v = f.field === "__name__" ? id : getNestedValue(doc, f.field);
        switch (f.op) {
          case "==":
            return v === f.value;
          case "!=":
            return v !== f.value;
          case "<":
            return (v as number | string) < (f.value as number | string);
          case "<=":
            return (v as number | string) <= (f.value as number | string);
          case ">":
            return (v as number | string) > (f.value as number | string);
          case ">=":
            return (v as number | string) >= (f.value as number | string);
          case "in":
            return Array.isArray(f.value) && f.value.includes(v);
          case "array-contains":
            return Array.isArray(v) && v.includes(f.value);
          default:
            return true;
        }
      });
    }

    if (this.orders.length > 0) {
      entries.sort((a, b) => {
        for (const o of this.orders) {
          const va = (getNestedValue(a.doc, o.field) ?? "") as string | number;
          const vb = (getNestedValue(b.doc, o.field) ?? "") as string | number;
          if (va < vb) return o.dir === "asc" ? -1 : 1;
          if (va > vb) return o.dir === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    if (this.maxDocs !== undefined) {
      entries = entries.slice(0, this.maxDocs);
    }

    return new LocalQuerySnapshot(entries.map(({ id, doc }) => new LocalDocSnapshot(id, doc)));
  }
}

export class LocalDocRef {
  constructor(
    public readonly colName: string,
    public readonly id: string,
  ) {}

  async get(): Promise<LocalDocSnapshot> {
    const state = loadState();
    const col = state.collections[this.colName] ?? {};
    return new LocalDocSnapshot(this.id, col[this.id]);
  }

  async set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
    const state = loadState();
    if (!state.collections[this.colName]) state.collections[this.colName] = {};
    const clean = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    if (options?.merge && state.collections[this.colName]![this.id]) {
      const existing = state.collections[this.colName]![this.id]!;
      setNestedFields(existing, clean);
    } else {
      state.collections[this.colName]![this.id] = clean;
    }
    saveState(state);
  }

  async update(patch: Record<string, unknown>): Promise<void> {
    const state = loadState();
    if (!state.collections[this.colName]) state.collections[this.colName] = {};
    const existing = state.collections[this.colName]![this.id] ?? {};
    setNestedFields(existing, JSON.parse(JSON.stringify(patch)) as Record<string, unknown>);
    state.collections[this.colName]![this.id] = existing;
    saveState(state);
  }

  async delete(): Promise<void> {
    const state = loadState();
    if (state.collections[this.colName]) {
      delete state.collections[this.colName]![this.id];
      saveState(state);
    }
  }
}

export class LocalCollectionRef extends LocalQuery {
  constructor(colName: string) {
    super(colName);
  }

  doc(id?: string): LocalDocRef {
    const docId = id || `doc_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    return new LocalDocRef(this.colName, docId);
  }

  async add(data: Record<string, unknown>): Promise<LocalDocRef> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

export class LocalWriteBatch {
  private ops: (() => Promise<void>)[] = [];

  set(ref: LocalDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
    this.ops.push(() => ref.set(data, options));
    return this;
  }

  update(ref: LocalDocRef, patch: Record<string, unknown>) {
    this.ops.push(() => ref.update(patch));
    return this;
  }

  delete(ref: LocalDocRef) {
    this.ops.push(() => ref.delete());
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.ops) {
      await op();
    }
  }
}

export class LocalFirestore {
  collection(name: string): LocalCollectionRef {
    return new LocalCollectionRef(name);
  }
  batch(): LocalWriteBatch {
    return new LocalWriteBatch();
  }
}

const secretKey = () => process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

export function signLocalToken(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secretKey()).update(b64).digest("base64url");
  return `local.${b64}.${sig}`;
}

export function verifyLocalToken(token: string): Record<string, unknown> | null {
  if (!token.startsWith("local.")) return null;
  const [, b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", secretKey()).update(b64).digest("base64url");
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class LocalAdminAuth {
  async verifyUserPassword(email: string, password: string) {
    const state = loadState();
    const normEmail = email.trim().toLowerCase();
    const expected = state.passwords[normEmail];
    const usersCol = state.collections.users ?? {};
    const found = Object.values(usersCol).find(
      (u) => String(u.email ?? "").toLowerCase() === normEmail,
    );
    if (!found) {
      throw new Error("Invalid email or password");
    }
    if (expected && expected !== password) {
      throw new Error("Invalid email or password");
    }
    const uid = String(found.uid);
    const claims = state.customClaims[uid] ?? {
      role: (found.role as Role) ?? "corps_member",
      orgId: found.orgId,
      mfaEnrolled: Boolean(found.mfaEnabled),
    };
    return {
      uid,
      email: String(found.email),
      displayName: String(found.displayName ?? found.email),
      customClaims: claims,
    };
  }

  async createUser(props: { uid?: string; email: string; password?: string; displayName?: string }) {
    const state = loadState();
    const normEmail = props.email.trim().toLowerCase();
    const usersCol = state.collections.users ?? {};
    const existing = Object.values(usersCol).find(
      (u) => String(u.email ?? "").toLowerCase() === normEmail,
    );
    if (existing) {
      throw new Error("An account with this email already exists.");
    }
    const uid = props.uid || `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    if (props.password) {
      state.passwords[normEmail] = props.password;
    }
    saveState(state);
    return { uid, email: normEmail, displayName: props.displayName ?? normEmail };
  }

  async setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
    const state = loadState();
    state.customClaims[uid] = { ...(state.customClaims[uid] ?? {}), ...claims };
    saveState(state);
  }

  async getUser(uid: string) {
    const state = loadState();
    const u = state.collections.users?.[uid];
    if (!u) throw new Error("User not found");
    return {
      uid,
      email: String(u.email ?? ""),
      displayName: String(u.displayName ?? ""),
      customClaims: state.customClaims[uid] ?? {
        role: u.role ?? "corps_member",
        orgId: u.orgId,
        mfaEnrolled: Boolean(u.mfaEnabled),
      },
    };
  }

  async verifyIdToken(idToken: string) {
    const decoded = verifyLocalToken(idToken);
    if (!decoded) throw new Error("Invalid local ID token");
    const uid = String(decoded.uid);
    const user = await this.getUser(uid);
    return {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      ...user.customClaims,
    };
  }

  async createSessionCookie(idToken: string, _options: { expiresIn: number }) {
    const decoded = await this.verifyIdToken(idToken);
    return signLocalToken({ ...decoded, exp: Date.now() + _options.expiresIn });
  }

  async verifySessionCookie(sessionCookie: string, _checkRevoked?: boolean) {
    const decoded = verifyLocalToken(sessionCookie);
    if (!decoded) throw new Error("Invalid session cookie");
    const uid = String(decoded.uid);
    const state = loadState();
    const u = state.collections.users?.[uid];
    const claims = state.customClaims[uid] ?? {};
    return {
      uid,
      email: String(u?.email ?? decoded.email ?? ""),
      name: String(u?.displayName ?? decoded.name ?? ""),
      role: (claims.role ?? u?.role ?? decoded.role ?? "corps_member") as Role,
      orgId: (claims.orgId ?? u?.orgId ?? decoded.orgId) as string | undefined,
      mfaEnrolled: Boolean(claims.mfaEnrolled ?? u?.mfaEnabled ?? decoded.mfaEnrolled),
    };
  }

  async revokeRefreshTokens(_uid: string) {
    // no-op in local mode
  }
}

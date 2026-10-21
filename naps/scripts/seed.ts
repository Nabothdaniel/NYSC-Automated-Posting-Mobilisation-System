import "dotenv/config";
import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { buildSeedBundle, DEMO_USERS } from "../lib/seedData";

async function seedCloudFirestore(seed: ReturnType<typeof buildSeedBundle>) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return false;

  console.log(`🌐 Seeding live Firebase project: ${projectId}...`);
  const app = getApps().length
    ? getApps()[0]!
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  firestore.settings({ ignoreUndefinedProperties: true });

  // 1. Seed Auth accounts + custom claims for demo users
  for (const u of DEMO_USERS) {
    try {
      await auth.createUser({
        uid: u.uid,
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
    } catch {
      await auth.updateUser(u.uid, {
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
    }
    await auth.setCustomUserClaims(u.uid, {
      role: u.role,
      orgId: u.orgId,
      mfaEnrolled: Boolean(u.mfaEnabled),
    });
  }

  // 2. Write Firestore collections in batches
  const collections: [string, Record<string, unknown>][] = [
    ["users", seed.users],
    ["states", seed.states],
    ["camps", seed.camps],
    ["institutions", seed.institutions],
    ["batches", seed.batches],
    ["config", seed.config],
    ["nimcRecords", seed.nimcRecords],
    ["senateLists", seed.senateLists],
    ["corpsMembers", seed.corpsMembers],
    ["employers", seed.employers],
    ["vacancies", seed.vacancies],
    ["securityIncidents", seed.securityIncidents],
    ["auditLogs", seed.auditLogs],
    ["notifications", seed.notifications],
  ];

  for (const [colName, docs] of collections) {
    const entries = Object.entries(docs);
    const batch = firestore.batch();
    for (const [id, data] of entries) {
      batch.set(firestore.collection(colName).doc(id), data as object);
    }
    await batch.commit();
    console.log(`   ✔ Firestore collection "${colName}" (${entries.length} docs)`);
  }
  return true;
}

async function main() {
  const seed = buildSeedBundle();
  const customClaims: Record<string, Record<string, unknown>> = {};
  for (const u of Object.values(seed.users)) {
    customClaims[u.uid] = {
      role: u.role,
      orgId: u.orgId,
      mfaEnrolled: Boolean(u.mfaEnabled),
    };
  }

  const state = {
    collections: {
      users: seed.users,
      states: seed.states,
      camps: seed.camps,
      institutions: seed.institutions,
      batches: seed.batches,
      config: seed.config,
      nimcRecords: seed.nimcRecords,
      senateLists: seed.senateLists,
      corpsMembers: seed.corpsMembers,
      employers: seed.employers,
      vacancies: seed.vacancies,
      securityIncidents: seed.securityIncidents,
      auditLogs: seed.auditLogs,
      notifications: seed.notifications,
      counters: seed.counters,
      userSecrets: seed.userSecrets,
      allocationRuns: {},
      memberFiles: {},
    },
    passwords: seed.userPasswords,
    customClaims,
  };

  const outPath = path.join(process.cwd(), ".local-naps-db.json");
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2), "utf8");
  console.log(`✅ Local NAPS database seeded to ${outPath}`);

  const cloudSeeded = await seedCloudFirestore(seed);
  if (cloudSeeded) {
    console.log(`✅ Live Firebase Auth & Cloud Firestore seeded!`);
  } else {
    console.log(`ℹ️  No FIREBASE_PROJECT_ID in .env.local — using local persistent store mode.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

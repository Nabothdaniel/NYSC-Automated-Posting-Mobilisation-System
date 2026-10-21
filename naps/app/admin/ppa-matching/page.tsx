import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { DEFAULT_BATCH_ID } from "@/lib/seedData";
import type { CorpsMember, Vacancy } from "@/lib/types";
import { PpaEngineClient } from "./PpaEngineClient";

export const dynamic = "force-dynamic";

export default async function AdminPpaMatchingPage() {
  const user = await requireRole(["admin", "auditor"]);
  const [membersSnap, vacSnap] = await Promise.all([
    db().collection("corpsMembers").get(),
    db().collection("vacancies").get(),
  ]);

  const members = docsOf<CorpsMember>(membersSnap);
  const vacancies = docsOf<Vacancy>(vacSnap);

  return (
    <PpaEngineClient
      members={members}
      vacancies={vacancies}
      defaultBatchId={DEFAULT_BATCH_ID}
      readOnly={user.role === "auditor"}
    />
  );
}

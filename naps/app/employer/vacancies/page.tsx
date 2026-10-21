import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { Vacancy } from "@/lib/types";
import { VacanciesClient } from "./VacanciesClient";

export const dynamic = "force-dynamic";

export default async function EmployerVacanciesPage() {
  const user = await requireRole(["employer", "admin"]);
  const empId = user.orgId || "emp_01";
  const snap = await db().collection("vacancies").get();
  const vacancies = docsOf<Vacancy>(snap);

  return <VacanciesClient employerId={empId} vacancies={vacancies} />;
}

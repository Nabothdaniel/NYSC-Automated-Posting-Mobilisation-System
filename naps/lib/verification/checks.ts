import type { CorpsMember, NimcRecord, SenateRecord, VerificationFlag } from "../types";
import { nameSimilarity } from "./fuzzy";

export interface VerificationContext {
  member: Pick<
    CorpsMember,
    | "uid"
    | "nin"
    | "matricNo"
    | "institutionId"
    | "surname"
    | "firstName"
    | "otherNames"
    | "dob"
    | "stateOfOrigin"
    | "course"
    | "isForeignTrained"
  >;
  nimc: NimcRecord | null;
  senate: SenateRecord | null;
  duplicateNinOrMatric: boolean;
  mobilizationDate: string; // YYYY-MM-DD
  maxAge?: number; // default 30
}

export interface VerificationResult {
  passed: boolean;
  status: "VERIFIED" | "FLAGGED";
  flags: VerificationFlag[];
  ageAtMobilization: number;
  nameSimNimc?: number;
  nameSimSenate?: number;
}

export function computeAgeOn(dobIso: string, refIso: string): number {
  const dob = new Date(dobIso);
  const ref = new Date(refIso);
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const m = ref.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

export function runVerificationChecks(ctx: VerificationContext): VerificationResult {
  const flags: VerificationFlag[] = [];
  const { member, nimc, senate, duplicateNinOrMatric, mobilizationDate } = ctx;
  const maxAge = ctx.maxAge ?? 30;
  const fullName = [member.surname, member.firstName, member.otherNames].filter(Boolean).join(" ");

  if (duplicateNinOrMatric) {
    flags.push("DUPLICATE");
  }

  const age = computeAgeOn(member.dob, mobilizationDate);
  if (age > maxAge) {
    flags.push("OVER_AGE");
  }

  let nameSimNimc: number | undefined;
  if (!nimc) {
    flags.push("NIN_NOT_FOUND");
  } else {
    const nimcName = `${nimc.surname} ${nimc.firstName}`;
    nameSimNimc = Math.round(nameSimilarity(fullName, nimcName) * 100) / 100;
    const shortSim = nameSimilarity(`${member.surname} ${member.firstName}`, nimcName);
    if (Math.max(nameSimNimc, shortSim) < 0.8 || nimc.dob !== member.dob) {
      flags.push("NIN_MISMATCH");
    }
    if (nimc.stateOfOrigin !== member.stateOfOrigin) {
      flags.push("SOO_MISMATCH");
    }
  }

  let nameSimSenate: number | undefined;
  if (member.isForeignTrained) {
    flags.push("FOREIGN_REVIEW");
  } else if (!senate) {
    flags.push("NOT_ON_SENATE_LIST");
  } else {
    nameSimSenate = Math.round(nameSimilarity(fullName, senate.fullName) * 100) / 100;
    const shortSim = nameSimilarity(`${member.surname} ${member.firstName}`, senate.fullName);
    if (Math.max(nameSimSenate, shortSim) < 0.75 || senate.dob !== member.dob) {
      flags.push("SENATE_DETAILS_MISMATCH");
    }
  }

  return {
    passed: flags.length === 0,
    status: flags.length === 0 ? "VERIFIED" : "FLAGGED",
    flags,
    ageAtMobilization: age,
    nameSimNimc,
    nameSimSenate,
  };
}

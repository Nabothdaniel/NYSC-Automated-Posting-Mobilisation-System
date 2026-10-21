import type { CourseCategory } from "./constants/courses";
import type { RiskLevel, Zone } from "./constants/states";

export type { RiskLevel, Zone };

export type Role = "corps_member" | "admin" | "institution" | "employer" | "security" | "auditor";

export const ROLE_HOME: Record<Role, string> = {
  corps_member: "/member/dashboard",
  admin: "/admin/dashboard",
  auditor: "/admin/dashboard",
  institution: "/institution/dashboard",
  employer: "/employer/dashboard",
  security: "/security/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  corps_member: "Prospective Corps Member",
  admin: "NYSC Administrator",
  auditor: "Independent Auditor",
  institution: "Institution Official",
  employer: "Employer (PPA)",
  security: "Security Agency",
};

/** Roles that must complete TOTP 2FA before accessing their portal. */
export const MFA_ROLES: Role[] = ["admin", "auditor"];

export type MemberStatus =
  | "REGISTERED"
  | "PENDING_VERIFICATION"
  | "FLAGGED"
  | "REJECTED"
  | "VERIFIED"
  | "ALLOCATED"
  | "PPA_MATCHED"
  | "PPA_ALTERNATIVE_REQUESTED"
  | "PPA_ACCEPTED"
  | "DEPLOYED";

export const STATUS_ORDER: MemberStatus[] = [
  "REGISTERED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "ALLOCATED",
  "PPA_MATCHED",
  "PPA_ACCEPTED",
  "DEPLOYED",
];

export const STATUS_LABEL: Record<MemberStatus, string> = {
  REGISTERED: "Registered",
  PENDING_VERIFICATION: "Pending Verification",
  FLAGGED: "Flagged for Review",
  REJECTED: "Rejected",
  VERIFIED: "Verified",
  ALLOCATED: "State Allocated",
  PPA_MATCHED: "PPA Matched",
  PPA_ALTERNATIVE_REQUESTED: "Alternative PPA Requested",
  PPA_ACCEPTED: "PPA Accepted",
  DEPLOYED: "Deployed",
};

export type VerificationFlag =
  | "NOT_ON_SENATE_LIST"
  | "SENATE_DETAILS_MISMATCH"
  | "NIN_NOT_FOUND"
  | "NIN_MISMATCH"
  | "SOO_MISMATCH"
  | "DUPLICATE"
  | "OVER_AGE"
  | "FOREIGN_REVIEW";

export const FLAG_LABEL: Record<VerificationFlag, string> = {
  NOT_ON_SENATE_LIST: "Not found on institution senate list",
  SENATE_DETAILS_MISMATCH: "Details differ from senate list (name/DOB/course)",
  NIN_NOT_FOUND: "NIN not found in identity registry",
  NIN_MISMATCH: "Name or date of birth does not match NIN record",
  SOO_MISMATCH: "State of origin differs from NIN record",
  DUPLICATE: "Duplicate NIN / matric number already registered",
  OVER_AGE: "Over 30 years at mobilization date",
  FOREIGN_REVIEW: "Foreign-trained graduate — manual credential review",
};

export interface Allocation {
  stateCode: string;
  campId: string;
  campName: string;
  callUpNo: string;
  score: number;
  rank: number;
  runId: string;
  allocatedAt: string;
}

export interface PpaAssignment {
  vacancyId: string;
  employerId: string;
  employerName: string;
  title: string;
  lga: string;
  score: number;
  matchedAt: string;
  acceptedAt?: string;
  confirmedAt?: string;
  altRequest?: { reason: string; requestedAt: string };
  altUsed?: boolean;
  excludedVacancyIds?: string[];
}

export interface CorpsMember {
  uid: string;
  email: string;
  nin: string;
  matricNo: string;
  institutionId: string;
  institutionName: string;
  surname: string;
  firstName: string;
  otherNames?: string;
  gender: "M" | "F";
  dob: string; // YYYY-MM-DD
  stateOfOrigin: string;
  phone: string;
  course: string;
  courseCategory: CourseCategory;
  qualification: string; // B.Sc, B.Eng, MBBS, HND, LL.B …
  classOfDegree: string;
  graduationYear: number;
  isForeignTrained: boolean;
  batchId: string;
  preferences: string[]; // up to 4 state codes
  riskConsent: boolean;
  riskConsentAt?: string;
  hasPhoto?: boolean;
  hasCertificate?: boolean;
  status: MemberStatus;
  flags: VerificationFlag[];
  reviewNote?: string;
  allocation?: Allocation;
  ppa?: PpaAssignment;
  createdAt: string;
  submittedAt?: string;
  verifiedAt?: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: "university" | "polytechnic" | "coe" | "foreign";
  stateCode: string;
  accredited: boolean;
}

export interface SenateRecord {
  id: string;
  institutionId: string;
  matricNo: string;
  fullName: string;
  dob: string;
  course: string;
  graduationYear: number;
  classOfDegree: string;
  used: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

export interface NimcRecord {
  nin: string;
  surname: string;
  firstName: string;
  dob: string;
  gender: "M" | "F";
  stateOfOrigin: string;
}

export interface StateDoc {
  code: string;
  name: string;
  zone: Zone;
  riskLevel: RiskLevel;
  incidentCount: number;
  lastUpdated: string;
  updatedBy: string;
  note?: string;
}

export interface Camp {
  id: string;
  stateCode: string;
  name: string;
  capacity: number;
  occupied: number;
}

export interface Employer {
  id: string;
  name: string;
  sector: string;
  stateCode: string;
  lga: string;
  address: string;
  verified: boolean;
  ownerUid?: string;
  contactEmail?: string;
}

export interface Vacancy {
  id: string;
  employerId: string;
  employerName: string;
  stateCode: string;
  lga: string;
  title: string;
  courseCategories: CourseCategory[];
  preferredQualifications: string[];
  capacity: number;
  filled: number;
  active: boolean;
  createdAt: string;
}

export interface SecurityIncident {
  id: string;
  stateCode: string;
  lga: string;
  type: "kidnapping" | "banditry" | "terrorism" | "communal" | "accident" | "other";
  severity: 1 | 2 | 3 | 4 | 5;
  date: string;
  description: string;
  reportedBy: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string; // e.g. "2026 Batch A"
  year: number;
  batch: "A" | "B" | "C";
  stream: "I" | "II";
  mobilizationDate: string;
  maxAge: number;
  status: "open" | "allocated" | "ppa" | "closed";
  createdAt: string;
}

export const CRITERIA = ["security", "course", "preference", "integration", "capacity"] as const;
export type Criterion = (typeof CRITERIA)[number];
export type Weights = Record<Criterion, number>;

export const CRITERION_LABEL: Record<Criterion, string> = {
  security: "Security Risk",
  course: "Course Alignment",
  preference: "Preference",
  integration: "National Integration",
  capacity: "Infrastructure Capacity",
};

export const DEFAULT_WEIGHTS: Weights = {
  security: 0.3,
  course: 0.25,
  preference: 0.2,
  integration: 0.15,
  capacity: 0.1,
};

export interface AllocationConfig {
  weights: Weights;
  ahpMatrix: number[][];
  consistencyRatio: number;
  updatedBy: string;
  updatedAt: string;
}

export interface CandidateExplanation {
  stateCode: string;
  criteria: Weights; // raw 0..1 scores
  closeness: number; // TOPSIS Ci
}

export interface AuditLog {
  id: string;
  action: string;
  actorUid: string;
  actorRole: Role | "system";
  actorName?: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  runId?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  uid: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "action";
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  orgId?: string;
  mfaEnabled?: boolean;
  disabled?: boolean;
  createdAt: string;
}

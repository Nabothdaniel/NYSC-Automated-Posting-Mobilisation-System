import { computeAhp, defaultAhpMatrix } from "./algorithms/ahp";
import { mulberry32 } from "./algorithms/seededRandom";
import { ALL_COURSES, categoryOf, type CourseCategory } from "./constants/courses";
import { STATES, type StateInfo } from "./constants/states";
import {
  DEFAULT_WEIGHTS,
  type AllocationConfig,
  type AppUser,
  type AuditLog,
  type Batch,
  type Camp,
  type CorpsMember,
  type Employer,
  type Institution,
  type NimcRecord,
  type Notification,
  type SecurityIncident,
  type SenateRecord,
  type StateDoc,
  type Vacancy,
} from "./types";

export const DEFAULT_BATCH_ID = "batch_2026_A_I";

export const DEMO_USERS: (AppUser & { password: string; subtitle: string })[] = [
  {
    uid: "usr_admin_hq",
    email: "admin@nysc.gov.ng",
    password: "Password123!",
    displayName: "Brig. Gen. S. K. Ibrahim (Admin HQ)",
    role: "admin",
    mfaEnabled: false,
    createdAt: "2026-01-10T08:00:00.000Z",
    subtitle: "NYSC Mobilisation Dept HQ — Full Admin & Allocation Engine",
  },
  {
    uid: "usr_pcm_001",
    email: "amina.bello@student.nsuk.edu.ng",
    password: "Password123!",
    displayName: "Amina Bello (Corps Member)",
    role: "corps_member",
    createdAt: "2026-02-01T09:00:00.000Z",
    subtitle: "Verified B.Sc. Computer Science graduate (NSUK) — Ready for Allocation",
  },
  {
    uid: "usr_pcm_002",
    email: "chinedu.okafor@unn.edu.ng",
    password: "Password123!",
    displayName: "Chinedu Okafor (New Graduate)",
    role: "corps_member",
    createdAt: "2026-02-02T10:00:00.000Z",
    subtitle: "Newly registered MBBS graduate (UNN) — Can test profile & verification",
  },
  {
    uid: "usr_inst_nsuk",
    email: "senate@nsuk.edu.ng",
    password: "Password123!",
    displayName: "Dr. B. A. Ajayi (NSUK Senate Officer)",
    role: "institution",
    orgId: "inst_nsuk",
    createdAt: "2026-01-12T08:00:00.000Z",
    subtitle: "Nasarawa State University, Keffi — Upload & validate senate lists",
  },
  {
    uid: "usr_emp_fmc",
    email: "hr@fmclagos.gov.ng",
    password: "Password123!",
    displayName: "Mrs. Funke Adeyemi (Employer PPA)",
    role: "employer",
    orgId: "emp_01",
    createdAt: "2026-01-15T08:00:00.000Z",
    subtitle: " Lagos Tech & Medical Hub — Manage PPA vacancies & placements",
  },
  {
    uid: "usr_sec_dss",
    email: "ops@security.gov.ng",
    password: "Password123!",
    displayName: "Col. M. Danjuma (Security Liaison)",
    role: "security",
    createdAt: "2026-01-14T08:00:00.000Z",
    subtitle: "National Security Operations — Update state risk levels & incidents",
  },
  {
    uid: "usr_auditor_01",
    email: "audit@icpc.gov.ng",
    password: "Password123!",
    displayName: "Barr. Ngozi Eze (Independent Auditor)",
    role: "auditor",
    mfaEnabled: false,
    createdAt: "2026-01-16T08:00:00.000Z",
    subtitle: "Read-only oversight of AHP weights, TOPSIS runs & audit trail",
  },
];

export const SEED_INSTITUTIONS: Institution[] = [
  { id: "inst_nsuk", name: "Nasarawa State University, Keffi", code: "NSUK", type: "university", stateCode: "NA", accredited: true },
  { id: "inst_abu", name: "Ahmadu Bello University, Zaria", code: "ABU", type: "university", stateCode: "KD", accredited: true },
  { id: "inst_unilag", name: "University of Lagos", code: "UNILAG", type: "university", stateCode: "LA", accredited: true },
  { id: "inst_ui", name: "University of Ibadan", code: "UI", type: "university", stateCode: "OY", accredited: true },
  { id: "inst_unn", name: "University of Nigeria, Nsukka", code: "UNN", type: "university", stateCode: "EN", accredited: true },
  { id: "inst_uniben", name: "University of Benin", code: "UNIBEN", type: "university", stateCode: "ED", accredited: true },
  { id: "inst_buk", name: "Bayero University, Kano", code: "BUK", type: "university", stateCode: "KN", accredited: true },
  { id: "inst_uniport", name: "University of Port Harcourt", code: "UNIPORT", type: "university", stateCode: "RI", accredited: true },
  { id: "inst_unijos", name: "University of Jos", code: "UNIJOS", type: "university", stateCode: "PL", accredited: true },
  { id: "inst_futa", name: "Federal University of Technology, Akure", code: "FUTA", type: "university", stateCode: "ON", accredited: true },
  { id: "inst_futminna", name: "Federal University of Technology, Minna", code: "FUTMIN", type: "university", stateCode: "NI", accredited: true },
  { id: "inst_unilorin", name: "University of Ilorin", code: "UNILORIN", type: "university", stateCode: "KW", accredited: true },
  { id: "inst_yabatech", name: "Yaba College of Technology", code: "YABATECH", type: "polytechnic", stateCode: "LA", accredited: true },
  { id: "inst_kadpoly", name: "Kaduna Polytechnic", code: "KADPOLY", type: "polytechnic", stateCode: "KD", accredited: true },
  { id: "inst_ncezaria", name: "Federal College of Education, Zaria", code: "FCEZ", type: "coe", stateCode: "KD", accredited: true },
  { id: "inst_uk_leeds", name: "University of Leeds (Foreign-Trained)", code: "FORUK", type: "foreign", stateCode: "FC", accredited: true },
];

const SURNAMES = [
  "Ibrahim", "Bello", "Okafor", "Adeyemi", "Mohammed", "Eze", "Ogunleye", "Abdullahi",
  "Nwosu", "Suleiman", "Balogun", "Okonkwo", "Garba", "Adebayo", "Chukwu", "Musa",
  "Afolabi", "Nnamdi", "Lawal", "Onyeka", "Danjuma", "Akinwale", "Obi", "Usman",
  "Idris", "Olaniyi", "Igwe", "Aliyu", "Fashola", "Yakubu", "Ezeani", "Oladipo",
];

const FIRST_NAMES_M = [
  "Iduyukpo", "Chinedu", "Tunde", "Sadiq", "Emeka", "Segun", "Femi", "Kabiru",
  "Uche", "Bashir", "Kelechi", "Damilola", "Mustapha", "Obinna", "Yusuf", "Samuel",
];

const FIRST_NAMES_F = [
  "Amina", "Ngozi", "Zainab", "Funke", "Chioma", "Halima", "Blessing", "Fatima",
  "Adaeze", "Bukola", "Hauwa", "Amarachi", "Titilayo", "ifunanya", "Khadijat", "Grace",
];

export interface FullSeedBundle {
  users: Record<string, AppUser>;
  userPasswords: Record<string, string>; // email -> password (for local auth fallback)
  states: Record<string, StateDoc>;
  camps: Record<string, Camp>;
  institutions: Record<string, Institution>;
  batches: Record<string, Batch>;
  config: { allocation: AllocationConfig };
  nimcRecords: Record<string, NimcRecord>;
  senateLists: Record<string, SenateRecord>;
  corpsMembers: Record<string, CorpsMember>;
  employers: Record<string, Employer>;
  vacancies: Record<string, Vacancy>;
  securityIncidents: Record<string, SecurityIncident>;
  auditLogs: Record<string, AuditLog>;
  notifications: Record<string, Notification>;
  counters: Record<string, { value: number }>;
  userSecrets: Record<string, { secret?: string; pendingSecret?: string; backupCodes?: string[] }>;
}

export function buildSeedBundle(): FullSeedBundle {
  const rand = mulberry32(20260601);

  // 1. Users
  const users: Record<string, AppUser> = {};
  const userPasswords: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const { password, subtitle, ...appUser } = u;
    void subtitle;
    users[u.uid] = appUser;
    userPasswords[u.email.toLowerCase()] = password;
  }

  // 2. States & Camps
  const states: Record<string, StateDoc> = {};
  const camps: Record<string, Camp> = {};
  for (const s of STATES) {
    const incCount =
      s.defaultRisk === "Critical" ? 5 : s.defaultRisk === "High" ? 3 : s.defaultRisk === "Moderate" ? 1 : 0;
    states[s.code] = {
      code: s.code,
      name: s.name,
      zone: s.zone,
      riskLevel: s.defaultRisk,
      incidentCount: incCount,
      lastUpdated: "2026-02-15T12:00:00.000Z",
      updatedBy: "usr_sec_dss",
      note:
        s.defaultRisk === "Critical"
          ? "Active security operations; posting requires explicit corps member informed consent."
          : s.defaultRisk === "High"
            ? "Heightened security monitoring; restrict deployments to urban/secured LGAs."
            : "Routine security monitoring active.",
    };
    const campId = `camp_${s.code.toLowerCase()}`;
    camps[campId] = {
      id: campId,
      stateCode: s.code,
      name: s.campName,
      capacity: s.defaultCampCapacity,
      occupied: 0,
    };
  }

  // 3. Institutions
  const institutions: Record<string, Institution> = {};
  for (const inst of SEED_INSTITUTIONS) {
    institutions[inst.id] = inst;
  }

  // 4. Batches
  const batches: Record<string, Batch> = {
    [DEFAULT_BATCH_ID]: {
      id: DEFAULT_BATCH_ID,
      name: "2026 Batch A Stream I",
      year: 2026,
      batch: "A",
      stream: "I",
      mobilizationDate: "2026-05-15",
      maxAge: 30,
      status: "open",
      createdAt: "2026-01-15T08:00:00.000Z",
    },
    batch_2026_A_II: {
      id: "batch_2026_A_II",
      name: "2026 Batch A Stream II",
      year: 2026,
      batch: "A",
      stream: "II",
      mobilizationDate: "2026-07-20",
      maxAge: 30,
      status: "open",
      createdAt: "2026-02-01T08:00:00.000Z",
    },
  };

  // 5. Allocation AHP config
  const ahpMatrix = defaultAhpMatrix();
  const ahpRes = computeAhp(ahpMatrix);
  const config: { allocation: AllocationConfig } = {
    allocation: {
      weights: DEFAULT_WEIGHTS,
      ahpMatrix,
      consistencyRatio: Math.round(ahpRes.consistencyRatio * 10000) / 10000,
      updatedBy: "usr_admin_hq",
      updatedAt: "2026-01-20T09:00:00.000Z",
    },
  };

  // 6. Employers & Vacancies across states and categories
  const employers: Record<string, Employer> = {};
  const vacancies: Record<string, Vacancy> = {};

  const employerTemplates: {
    id: string;
    name: string;
    sector: string;
    stateCode: string;
    lga: string;
    categories: CourseCategory[];
    title: string;
    capacity: number;
    ownerUid?: string;
  }[] = [
    { id: "emp_01", name: "Lagos Digital & General Hospital Hub", sector: "Technology", stateCode: "LA", lga: "Ikeja", categories: ["ICT", "Medical", "Engineering"], title: "Graduate Systems & Health Analyst", capacity: 12, ownerUid: "usr_emp_fmc" },
    { id: "emp_02", name: "Federal Medical Centre, Abuja", sector: "Health", stateCode: "FC", lga: "Abuja Municipal", categories: ["Medical", "Science"], title: "Medical House Officer / Lab Corps Member", capacity: 15 },
    { id: "emp_03", name: "Oyo State Post-Primary Teaching Service (TESCOM)", sector: "Education", stateCode: "OY", lga: "Ibadan North", categories: ["Education", "Science", "Arts"], title: "Secondary School Subject Teacher", capacity: 18 },
    { id: "emp_04", name: "Rivers State Ministry of Works & Energy", sector: "Infrastructure", stateCode: "RI", lga: "Port Harcourt", categories: ["Engineering", "ICT"], title: "Junior Civil & Electrical Engineer", capacity: 12 },
    { id: "emp_05", name: "Kano State Agricultural Development Project", sector: "Agriculture", stateCode: "KN", lga: "Nassarawa", categories: ["Agriculture", "Science", "Business"], title: "Agricultural Extension & Research Officer", capacity: 14 },
    { id: "emp_06", name: "Enugu State University Teaching Hospital", sector: "Health", stateCode: "EN", lga: "Enugu North", categories: ["Medical", "Science"], title: "Clinical & Pharmacy Corps Associate", capacity: 12 },
    { id: "emp_07", name: "Akwa Ibom Innovation & ICT Directorate", sector: "Technology", stateCode: "AK", lga: "Uyo", categories: ["ICT", "Engineering", "Business"], title: "Software & E-Governance Corps Fellow", capacity: 14 },
    { id: "emp_08", name: "Kwara State Ministry of Justice", sector: "Legal", stateCode: "KW", lga: "Ilorin West", categories: ["Law", "SocialSciences", "Arts"], title: "Legal Aid & Research Counsel", capacity: 10 },
    { id: "emp_09", name: "Nasarawa State University Demonstration School", sector: "Education", stateCode: "NA", lga: "Keffi", categories: ["Education", "ICT", "Science"], title: "Graduate Assistant & STEM Instructor", capacity: 12 },
    { id: "emp_10", name: "Ogun Industrial Corridor Manufacturing PLC", sector: "Private Sector", stateCode: "OG", lga: "Sagamu", categories: ["Engineering", "Business", "Science"], title: "Operations & Quality Assurance Trainee", capacity: 15 },
    { id: "emp_11", name: "Cross River Tourism & Media Corporation", sector: "Media", stateCode: "CR", lga: "Calabar Municipal", categories: ["Arts", "SocialSciences", "Business"], title: "Communications & Public Affairs Officer", capacity: 12 },
    { id: "emp_12", name: "Edo State Tech Park (EdoBits)", sector: "Technology", stateCode: "ED", lga: "Oredo", categories: ["ICT", "Engineering"], title: "Full-Stack Developer & Trainer", capacity: 12 },
    { id: "emp_13", name: "Anambra State Ministry of Finance", sector: "Finance", stateCode: "AN", lga: "Awka South", categories: ["Business", "SocialSciences", "ICT"], title: "Budget & Revenue Analyst", capacity: 12 },
    { id: "emp_14", name: "Delta State Specialist Hospital, Asaba", sector: "Health", stateCode: "DE", lga: "Oshimili South", categories: ["Medical", "Science"], title: "Medical & Public Health Corps Officer", capacity: 12 },
    { id: "emp_15", name: "Ondo State Agricultural & Cocoa Board", sector: "Agriculture", stateCode: "ON", lga: "Akure South", categories: ["Agriculture", "Business", "Science"], title: "Agronomy & Supply Chain Corps Officer", capacity: 12 },
    { id: "emp_16", name: "Osun State College of Education", sector: "Education", stateCode: "OS", lga: "Ede North", categories: ["Education", "Arts", "SocialSciences"], title: "Assistant Lecturer / Tutor", capacity: 12 },
    { id: "emp_17", name: "Ekiti Knowledge Zone Authority", sector: "Education", stateCode: "EK", lga: "Ado-Ekiti", categories: ["Education", "ICT", "Engineering", "Law"], title: "Research & Policy Corps Analyst", capacity: 12 },
    { id: "emp_18", name: "Bauchi Specialist Hospital & Rural Health", sector: "Health", stateCode: "BA", lga: "Bauchi", categories: ["Medical", "Education", "SocialSciences"], title: "Community Health & Education Corps Member", capacity: 12 },
    { id: "emp_19", name: "Plateau State ICT Development Agency (PICTDA)", sector: "Technology", stateCode: "PL", lga: "Jos North", categories: ["ICT", "Engineering", "Business"], title: "Digital Transformation Corps Fellow", capacity: 10 },
    { id: "emp_20", name: "Kaduna State Urban Planning & Works", sector: "Infrastructure", stateCode: "KD", lga: "Kaduna North", categories: ["Engineering", "Science", "Law"], title: "Civil Works & Compliance Corps Officer", capacity: 10 },
  ];

  // Ensure every state has at least one general/multi-category employer & vacancy so PPA matching works across all states
  for (const t of employerTemplates) {
    employers[t.id] = {
      id: t.id,
      name: t.name,
      sector: t.sector,
      stateCode: t.stateCode,
      lga: t.lga,
      address: `Plot ${Math.floor(rand() * 80) + 10}, Secretariat Road, ${t.lga}`,
      verified: true,
      ownerUid: t.ownerUid,
      contactEmail: `hr@${t.id}.org.ng`,
    };
    const vacId = `vac_${t.id}`;
    vacancies[vacId] = {
      id: vacId,
      employerId: t.id,
      employerName: t.name,
      stateCode: t.stateCode,
      lga: t.lga,
      title: t.title,
      courseCategories: t.categories,
      preferredQualifications: ["B.Sc", "B.Eng", "MBBS", "LL.B", "B.Ed", "HND"],
      capacity: t.capacity,
      filled: 0,
      active: true,
      createdAt: "2026-01-25T10:00:00.000Z",
    };
  }

  // Add a State Secretariat / Universal PPA in every state so no state has 0 vacancies
  for (const s of STATES) {
    const empId = `emp_sec_${s.code.toLowerCase()}`;
    employers[empId] = {
      id: empId,
      name: `${s.name} State Civil Service & Education Board`,
      sector: "Government Ministry",
      stateCode: s.code,
      lga: s.capital,
      address: `State Secretariat Complex, ${s.capital}`,
      verified: true,
      contactEmail: `posting@${s.code.toLowerCase()}.gov.ng`,
    };
    const vacId = `vac_sec_${s.code.toLowerCase()}`;
    vacancies[vacId] = {
      id: vacId,
      employerId: empId,
      employerName: employers[empId].name,
      stateCode: s.code,
      lga: s.capital,
      title: "Graduate Corps Officer (All Disciplines)",
      courseCategories: [], // General fallback + open to all categories
      preferredQualifications: [],
      capacity: 15,
      filled: 0,
      active: true,
      createdAt: "2026-01-26T10:00:00.000Z",
    };
  }

  // 7. NIMC Records, Senate Lists, and Corps Members
  const nimcRecords: Record<string, NimcRecord> = {};
  const senateLists: Record<string, SenateRecord> = {};
  const corpsMembers: Record<string, CorpsMember> = {};

  // Demo Corps Member 1: Amina Bello (VERIFIED, ready for allocation)
  const aminaNin = "12345678901";
  const aminaMatric = "NSUK/SCI/22/0750";
  nimcRecords[aminaNin] = {
    nin: aminaNin,
    surname: "Bello",
    firstName: "Amina",
    dob: "2001-04-12",
    gender: "F",
    stateOfOrigin: "NA",
  };
  senateLists["sen_nsuk_001"] = {
    id: "sen_nsuk_001",
    institutionId: "inst_nsuk",
    matricNo: aminaMatric,
    fullName: "Bello Amina",
    dob: "2001-04-12",
    course: "Computer Science",
    graduationYear: 2025,
    classOfDegree: "Second Class Upper",
    used: true,
    uploadedAt: "2026-01-20T10:00:00.000Z",
    uploadedBy: "usr_inst_nsuk",
  };
  corpsMembers["usr_pcm_001"] = {
    uid: "usr_pcm_001",
    email: "amina.bello@student.nsuk.edu.ng",
    nin: aminaNin,
    matricNo: aminaMatric,
    institutionId: "inst_nsuk",
    institutionName: "Nasarawa State University, Keffi",
    surname: "Bello",
    firstName: "Amina",
    gender: "F",
    dob: "2001-04-12",
    stateOfOrigin: "NA",
    phone: "08031234567",
    course: "Computer Science",
    courseCategory: "ICT",
    qualification: "B.Sc",
    classOfDegree: "Second Class Upper",
    graduationYear: 2025,
    isForeignTrained: false,
    batchId: DEFAULT_BATCH_ID,
    preferences: ["LA", "FC", "OY", "AK"],
    riskConsent: false,
    hasPhoto: true,
    hasCertificate: true,
    status: "VERIFIED",
    flags: [],
    createdAt: "2026-02-01T09:00:00.000Z",
    submittedAt: "2026-02-01T09:30:00.000Z",
    verifiedAt: "2026-02-01T09:30:05.000Z",
  };

  // Demo Corps Member 2: Chinedu Okafor (REGISTERED, ready to test verification in UI)
  const chineduNin = "12345678902";
  const chineduMatric = "UNN/MED/20/0112";
  nimcRecords[chineduNin] = {
    nin: chineduNin,
    surname: "Okafor",
    firstName: "Chinedu",
    dob: "2000-08-22",
    gender: "M",
    stateOfOrigin: "AN",
  };
  senateLists["sen_unn_001"] = {
    id: "sen_unn_001",
    institutionId: "inst_unn",
    matricNo: chineduMatric,
    fullName: "Okafor Chinedu",
    dob: "2000-08-22",
    course: "Medicine and Surgery",
    graduationYear: 2025,
    classOfDegree: "Pass (MBBS)",
    used: false,
    uploadedAt: "2026-01-21T10:00:00.000Z",
    uploadedBy: "usr_admin_hq",
  };
  corpsMembers["usr_pcm_002"] = {
    uid: "usr_pcm_002",
    email: "chinedu.okafor@unn.edu.ng",
    nin: chineduNin,
    matricNo: chineduMatric,
    institutionId: "inst_unn",
    institutionName: "University of Nigeria, Nsukka",
    surname: "Okafor",
    firstName: "Chinedu",
    gender: "M",
    dob: "2000-08-22",
    stateOfOrigin: "AN",
    phone: "08069876543",
    course: "Medicine and Surgery",
    courseCategory: "Medical",
    qualification: "MBBS",
    classOfDegree: "First Class / Distinction",
    graduationYear: 2025,
    isForeignTrained: false,
    batchId: DEFAULT_BATCH_ID,
    preferences: ["FC", "LA", "RI", "OY"],
    riskConsent: false,
    hasPhoto: true,
    hasCertificate: true,
    status: "REGISTERED",
    flags: [],
    createdAt: "2026-02-02T10:00:00.000Z",
  };

  // Generate 48 more verified corps members + 5 flagged members + 15 unused senate list entries
  const domesticInsts = SEED_INSTITUTIONS.filter((i) => i.type !== "foreign");
  const safeStates = STATES.filter((s) => s.defaultRisk === "Low" || s.defaultRisk === "Moderate");

  for (let i = 3; i <= 55; i++) {
    const uid = `usr_pcm_${String(i).padStart(3, "0")}`;
    const nin = `20260000${String(i).padStart(3, "0")}`;
    const gender: "M" | "F" = i % 2 === 0 ? "M" : "F";
    const surname = SURNAMES[i % SURNAMES.length]!;
    const firstName = gender === "M" ? FIRST_NAMES_M[i % FIRST_NAMES_M.length]! : FIRST_NAMES_F[i % FIRST_NAMES_F.length]!;
    const inst = domesticInsts[i % domesticInsts.length]!;
    const originState: StateInfo = STATES[(i * 7) % STATES.length]!;
    const course = ALL_COURSES[(i * 3) % ALL_COURSES.length]!;
    const category = categoryOf(course);
    const qual =
      category === "Medical"
        ? "MBBS"
        : category === "Engineering"
          ? "B.Eng"
          : category === "Law"
            ? "LL.B"
            : inst.type === "polytechnic"
              ? "HND"
              : "B.Sc";
    const matricNo = `${inst.code}/${2021 + (i % 2)}/${String(1000 + i)}`;
    const birthYear = 1998 + (i % 6); // 1998..2003 (ages 23..28 in 2026)
    const dob = `${birthYear}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`;

    // Pick 4 distinct preferred states (never origin)
    const prefs: string[] = [];
    for (let p = 0; p < 12 && prefs.length < 4; p++) {
      const st = safeStates[(i + p * 5) % safeStates.length]!;
      if (st.code !== originState.code && !prefs.includes(st.code)) {
        prefs.push(st.code);
      }
    }

    // Deliberate flagged exceptions for i = 51..55 so Admin Verification Queue has realistic items!
    let status: CorpsMember["status"] = "VERIFIED";
    let flags: CorpsMember["flags"] = [];
    let isForeign = false;
    let memberDob = dob;
    let memberSoo = originState.code;

    if (i === 51) {
      status = "FLAGGED";
      flags = ["NOT_ON_SENATE_LIST"];
    } else if (i === 52) {
      status = "FLAGGED";
      flags = ["NIN_MISMATCH"];
      memberDob = "1999-12-31"; // differs from NIMC
    } else if (i === 53) {
      status = "FLAGGED";
      flags = ["SOO_MISMATCH"];
      memberSoo = originState.code === "LA" ? "KN" : "LA";
    } else if (i === 54) {
      status = "FLAGGED";
      flags = ["FOREIGN_REVIEW"];
      isForeign = true;
    } else if (i === 55) {
      status = "FLAGGED";
      flags = ["OVER_AGE"];
      memberDob = "1993-03-10"; // Over 30 at mobilization
    }

    nimcRecords[nin] = {
      nin,
      surname,
      firstName,
      dob: i === 55 ? "1993-03-10" : dob,
      gender,
      stateOfOrigin: originState.code,
    };

    if (i !== 51) {
      const senId = `sen_${inst.code.toLowerCase()}_${String(i).padStart(3, "0")}`;
      senateLists[senId] = {
        id: senId,
        institutionId: isForeign ? "inst_uk_leeds" : inst.id,
        matricNo,
        fullName: `${surname} ${firstName}`,
        dob: i === 55 ? "1993-03-10" : dob,
        course,
        graduationYear: 2025,
        classOfDegree: "Second Class Upper",
        used: status === "VERIFIED",
        uploadedAt: "2026-01-22T10:00:00.000Z",
        uploadedBy: "usr_inst_nsuk",
      };
    }

    const email = `${firstName.toLowerCase()}.${surname.toLowerCase()}${i}@graduate.edu.ng`;
    users[uid] = {
      uid,
      email,
      displayName: `${firstName} ${surname}`,
      role: "corps_member",
      createdAt: "2026-02-03T10:00:00.000Z",
    };
    userPasswords[email] = "Password123!";

    corpsMembers[uid] = {
      uid,
      email,
      nin,
      matricNo,
      institutionId: isForeign ? "inst_uk_leeds" : inst.id,
      institutionName: isForeign ? "University of Leeds (Foreign-Trained)" : inst.name,
      surname,
      firstName,
      gender,
      dob: memberDob,
      stateOfOrigin: memberSoo,
      phone: `0803${String(1000000 + i)}`,
      course,
      courseCategory: category,
      qualification: qual,
      classOfDegree: "Second Class Upper",
      graduationYear: 2025,
      isForeignTrained: isForeign,
      batchId: DEFAULT_BATCH_ID,
      preferences: prefs,
      riskConsent: i % 9 === 0, // ~11% give informed consent for Critical states
      riskConsentAt: i % 9 === 0 ? "2026-02-03T10:15:00.000Z" : undefined,
      hasPhoto: true,
      hasCertificate: true,
      status,
      flags,
      createdAt: "2026-02-03T10:00:00.000Z",
      submittedAt: "2026-02-03T10:20:00.000Z",
      verifiedAt: status === "VERIFIED" ? "2026-02-03T10:20:05.000Z" : undefined,
    };
  }

  // Also add 5 extra unused senate records + matching NIMC records so anyone registering a brand new account can test automatic verification!
  const testGraduates = [
    { nin: "99000000001", matricNo: "NSUK/CMP/22/0901", surname: "Ibrahim", firstName: "Ogamu", dob: "2002-06-15", gender: "M" as const, soo: "NA", course: "Computer Science", instId: "inst_nsuk" },
    { nin: "99000000002", matricNo: "UNILAG/ENG/22/0402", surname: "Adebayo", firstName: "Tolu", dob: "2001-11-03", gender: "F" as const, soo: "OG", course: "Civil Engineering", instId: "inst_unilag" },
    { nin: "99000000003", matricNo: "ABU/LAW/22/0118", surname: "Suleiman", firstName: "fatima", dob: "2002-02-19", gender: "F" as const, soo: "KD", course: "Law", instId: "inst_abu" },
  ];
  testGraduates.forEach((g, idx) => {
    nimcRecords[g.nin] = {
      nin: g.nin,
      surname: g.surname,
      firstName: g.firstName,
      dob: g.dob,
      gender: g.gender,
      stateOfOrigin: g.soo,
    };
    const senId = `sen_ready_${idx + 1}`;
    senateLists[senId] = {
      id: senId,
      institutionId: g.instId,
      matricNo: g.matricNo,
      fullName: `${g.surname} ${g.firstName}`,
      dob: g.dob,
      course: g.course,
      graduationYear: 2025,
      classOfDegree: "First Class",
      used: false,
      uploadedAt: "2026-02-05T08:00:00.000Z",
      uploadedBy: "usr_inst_nsuk",
    };
  });

  // 8. Security Incidents
  const securityIncidents: Record<string, SecurityIncident> = {
    inc_01: {
      id: "inc_01",
      stateCode: "ZA",
      lga: "Tsafe",
      type: "banditry",
      severity: 5,
      date: "2026-01-18",
      description: "Armed highway blockade along Gusau–Tsafe corridor; night transit suspended for corps members.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-01-18T14:00:00.000Z",
    },
    inc_02: {
      id: "inc_02",
      stateCode: "BO",
      lga: "Konduga",
      type: "terrorism",
      severity: 5,
      date: "2026-01-22",
      description: "Insurgent activity outside Maiduguri perimeter; all postings restricted to Maiduguri Metropolitan with consent.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-01-22T09:30:00.000Z",
    },
    inc_03: {
      id: "inc_03",
      stateCode: "YO",
      lga: "Gujba",
      type: "terrorism",
      severity: 5,
      date: "2026-01-25",
      description: "Security advisory issued for rural LGAs; state remains Critical risk.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-01-25T11:00:00.000Z",
    },
    inc_04: {
      id: "inc_04",
      stateCode: "KD",
      lga: "Chikun",
      type: "kidnapping",
      severity: 4,
      date: "2026-02-01",
      description: "Attempted abduction on outskirts; security escort mandated for camp transit.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-02-01T16:20:00.000Z",
    },
    inc_05: {
      id: "inc_05",
      stateCode: "EB",
      lga: "Afikpo",
      type: "accident",
      severity: 3,
      date: "2026-01-29",
      description: "Road safety alert on Enugu–Abakaliki expressway; daylight travel strictly enforced.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-01-29T13:10:00.000Z",
    },
    inc_06: {
      id: "inc_06",
      stateCode: "PL",
      lga: "Mangu",
      type: "communal",
      severity: 4,
      date: "2026-02-04",
      description: "Inter-communal tension reported; curfew monitored by Joint Task Force.",
      reportedBy: "usr_sec_dss",
      createdAt: "2026-02-04T18:00:00.000Z",
    },
  };

  // 9. Initial Audit Log & Notifications
  const auditLogs: Record<string, AuditLog> = {
    aud_init_01: {
      id: "aud_init_01",
      action: "AHP_WEIGHTS_CONFIGURED",
      actorUid: "usr_admin_hq",
      actorRole: "admin",
      actorName: "Brig. Gen. S. K. Ibrahim (Admin HQ)",
      targetType: "config",
      targetId: "allocation",
      details: {
        weights: DEFAULT_WEIGHTS,
        consistencyRatio: config.allocation.consistencyRatio,
        note: "Initial AHP pairwise comparison matrix verified (CR < 0.10).",
      },
      timestamp: "2026-01-20T09:00:00.000Z",
    },
    aud_init_02: {
      id: "aud_init_02",
      action: "SENATE_LIST_UPLOADED",
      actorUid: "usr_inst_nsuk",
      actorRole: "institution",
      actorName: "Dr. B. A. Ajayi (NSUK Senate Officer)",
      targetType: "institution",
      targetId: "inst_nsuk",
      details: { recordsUploaded: 50, batchId: DEFAULT_BATCH_ID },
      timestamp: "2026-01-22T10:00:00.000Z",
    },
  };

  const notifications: Record<string, Notification> = {
    notif_01: {
      id: "notif_01",
      uid: "usr_pcm_001",
      title: "Identity & Senate List Verification Passed",
      body: "Your NIN (12345678901) and NSUK Senate List record have been verified. You are queued for 2026 Batch A Stream I smart allocation.",
      type: "success",
      link: "/member/dashboard",
      read: false,
      createdAt: "2026-02-01T09:30:05.000Z",
    },
    notif_02: {
      id: "notif_02",
      uid: "usr_pcm_002",
      title: "Complete Your Mobilisation Verification",
      body: "Welcome to NAPS. Review your bio-data, select 4 preferred states, and submit for automatic NIMC + Senate List verification.",
      type: "action",
      link: "/member/profile",
      read: false,
      createdAt: "2026-02-02T10:01:00.000Z",
    },
    notif_03: {
      id: "notif_03",
      uid: "usr_admin_hq",
      title: "49 Verified Corps Members Ready for Allocation",
      body: "2026 Batch A Stream I has 49 verified graduates and 5 flagged exceptions awaiting review.",
      type: "info",
      link: "/admin/allocation",
      read: false,
      createdAt: "2026-02-04T08:00:00.000Z",
    },
  };

  return {
    users,
    userPasswords,
    states,
    camps,
    institutions,
    batches,
    config,
    nimcRecords,
    senateLists,
    corpsMembers,
    employers,
    vacancies,
    securityIncidents,
    auditLogs,
    notifications,
    counters: {},
    userSecrets: {},
  };
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAhp, defaultAhpMatrix } from "../lib/algorithms/ahp";
import { runAllocation } from "../lib/algorithms/allocation";
import { runPpaMatching } from "../lib/algorithms/ppaMatching";
import { topsis } from "../lib/algorithms/topsis";
import { STATES } from "../lib/constants/states";
import { DEFAULT_WEIGHTS } from "../lib/types";
import { runVerificationChecks } from "../lib/verification/checks";

describe("NAPS Core Engines: AHP, TOPSIS, Allocation, PPA Matching & Verification", () => {
  it("computes consistent AHP weights from default pairwise matrix (CR < 0.10)", () => {
    const res = computeAhp(defaultAhpMatrix());
    assert.equal(res.consistent, true);
    assert.ok(res.consistencyRatio < 0.1);
    const sum = res.weights.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-5);
    assert.ok(res.weights[0]! > res.weights[1]!);
    assert.ok(res.weights[1]! > res.weights[2]!);
    assert.ok(res.weights[2]! > res.weights[3]!);
    assert.ok(res.weights[3]! > res.weights[4]!);
  });

  it("ranks TOPSIS alternatives accurately", () => {
    const matrix = [
      [1.0, 0.9, 1.0, 1.0, 0.4],
      [0.33, 0.7, 0.75, 0.33, 0.8],
    ];
    const w = [0.3, 0.25, 0.2, 0.15, 0.1];
    const res = topsis(matrix, w);
    assert.equal(res.ranking[0], 0);
    assert.ok(res.closeness[0]! > res.closeness[1]!);
  });

  it("enforces hard constraints (0 origin violations, 0 Critical without consent, 0 camp overflows) and is reproducible from seed", () => {
    const states = STATES.map((s) => ({ code: s.code, riskLevel: s.defaultRisk }));
    const camps = STATES.map((s) => ({
      id: `camp_${s.code}`,
      stateCode: s.code,
      name: s.campName,
      capacity: 10,
      occupied: 0,
    }));
    const members = Array.from({ length: 40 }, (_, i) => ({
      uid: `m_${i}`,
      stateOfOrigin: STATES[i % STATES.length]!.code,
      courseCategory: "ICT" as const,
      preferences: ["LA", "FC", "OY", "AK"],
      riskConsent: i % 10 === 0,
      institutionCode: "NSUK",
    }));

    const r1 = runAllocation({
      members,
      states,
      camps,
      demand: { LA: { ICT: 15 }, FC: { ICT: 15 } },
      weights: DEFAULT_WEIGHTS,
      seed: 123456,
      batchCode: "26A",
    });

    const r2 = runAllocation({
      members,
      states,
      camps,
      demand: { LA: { ICT: 15 }, FC: { ICT: 15 } },
      weights: DEFAULT_WEIGHTS,
      seed: 123456,
      batchCode: "26A",
    });

    assert.equal(r1.stats.originViolations, 0);
    assert.equal(r1.stats.criticalWithoutConsent, 0);
    assert.equal(r1.stats.campOverflows, 0);
    assert.equal(r1.stats.allocated, 40);
    assert.deepEqual(
      r1.decisions.map((d) => d.stateCode),
      r2.decisions.map((d) => d.stateCode),
    );
  });

  it("matches corps members to PPAs by discipline and capacity", () => {
    const res = runPpaMatching(
      [
        { uid: "u1", stateCode: "LA", courseCategory: "ICT", qualification: "B.Sc" },
        { uid: "u2", stateCode: "LA", courseCategory: "Medical", qualification: "MBBS" },
      ],
      [
        {
          id: "v_ict",
          employerId: "e1",
          employerName: "Tech Hub",
          title: "Software Dev",
          stateCode: "LA",
          lga: "Ikeja",
          courseCategories: ["ICT"],
          preferredQualifications: ["B.Sc"],
          capacity: 2,
          filled: 0,
        },
        {
          id: "v_med",
          employerId: "e2",
          employerName: "General Hospital",
          title: "House Officer",
          stateCode: "LA",
          lga: "Ikeja",
          courseCategories: ["Medical"],
          preferredQualifications: ["MBBS"],
          capacity: 2,
          filled: 0,
        },
      ],
      () => "Low",
    );
    assert.equal(res.stats.matched, 2);
    assert.equal(res.stats.disciplineMatchPct, 100);
    assert.equal(res.matches.find((m) => m.uid === "u1")?.vacancyId, "v_ict");
    assert.equal(res.matches.find((m) => m.uid === "u2")?.vacancyId, "v_med");
  });

  it("flags over-age and senate mismatches in verification checks", () => {
    const passRes = runVerificationChecks({
      member: {
        uid: "u1",
        nin: "12345678901",
        matricNo: "NSUK/001",
        institutionId: "inst_nsuk",
        surname: "Bello",
        firstName: "Amina",
        dob: "2001-04-12",
        stateOfOrigin: "NA",
        course: "Computer Science",
        isForeignTrained: false,
      },
      nimc: {
        nin: "12345678901",
        surname: "Bello",
        firstName: "Amina",
        dob: "2001-04-12",
        gender: "F",
        stateOfOrigin: "NA",
      },
      senate: {
        id: "s1",
        institutionId: "inst_nsuk",
        matricNo: "NSUK/001",
        fullName: "Amina Bello",
        dob: "2001-04-12",
        course: "Computer Science",
        graduationYear: 2025,
        classOfDegree: "Second Class Upper",
        used: false,
        uploadedAt: "2026-01-01",
        uploadedBy: "inst",
      },
      duplicateNinOrMatric: false,
      mobilizationDate: "2026-05-15",
    });
    assert.equal(passRes.passed, true);
    assert.equal(passRes.status, "VERIFIED");

    const overAgeRes = runVerificationChecks({
      member: {
        uid: "u2",
        nin: "12345678909",
        matricNo: "NSUK/002",
        institutionId: "inst_nsuk",
        surname: "Bello",
        firstName: "Musa",
        dob: "1992-01-01",
        stateOfOrigin: "NA",
        course: "Computer Science",
        isForeignTrained: false,
      },
      nimc: null,
      senate: null,
      duplicateNinOrMatric: false,
      mobilizationDate: "2026-05-15",
    });
    assert.equal(overAgeRes.passed, false);
    assert.ok(overAgeRes.flags.includes("OVER_AGE"));
    assert.ok(overAgeRes.flags.includes("NIN_NOT_FOUND"));
    assert.ok(overAgeRes.flags.includes("NOT_ON_SENATE_LIST"));
  });
});

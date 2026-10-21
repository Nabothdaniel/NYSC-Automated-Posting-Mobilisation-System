# NAPS — NYSC Automated Posting System

**A Multi-Criteria Decision Support & Mobilisation Platform for the National Youth Service Corps (NYSC)**

NAPS is a full-stack web application built with **Next.js 15 (App Router, TypeScript, Tailwind CSS)** and **Firebase (Authentication & Cloud Firestore)** that automates the verification, state deployment, orientation camp assignment, and skills-based Place of Primary Assignment (PPA) matching of Prospective Corps Members (PCMs) across all 36 Nigerian states and the FCT.

---

## Key Features

1. **Automated Identity & Credential Verification (`NIMC` + `School Senate List`)**
   - Cross-verifies graduate bio-data and National Identification Number (NIN) against the identity registry and university/polytechnic Senate Lists using Jaro-Winkler fuzzy name matching (`>= 0.88`).
   - Automatically flags age over 30, duplicate registrations, foreign-trained credentials, and unverified records for audited administrative review.

2. **Explainable State & Orientation Camp Posting (`AHP` + `TOPSIS`)**
   - **Analytic Hierarchy Process (AHP):** Allows the NYSC Directorate to configure pairwise policy priorities across 5 criteria and validates consistency (`CR < 0.10`):
     - State Security & Safety (`30%`)
     - Need for Graduate's Course of Study (`25%`)
     - Graduate's Preferred States (`20%`)
     - National Unity / Geopolitical Zone Balance (`15%`)
     - Orientation Camp Capacity (`10%`)
   - **TOPSIS Ranking + Statutory Hard Constraints:** Enforces **zero home-state postings** (NYSC Act Cap N84), **blocks Critical-risk states** unless the graduate grants informed consent, and prevents **orientation camp overflow**.
   - **Deterministic & Auditable (`Mulberry32 PRNG`):** Every batch run uses a recorded numeric audit code (seed) so independent auditors can replay and verify that zero manual tampering occurred.

3. **Real-Time State Security Risk Intelligence (`OpenStreetMap` + `Leaflet`)**
   - Interactive 37-state Nigeria risk map displaying `Low`, `Moderate`, `High`, and `Critical` ratings, camp bed occupancy, and field security incidents.

4. **Skills-Based Workplace (PPA) Matching**
   - Matches posted corps members to verified employers (schools, hospitals, ministries, tech hubs) in their deployed state based on academic discipline (`50%`), LGA safety (`20%`), degree qualification (`20%`), and open slot ratio (`10%`).
   - Supports one-time audited alternative PPA requests and employer assumption-of-duty confirmation (`DEPLOYED`).

5. **QR-Verified PDF Call-Up Letters & Immutable Audit Trail**
   - Generates official PDF Call-Up & Deployment Letters (`pdf-lib` + `qrcode`) linked to a public verification endpoint (`/verify/[callUpNo]`).
   - Enforces TOTP Two-Factor Authentication (`otplib`) for Admin and Auditor roles and logs every action to an append-only audit trail.

---

## 6 Interconnected Role Portals

| Role | Demo Email | Demo Password | Portal Route |
| :--- | :--- | :--- | :--- |
| **Prospective Corps Member** | `pcm@naps.nysc.gov.ng` | `Password123!` | `/member/dashboard` |
| **NYSC Administrator (HQ)** | `admin@naps.nysc.gov.ng` | `Password123!` | `/admin/dashboard` |
| **Accredited Institution (NSUK)** | `institution@nsuk.edu.ng` | `Password123!` | `/institution/dashboard` |
| **Verified Employer (PPA)** | `employer@lagosppa.org.ng` | `Password123!` | `/employer/dashboard` |
| **Security Liaison Officer** | `security@naps.nysc.gov.ng` | `Password123!` | `/security/dashboard` |
| **Independent Auditor** | `auditor@naps.nysc.gov.ng` | `Password123!` | `/admin/dashboard` |

---

## Quick Start (Local Development)

```bash
cd naps
npm install
npm run seed   # Seeds 6 demo accounts, 37 states/camps, 50 graduates, Senate lists & PPA vacancies
npm run dev    # Starts on http://localhost:3000
```

> **Zero-Config Local & Serverless Fallback:** If Firebase environment variables are not set in `.env.local`, NAPS automatically uses a pre-seeded local JSON store (`.local-naps-db.json` locally or `/tmp/.local-naps-db.json` on Vercel) so the full workflow works out of the box.

### Run Unit Tests
```bash
cd naps
npm test
```

---

## Deployment (Vercel + Firebase Free Spark Plan)

1. Push this repository to GitHub and import it into [Vercel](https://vercel.com) with the **Root Directory** set to `naps`.
2. *(Optional for persistent cloud storage)* Create a free [Firebase](https://console.firebase.google.com) project, enable **Email/Password Auth** and **Cloud Firestore**, copy the keys from `.env.example` into Vercel's Environment Variables, and run `npm run seed` once to populate Cloud Firestore.

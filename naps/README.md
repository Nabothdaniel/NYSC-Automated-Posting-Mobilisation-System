# NAPS — NYSC Automated Posting & Mobilisation System



---

## Quick Start (Works Out-of-the-Box!)

```bash
cd naps
npm run seed    # Seeds .local-naps-db.json with 37 states, 37 camps, 16 institutions, 55 PCMs & 57 PPA vacancies
npm test        # Runs AHP, TOPSIS, Allocation, PPA Matching & Verification unit tests
npm run dev     # Starts the app at http://localhost:3000
```

> **Zero-Config Local Mode + Full Firebase Support:**  
> If `.env.local` has no Firebase credentials yet, `lib/firebase/admin.ts` automatically falls back to a file-backed Firestore & Auth store (`.local-naps-db.json`). When you add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` to `.env.local`, it switches automatically to Google Cloud Firestore & Firebase Auth.

---

## One-Click Demo Accounts (`/login`)

All demo accounts use password `Password123!` and can be clicked directly on the `/login` page:

| Role | Email | Portal Route |
|------|-------|--------------|
| **NYSC Administrator (HQ)** | `admin@nysc.gov.ng` | `/admin/dashboard` |
| **Prospective Corps Member (Verified)** | `amina.bello@student.nsuk.edu.ng` | `/member/dashboard` |
| **Prospective Corps Member (New)** | `chinedu.okafor@unn.edu.ng` | `/member/profile` |
| **Institution Official (NSUK Senate)** | `senate@nsuk.edu.ng` | `/institution/dashboard` |
| **Employer (PPA)** | `hr@fmclagos.gov.ng` | `/employer/dashboard` |
| **Security Agency Liaison** | `ops@security.gov.ng` | `/security/dashboard` |
| **Independent Auditor** | `audit@icpc.gov.ng` | `/admin/dashboard` (Read-Only) |

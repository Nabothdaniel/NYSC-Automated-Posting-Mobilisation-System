/**
 * k6 Load & Scalability Verification Script (Objective 8 — Section 3.4)
 * Run with: k6 run load/k6-allocation.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "15s", target: 50 },
    { duration: "30s", target: 200 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function runLoadTest() {
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    "landing page status 200": (r) => r.status === 200,
  });

  const verifyRes = http.get(`${BASE_URL}/verify/NYSC%2FNSUK%2F26AI%2F00001`);
  check(verifyRes, {
    "call-up QR verification status 200": (r) => r.status === 200,
  });

  sleep(0.5);
}

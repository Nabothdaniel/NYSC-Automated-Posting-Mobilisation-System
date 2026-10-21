import type { RiskLevel } from "./states";

export const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High", "Critical"];

/** Security criterion score (benefit: safer = higher). Critical is filtered unless consent. */
export const RISK_SCORE: Record<RiskLevel, number> = {
  Low: 1,
  Moderate: 0.66,
  High: 0.33,
  Critical: 0.05,
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  Low: "#16a34a",
  Moderate: "#eab308",
  High: "#f97316",
  Critical: "#dc2626",
};

export const RISK_BADGE: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-800 border-green-200",
  Moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
};

export const SECURITY_BRIEFING: Record<RiskLevel, string[]> = {
  Low: [
    "Standard travel precautions apply.",
    "Travel during daylight hours using registered transport operators.",
  ],
  Moderate: [
    "Travel only during daylight hours (6am – 6pm).",
    "Use NYSC-recommended transport parks and share your itinerary with family.",
    "Report to the State Secretariat within 24 hours of arrival.",
  ],
  High: [
    "Avoid night travel entirely; use convoy arrangements where announced.",
    "Do not travel through flagged LGAs without security escort.",
    "Keep emergency contacts saved: NYSC Emergency 0800-NYSC-HELP, Police 112.",
    "Check in with your LGI (Local Government Inspector) weekly.",
  ],
  Critical: [
    "You opted in to service in a Critical-risk state with informed consent.",
    "Enhanced protection: posting restricted to state capital / secured PPAs only.",
    "Mandatory weekly check-in with the State Secretariat.",
    "Emergency: NYSC 0800-NYSC-HELP, Police 112, DSS hotline.",
  ],
};

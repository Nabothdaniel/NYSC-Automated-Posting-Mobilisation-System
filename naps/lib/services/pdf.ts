import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { SECURITY_BRIEFING } from "../constants/risk";
import { stateName, STATE_BY_CODE } from "../constants/states";
import type { CorpsMember, RiskLevel } from "../types";

export async function generateCallUpPdf(opts: {
  member: CorpsMember;
  riskLevel: RiskLevel;
  batchName: string;
  mobilizationDate: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const { member, riskLevel, batchName, mobilizationDate, verifyUrl } = opts;
  const alloc = member.allocation;
  if (!alloc) throw new Error("Member has not been allocated a state yet.");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);

  const green = rgb(0.05, 0.42, 0.22);
  const dark = rgb(0.1, 0.12, 0.15);
  const muted = rgb(0.38, 0.42, 0.46);

  // Header Banner
  page.drawRectangle({ x: 0, y: 755, width: 595.28, height: 86.89, color: green });
  page.drawText("NATIONAL YOUTH SERVICE CORPS (NYSC)", {
    x: 40,
    y: 805,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("AUTOMATED POSTING & MOBILISATION SYSTEM (NAPS)", {
    x: 40,
    y: 785,
    size: 10,
    font: fontReg,
    color: rgb(0.86, 0.96, 0.89),
  });
  page.drawText(`OFFICIAL CALL-UP LETTER — ${batchName.toUpperCase()}`, {
    x: 40,
    y: 767,
    size: 10,
    font: fontBold,
    color: rgb(1, 0.92, 0.55),
  });

  // QR Code
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 110, margin: 1 });
  const qrImage = await pdf.embedPng(qrBuffer);
  page.drawImage(qrImage, { x: 455, y: 630, width: 95, height: 95 });
  page.drawText("SCAN TO VERIFY", { x: 468, y: 618, size: 8, font: fontBold, color: green });

  let y = 720;
  const drawField = (label: string, value: string, xOffset = 40) => {
    page.drawText(label, { x: xOffset, y, size: 9, font: fontBold, color: muted });
    page.drawText(value, { x: xOffset + 135, y, size: 10, font: fontBold, color: dark });
    y -= 20;
  };

  drawField("CALL-UP NUMBER:", alloc.callUpNo);
  drawField("FULL NAME:", `${member.surname.toUpperCase()}, ${member.firstName} ${member.otherNames || ""}`.trim());
  drawField("GENDER / DOB:", `${member.gender === "M" ? "Male" : "Female"}  |  ${member.dob}`);
  drawField("STATE OF ORIGIN:", `${stateName(member.stateOfOrigin)} (${member.stateOfOrigin})`);
  drawField("INSTITUTION:", member.institutionName);
  drawField("MATRIC / NIN:", `${member.matricNo}  |  NIN: ${member.nin}`);
  drawField("COURSE OF STUDY:", `${member.course} (${member.qualification})`);

  y -= 10;
  page.drawRectangle({ x: 36, y: y - 92, width: 523, height: 100, color: rgb(0.95, 0.98, 0.96), borderColor: green, borderWidth: 1 });
  y -= 16;
  page.drawText("DEPLOYMENT & ORIENTATION CAMP DIRECTIVE", { x: 48, y, size: 11, font: fontBold, color: green });
  y -= 20;
  drawField("DEPLOYED STATE:", `${stateName(alloc.stateCode)} (${STATE_BY_CODE[alloc.stateCode]?.zone || ""} Zone)`, 48);
  drawField("ORIENTATION CAMP:", alloc.campName, 48);
  drawField("REPORTING DATE:", `${mobilizationDate}  |  MCDM Closeness Score: ${alloc.score}`, 48);

  y -= 24;
  if (member.ppa) {
    page.drawRectangle({ x: 36, y: y - 72, width: 523, height: 80, color: rgb(0.96, 0.97, 1), borderColor: rgb(0.2, 0.35, 0.7), borderWidth: 1 });
    y -= 16;
    page.drawText("PLACE OF PRIMARY ASSIGNMENT (PPA) POSTING", { x: 48, y, size: 11, font: fontBold, color: rgb(0.15, 0.3, 0.65) });
    y -= 20;
    drawField("EMPLOYER (PPA):", `${member.ppa.employerName} (${member.ppa.lga} LGA)`, 48);
    drawField("ROLE & MATCH SCORE:", `${member.ppa.title}  |  Match Score: ${member.ppa.score}`, 48);
    y -= 18;
  }

  // Security Advisory Box
  page.drawText(`STATE SECURITY RISK ADVISORY (CURRENT LEVEL: ${riskLevel.toUpperCase()})`, {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: dark,
  });
  y -= 16;
  const briefings = SECURITY_BRIEFING[riskLevel] ?? SECURITY_BRIEFING.Moderate;
  for (const line of briefings) {
    page.drawText(`• ${line}`, { x: 46, y, size: 9, font: fontReg, color: dark });
    y -= 15;
  }

  y -= 15;
  page.drawText("ALGORITHMIC INTEGRITY GUARANTEE", { x: 40, y, size: 9, font: fontBold, color: green });
  y -= 14;
  page.drawText(
    "This posting was generated automatically by the NAPS AHP + TOPSIS Multi-Criteria Decision Engine.",
    { x: 40, y, size: 8.5, font: fontReg, color: muted },
  );
  y -= 12;
  page.drawText(
    `State-of-origin exclusion and security constraints were strictly enforced. Verify authenticity at: ${verifyUrl}`,
    { x: 40, y, size: 8.5, font: fontReg, color: muted },
  );

  page.drawText(`Generated: ${new Date().toISOString()}  |  Run ID: ${alloc.runId}`, {
    x: 40,
    y: 35,
    size: 8,
    font: fontReg,
    color: muted,
  });

  return pdf.save();
}

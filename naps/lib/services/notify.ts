import "server-only";
import { db, nowIso } from "../firebase/admin";
import type { Notification } from "../types";

export interface SendNotificationInput {
  uid: string;
  title: string;
  body: string;
  type?: Notification["type"];
  link?: string;
  email?: string;
  phone?: string;
}

export async function notifyUser(input: SendNotificationInput): Promise<Notification> {
  const ref = db().collection("notifications").doc();
  const notif: Notification = {
    id: ref.id,
    uid: input.uid,
    title: input.title,
    body: input.body,
    type: input.type ?? "info",
    link: input.link,
    read: false,
    createdAt: nowIso(),
  };
  await ref.set(notif as unknown as Record<string, unknown>);

  if (input.email) {
    await sendBrevoEmail({
      toEmail: input.email,
      subject: `[NYSC NAPS] ${input.title}`,
      textContent: `${input.body}\n\nPortal: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${input.link || ""}`,
    });
  }

  if (input.phone) {
    await sendBrevoSms({
      toPhone: input.phone,
      content: `NYSC NAPS: ${input.title} - ${input.body.slice(0, 120)}`,
    });
  }

  return notif;
}

export async function sendBrevoEmail(opts: { toEmail: string; subject: string; textContent: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@naps-nysc.gov.ng";
  const senderName = process.env.BREVO_SENDER_NAME || "NYSC Automated Posting System (NAPS)";

  if (!apiKey) {
    console.info(`[NAPS Email Fallback -> ${opts.toEmail}] ${opts.subject}`);
    return { simulated: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: opts.toEmail }],
        subject: opts.subject,
        textContent: opts.textContent,
      }),
    });
    return { simulated: false, status: res.status };
  } catch (err) {
    console.warn("[NAPS Brevo Email Error]", err);
    return { simulated: true, error: String(err) };
  }
}

export async function sendBrevoSms(opts: { toPhone: string; content: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || process.env.BREVO_SMS_ENABLED !== "true") {
    console.info(`[NAPS SMS Simulated -> ${opts.toPhone}] ${opts.content}`);
    return { simulated: true };
  }
  try {
    const recipient = opts.toPhone.startsWith("0") ? `+234${opts.toPhone.slice(1)}` : opts.toPhone;
    const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: "NYSC-NAPS",
        recipient,
        content: opts.content,
      }),
    });
    return { simulated: false, status: res.status };
  } catch (err) {
    console.warn("[NAPS Brevo SMS Error]", err);
    return { simulated: true };
  }
}

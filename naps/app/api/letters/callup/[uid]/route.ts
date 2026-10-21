import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";
import { generateCallUpPdf } from "@/lib/services/pdf";
import type { Batch, CorpsMember, StateDoc } from "@/lib/types";

export async function GET(
  req: Request,
  context: { params: Promise<{ uid: string }> },
) {
  try {
    const { uid } = await context.params;
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (
      sessionUser.role === "corps_member" &&
      sessionUser.uid !== uid
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberSnap = await db().collection("corpsMembers").doc(uid).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Corps member not found" }, { status: 404 });
    }
    const member = memberSnap.data() as CorpsMember;
    if (!member.allocation) {
      return NextResponse.json({ error: "Call-up letter is only available after state allocation." }, { status: 400 });
    }

    const [stateSnap, batchSnap] = await Promise.all([
      db().collection("states").doc(member.allocation.stateCode).get(),
      db().collection("batches").doc(member.batchId).get(),
    ]);
    const stateDoc = stateSnap.data() as StateDoc | undefined;
    const batchDoc = batchSnap.data() as Batch | undefined;

    const origin = new URL(req.url).origin;
    const encodedCallUp = encodeURIComponent(member.allocation.callUpNo);
    const verifyUrl = `${origin}/verify/${encodedCallUp}`;

    const pdfBytes = await generateCallUpPdf({
      member,
      riskLevel: stateDoc?.riskLevel ?? "Moderate",
      batchName: batchDoc?.name ?? "2026 Batch A Stream I",
      mobilizationDate: batchDoc?.mobilizationDate ?? "2026-05-15",
      verifyUrl,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="NYSC-CallUp-${member.surname}-${member.uid}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

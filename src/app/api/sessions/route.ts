import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSession, listSessions } from "@/lib/dal";
import { getBankIdClient } from "@/lib/bankid";
import { createPendingOrder } from "@/lib/dal";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agreements, beforeNotes } = body;

    if (!Array.isArray(agreements) || agreements.length === 0) {
      return NextResponse.json(
        { error: "Minst en överenskommelse krävs" },
        { status: 400 }
      );
    }

    // Generate a short share token for partner invitation
    const shareToken = randomBytes(12).toString("base64url");

    // Create the session in the database
    const session = await createSession({
      agreements,
      beforeNotes,
      shareToken,
    });

    // Build the text that will be signed by BankID
    const signText = buildConsentText(agreements, session.id);

    // Initiate BankID sign for the initiator
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
    const bankid = getBankIdClient();
    const signResponse = await bankid.sign({
      userVisibleData: signText,
      endUserIp: clientIp,
    });

    // Store the pending BankID order
    await createPendingOrder({
      orderRef: signResponse.orderRef,
      sessionId: session.id,
      signerRole: "initiator",
      action: "consent",
      autoStartToken: signResponse.autoStartToken,
      qrStartToken: signResponse.qrStartToken,
      qrStartSecret: signResponse.qrStartSecret,
    });

    // Audit log
    await logAuditEvent({
      sessionId: session.id,
      eventType: "session_created",
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      shareToken: session.share_token,
      orderRef: signResponse.orderRef,
      autoStartToken: signResponse.autoStartToken,
      qrStartToken: signResponse.qrStartToken,
      qrStartSecret: signResponse.qrStartSecret,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Kunde inte skapa session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta sessioner" },
      { status: 500 }
    );
  }
}

function buildConsentText(agreements: string[], sessionId: string): string {
  const lines = [
    "Samtycke - Concent",
    "",
    "Jag samtycker till följande:",
    ...agreements.map((a) => `- ${a}`),
    "",
    `Session: ${sessionId.slice(0, 8)}`,
    `Tidpunkt: ${new Date().toLocaleString("sv-SE")}`,
  ];
  return lines.join("\n");
}

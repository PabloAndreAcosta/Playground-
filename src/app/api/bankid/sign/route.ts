import { NextRequest, NextResponse } from "next/server";
import { getBankIdClient } from "@/lib/bankid";
import { getSession, createPendingOrder } from "@/lib/dal";
import type { SignerRole, SignAction } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, role, action } = body as {
      sessionId: string;
      role: SignerRole;
      action: SignAction;
    };

    if (!sessionId || !role || !action) {
      return NextResponse.json(
        { error: "sessionId, role och action krävs" },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session hittades inte" },
        { status: 404 }
      );
    }

    // Build the text to be signed based on action
    const signText = buildSignText(
      action,
      session.agreements as string[],
      session.id
    );

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
    const bankid = getBankIdClient();
    const signResponse = await bankid.sign({
      userVisibleData: signText,
      endUserIp: clientIp,
    });

    // Store the pending order
    await createPendingOrder({
      orderRef: signResponse.orderRef,
      sessionId,
      signerRole: role,
      action,
      autoStartToken: signResponse.autoStartToken,
      qrStartToken: signResponse.qrStartToken,
      qrStartSecret: signResponse.qrStartSecret,
    });

    return NextResponse.json({
      orderRef: signResponse.orderRef,
      autoStartToken: signResponse.autoStartToken,
      qrStartToken: signResponse.qrStartToken,
      qrStartSecret: signResponse.qrStartSecret,
    });
  } catch (error) {
    console.error("Failed to initiate BankID sign:", error);
    return NextResponse.json(
      { error: "Kunde inte starta BankID-signering" },
      { status: 500 }
    );
  }
}

function buildSignText(
  action: SignAction,
  agreements: string[],
  sessionId: string
): string {
  const timestamp = new Date().toLocaleString("sv-SE");
  const sessionRef = sessionId.slice(0, 8);

  switch (action) {
    case "consent":
      return [
        "Samtycke - Concent",
        "",
        "Jag samtycker till följande:",
        ...agreements.map((a) => `- ${a}`),
        "",
        `Session: ${sessionRef}`,
        `Tidpunkt: ${timestamp}`,
      ].join("\n");

    case "confirm":
      return [
        "Bekräftelse - Concent",
        "",
        "Jag bekräftar att allt gick bra och att jag är nöjd med hur det gick.",
        "",
        `Session: ${sessionRef}`,
        `Tidpunkt: ${timestamp}`,
      ].join("\n");

    case "withdraw":
      return [
        "Återkallande av samtycke - Concent",
        "",
        "Jag återkallar mitt samtycke för denna session.",
        "",
        `Session: ${sessionRef}`,
        `Tidpunkt: ${timestamp}`,
      ].join("\n");
  }
}

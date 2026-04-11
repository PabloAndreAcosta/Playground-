import { NextRequest, NextResponse } from "next/server";
import { getSessionByShareToken } from "@/lib/dal";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await getSessionByShareToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "Inbjudan hittades inte" },
        { status: 404 }
      );
    }

    if (session.status === "withdrawn") {
      return NextResponse.json(
        { error: "Samtycke har återkallats" },
        { status: 410 }
      );
    }

    if (session.partner_name) {
      return NextResponse.json(
        { error: "Partner har redan anslutit" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      initiatorName: session.initiator_name,
      agreements: session.agreements,
      beforeNotes: session.before_notes,
      createdAt: session.created_at,
    });
  } catch (error) {
    console.error("Failed to resolve invite:", error);
    return NextResponse.json(
      { error: "Kunde inte hitta inbjudan" },
      { status: 500 }
    );
  }
}

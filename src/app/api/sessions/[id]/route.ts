import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getSignaturesForSession,
  getAuditLog,
  deleteSession,
} from "@/lib/dal";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: "Session hittades inte" },
        { status: 404 }
      );
    }

    const signatures = await getSignaturesForSession(id);
    const auditLog = await getAuditLog(id);

    // Strip encrypted PNR data from response — never send to client
    const safeSignatures = signatures.map((sig) => ({
      id: sig.id,
      signerRole: sig.signer_role,
      action: sig.action,
      signerName: sig.signer_name,
      signedText: sig.signed_text,
      completedAt: sig.completed_at,
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        initiatorName: session.initiator_name,
        partnerName: session.partner_name,
        agreements: session.agreements,
        beforeNotes: session.before_notes,
        afterNotes: session.after_notes,
        initiatorConfirmedAfter: session.initiator_confirmed_after,
        partnerConfirmedAfter: session.partner_confirmed_after,
        withdrawnBy: session.withdrawn_by,
        shareToken: session.share_token,
        createdAt: session.created_at,
        consentGivenAt: session.consent_given_at,
        confirmationAt: session.confirmation_at,
        withdrawnAt: session.withdrawn_at,
      },
      signatures: safeSignatures,
      auditLog,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await logAuditEvent({
      sessionId: id,
      eventType: "session_deleted",
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    await deleteSession(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Kunde inte ta bort session" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getBankIdClient, computeQrData } from "@/lib/bankid";
import {
  getPendingOrder,
  updatePendingOrderStatus,
  getSession,
  updateSession,
  storeSignature,
} from "@/lib/dal";
import { encryptPnr } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderRef } = body;

    if (!orderRef) {
      return NextResponse.json(
        { error: "orderRef krävs" },
        { status: 400 }
      );
    }

    const pendingOrder = await getPendingOrder(orderRef);
    if (!pendingOrder) {
      return NextResponse.json(
        { error: "Order hittades inte" },
        { status: 404 }
      );
    }

    // Calculate QR data for animated QR code
    const secondsElapsed = Math.floor(
      (Date.now() - new Date(pendingOrder.created_at).getTime()) / 1000
    );
    const qrData = computeQrData(
      pendingOrder.qr_start_token,
      pendingOrder.qr_start_secret,
      secondsElapsed
    );

    // Poll BankID
    const bankid = getBankIdClient();
    const collectResponse = await bankid.collect(orderRef);

    if (collectResponse.status === "complete" && collectResponse.completionData) {
      // Mark order as complete
      await updatePendingOrderStatus(orderRef, "complete");

      const completion = collectResponse.completionData;
      const { encrypted, iv } = encryptPnr(completion.user.personalNumber);
      const ipAddress =
        request.headers.get("x-forwarded-for") ?? undefined;

      // Store the BankID signature
      await storeSignature({
        sessionId: pendingOrder.session_id,
        signerRole: pendingOrder.signer_role as "initiator" | "partner",
        action: pendingOrder.action as "consent" | "confirm" | "withdraw",
        bankidOrderRef: orderRef,
        signature: completion.signature,
        ocspResponse: completion.ocspResponse,
        signedText: "", // The signed text is in the signature XML
        signerName: completion.user.name,
        signerPnrEncrypted: encrypted,
        signerPnrIv: iv,
        ipAddress,
      });

      // Update the session based on action and role
      await handleCompletion(
        pendingOrder.session_id,
        pendingOrder.signer_role,
        pendingOrder.action,
        completion.user.name,
        encrypted,
        iv,
        ipAddress
      );

      return NextResponse.json({
        status: "complete",
        completionData: {
          name: completion.user.name,
          givenName: completion.user.givenName,
          surname: completion.user.surname,
        },
      });
    }

    if (collectResponse.status === "failed") {
      await updatePendingOrderStatus(orderRef, "failed");

      return NextResponse.json({
        status: "failed",
        hintCode: collectResponse.hintCode,
      });
    }

    // Still pending
    return NextResponse.json({
      status: "pending",
      hintCode: collectResponse.hintCode,
      qrData,
      autoStartToken: pendingOrder.auto_start_token,
    });
  } catch (error) {
    console.error("Failed to collect BankID:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta BankID-status" },
      { status: 500 }
    );
  }
}

async function handleCompletion(
  sessionId: string,
  signerRole: string,
  action: string,
  signerName: string,
  pnrEncrypted: string,
  pnrIv: string,
  ipAddress?: string
) {
  const session = await getSession(sessionId);
  if (!session) return;

  const now = new Date().toISOString();

  if (action === "consent") {
    if (signerRole === "initiator") {
      await updateSession(sessionId, {
        status: "pending_partner",
        initiator_name: signerName,
        initiator_pnr_encrypted: pnrEncrypted,
        initiator_pnr_iv: pnrIv,
      });
      await logAuditEvent({
        sessionId,
        eventType: "consent_signed",
        actorRole: "initiator",
        actorName: signerName,
        ipAddress,
      });
    } else if (signerRole === "partner") {
      await updateSession(sessionId, {
        status: "consented",
        partner_name: signerName,
        partner_pnr_encrypted: pnrEncrypted,
        partner_pnr_iv: pnrIv,
        consent_given_at: now,
      });
      await logAuditEvent({
        sessionId,
        eventType: "consent_signed",
        actorRole: "partner",
        actorName: signerName,
        ipAddress,
      });
    }
  } else if (action === "confirm") {
    const updates: Record<string, unknown> = {};
    if (signerRole === "initiator") {
      updates.initiator_confirmed_after = true;
    } else {
      updates.partner_confirmed_after = true;
    }

    // Check if both have confirmed
    const otherConfirmed =
      signerRole === "initiator"
        ? session.partner_confirmed_after
        : session.initiator_confirmed_after;

    if (otherConfirmed) {
      updates.status = "confirmed";
      updates.confirmation_at = now;
    }

    await updateSession(sessionId, updates as Parameters<typeof updateSession>[1]);
    await logAuditEvent({
      sessionId,
      eventType: "confirmation_signed",
      actorRole: signerRole,
      actorName: signerName,
      ipAddress,
    });
  } else if (action === "withdraw") {
    await updateSession(sessionId, {
      status: "withdrawn",
      withdrawn_by: signerName,
      withdrawn_at: now,
    });
    await logAuditEvent({
      sessionId,
      eventType: "consent_withdrawn" as AuditEventType,
      actorRole: signerRole,
      actorName: signerName,
      ipAddress,
    });
  }
}

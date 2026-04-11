import { NextRequest, NextResponse } from "next/server";
import { getBankIdClient } from "@/lib/bankid";
import { updatePendingOrderStatus } from "@/lib/dal";

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

    const bankid = getBankIdClient();
    await bankid.cancel(orderRef);
    await updatePendingOrderStatus(orderRef, "failed");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel BankID:", error);
    return NextResponse.json(
      { error: "Kunde inte avbryta BankID" },
      { status: 500 }
    );
  }
}

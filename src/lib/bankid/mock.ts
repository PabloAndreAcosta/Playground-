import { randomBytes, randomUUID } from "crypto";
import type {
  BankIdClient,
  BankIdSignRequest,
  BankIdSignResponse,
  BankIdCollectResponse,
  BankIdCompletionData,
} from "./types";

/**
 * Mock BankID client for development without real certificates.
 *
 * Simulates the full BankID sign flow:
 * - sign() returns fake tokens immediately
 * - collect() returns "pending" for a few seconds, then "complete"
 * - cancel() is a no-op
 *
 * Uses test personnummer 190000000000 (Karl Karlsson).
 */

interface MockOrder {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
  userVisibleData: string;
  createdAt: number;
}

const MOCK_DELAY_MS = 4000; // 4 seconds before "complete"
const pendingOrders = new Map<string, MockOrder>();

const MOCK_USERS = [
  {
    personalNumber: "190000000000",
    name: "Karl Karlsson",
    givenName: "Karl",
    surname: "Karlsson",
  },
  {
    personalNumber: "200000000000",
    name: "Anna Andersson",
    givenName: "Anna",
    surname: "Andersson",
  },
];

let userIndex = 0;

export function createMockBankIdClient(): BankIdClient {
  console.log("[BankID Mock] Using mock BankID client - no real signatures");

  return {
    async sign(request: BankIdSignRequest): Promise<BankIdSignResponse> {
      const orderRef = randomUUID();
      const autoStartToken = randomBytes(16).toString("hex");
      const qrStartToken = randomBytes(16).toString("hex");
      const qrStartSecret = randomBytes(32).toString("hex");

      const order: MockOrder = {
        orderRef,
        autoStartToken,
        qrStartToken,
        qrStartSecret,
        userVisibleData: request.userVisibleData,
        createdAt: Date.now(),
      };

      pendingOrders.set(orderRef, order);

      console.log(`[BankID Mock] Sign initiated: ${orderRef}`);

      return {
        orderRef,
        autoStartToken,
        qrStartToken,
        qrStartSecret,
      };
    },

    async collect(orderRef: string): Promise<BankIdCollectResponse> {
      const order = pendingOrders.get(orderRef);

      if (!order) {
        return {
          orderRef,
          status: "failed",
          hintCode: "expiredTransaction",
        };
      }

      const elapsed = Date.now() - order.createdAt;

      // Simulate pending state for a few seconds
      if (elapsed < MOCK_DELAY_MS) {
        const hintCode =
          elapsed < 2000 ? "outstandingTransaction" : "userSign";

        return {
          orderRef,
          status: "pending",
          hintCode,
        };
      }

      // Complete! Return mock user data
      pendingOrders.delete(orderRef);

      // Alternate between mock users so initiator and partner get different names
      const user = MOCK_USERS[userIndex % MOCK_USERS.length];
      userIndex++;

      const completionData: BankIdCompletionData = {
        user: {
          personalNumber: user.personalNumber,
          name: user.name,
          givenName: user.givenName,
          surname: user.surname,
        },
        device: {
          ipAddress: "127.0.0.1",
          uhi: "MOCK-UHI",
        },
        bankIdIssueDate: "2024-01-01",
        signature: `MOCK-SIGNATURE-${orderRef}`,
        ocspResponse: `MOCK-OCSP-${orderRef}`,
      };

      console.log(
        `[BankID Mock] Sign completed: ${orderRef} -> ${user.name}`
      );

      return {
        orderRef,
        status: "complete",
        completionData,
      };
    },

    async cancel(orderRef: string): Promise<void> {
      pendingOrders.delete(orderRef);
      console.log(`[BankID Mock] Cancelled: ${orderRef}`);
    },
  };
}

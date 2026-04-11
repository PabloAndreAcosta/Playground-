import { BankIdClient as BankIdSDK } from "bankid";
import type {
  BankIdClient,
  BankIdSignRequest,
  BankIdSignResponse,
  BankIdCollectResponse,
  BankIdCompletionData,
} from "./types";
import { readFileSync } from "fs";

export function createBankIdClient(): BankIdClient {
  const pfxPath = process.env.BANKID_PFX_PATH;
  const pfxPassphrase = process.env.BANKID_PFX_PASSPHRASE;
  const caPath = process.env.BANKID_CA_PATH;

  if (!pfxPath || !pfxPassphrase || !caPath) {
    throw new Error(
      "Missing BankID config: BANKID_PFX_PATH, BANKID_PFX_PASSPHRASE, BANKID_CA_PATH"
    );
  }

  const pfx = readFileSync(pfxPath);
  const ca = readFileSync(caPath);

  const isProduction = process.env.BANKID_API_URL?.includes(
    "appapi2.bankid.com"
  );

  const sdk = new BankIdSDK({
    pfx,
    passphrase: pfxPassphrase,
    ca,
    production: isProduction ?? false,
  });

  return {
    async sign(request: BankIdSignRequest): Promise<BankIdSignResponse> {
      const userVisibleData = Buffer.from(request.userVisibleData).toString(
        "base64"
      );

      const response = await sdk.sign({
        endUserIp: request.endUserIp ?? "0.0.0.0",
        userVisibleData,
        userVisibleDataFormat: "simpleMarkdownV1",
        personalNumber: request.personalNumber,
        userNonVisibleData: request.userNonVisibleData
          ? Buffer.from(request.userNonVisibleData).toString("base64")
          : undefined,
      });

      return {
        orderRef: response.orderRef,
        autoStartToken: response.autoStartToken,
        qrStartToken: response.qrStartToken,
        qrStartSecret: response.qrStartSecret,
      };
    },

    async collect(orderRef: string): Promise<BankIdCollectResponse> {
      const response = await sdk.collect({ orderRef });

      // The bankid SDK has different types for v5 and v6 responses.
      // We normalize to our own type by treating completionData as unknown.
      const raw = response as {
        orderRef: string;
        status: string;
        hintCode?: string;
        completionData?: {
          user: {
            personalNumber: string;
            name: string;
            givenName: string;
            surname: string;
          };
          device: { ipAddress: string; uhi?: string };
          bankIdIssueDate?: string;
          signature: string;
          ocspResponse: string;
        };
      };

      let completionData: BankIdCompletionData | undefined;
      if (raw.completionData) {
        completionData = {
          user: raw.completionData.user,
          device: {
            ipAddress: raw.completionData.device.ipAddress,
            uhi: raw.completionData.device.uhi ?? "",
          },
          bankIdIssueDate: raw.completionData.bankIdIssueDate ?? "",
          signature: raw.completionData.signature,
          ocspResponse: raw.completionData.ocspResponse,
        };
      }

      return {
        orderRef: raw.orderRef,
        status: raw.status as "pending" | "complete" | "failed",
        hintCode: raw.hintCode,
        completionData,
      };
    },

    async cancel(orderRef: string): Promise<void> {
      await sdk.cancel({ orderRef });
    },
  };
}

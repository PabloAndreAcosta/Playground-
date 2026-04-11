import type { BankIdClient } from "./types";

let _client: BankIdClient | null = null;

export function getBankIdClient(): BankIdClient {
  if (!_client) {
    if (process.env.BANKID_MOCK === "true") {
      const { createMockBankIdClient } = require("./mock");
      _client = createMockBankIdClient();
    } else {
      const { createBankIdClient } = require("./client");
      _client = createBankIdClient();
    }
  }
  return _client!;
}

export { computeQrData } from "./qr";
export type {
  BankIdClient,
  BankIdSignRequest,
  BankIdSignResponse,
  BankIdCollectResponse,
  BankIdCompletionData,
} from "./types";
export { HINT_CODE_MESSAGES } from "./types";

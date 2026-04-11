import type { BankIdClient } from "./types";
import { createBankIdClient } from "./client";

let _client: BankIdClient | null = null;

export function getBankIdClient(): BankIdClient {
  if (!_client) {
    _client = createBankIdClient();
  }
  return _client;
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

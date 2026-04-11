export interface BankIdSignRequest {
  /** Optional: personnummer to pre-fill. Omit for QR-only flow. */
  personalNumber?: string;
  /** The text visible to the user in the BankID app (max 40000 chars). */
  userVisibleData: string;
  /** Optional non-visible data included in signature. */
  userNonVisibleData?: string;
  /** End user IP address (required by BankID API). */
  endUserIp?: string;
}

export interface BankIdSignResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export interface BankIdCollectResponse {
  orderRef: string;
  status: "pending" | "complete" | "failed";
  hintCode?: string;
  completionData?: BankIdCompletionData;
}

export interface BankIdCompletionData {
  user: {
    personalNumber: string;
    name: string;
    givenName: string;
    surname: string;
  };
  device: {
    ipAddress: string;
    uhi: string;
  };
  bankIdIssueDate: string;
  signature: string;
  ocspResponse: string;
}

export interface BankIdClient {
  sign(request: BankIdSignRequest): Promise<BankIdSignResponse>;
  collect(orderRef: string): Promise<BankIdCollectResponse>;
  cancel(orderRef: string): Promise<void>;
}

/** Map of BankID hint codes to user-friendly Swedish messages */
export const HINT_CODE_MESSAGES: Record<string, string> = {
  outstandingTransaction: "Starta BankID-appen",
  noClient: "Starta BankID-appen",
  started: "Sök efter BankID, det kan ta en liten stund…",
  userMrtd: "Identifiering pågår med BankID-appen",
  userCallConfirm: "Bekräfta i BankID-appen",
  userSign: "Skriv in din säkerhetskod i BankID-appen och välj Signera",
  expiredTransaction: "BankID-sessionen har gått ut. Försök igen.",
  certificateErr: "Det BankID du försöker använda är för gammalt eller spärrat.",
  userCancel: "Åtgärden avbruten.",
  cancelled: "Åtgärden avbruten.",
  startFailed: "BankID-appen verkar inte finnas i din enhet.",
};

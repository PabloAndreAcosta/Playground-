export interface ConsentSession {
  id: string;
  initiatorName: string;
  partnerName: string;
  createdAt: string;
  status: "pending" | "consented" | "confirmed" | "withdrawn";
  consentGivenAt?: string;
  confirmationAt?: string;
  initiatorAgreements: string[];
  partnerAgreements: string[];
  beforeNotes?: string;
  afterNotes?: string;
  initiatorConfirmedAfter?: boolean;
  partnerConfirmedAfter?: boolean;
  withdrawnBy?: string;
  withdrawnAt?: string;
}

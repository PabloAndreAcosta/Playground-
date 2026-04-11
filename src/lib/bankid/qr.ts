import { createHmac } from "crypto";

/**
 * Computes the animated BankID QR code data string.
 *
 * BankID requires the QR code to be updated every second with a new HMAC.
 * The QR data format is: "bankid.<qrStartToken>.<time>.<qrAuthCode>"
 *
 * @param qrStartToken - Token from the sign/auth response
 * @param qrStartSecret - Secret from the sign/auth response
 * @param secondsElapsed - Seconds since the order was created (0, 1, 2, ...)
 * @returns The QR code data string to encode
 */
export function computeQrData(
  qrStartToken: string,
  qrStartSecret: string,
  secondsElapsed: number
): string {
  const qrAuthCode = createHmac("sha256", qrStartSecret)
    .update(String(secondsElapsed))
    .digest("hex");

  return `bankid.${qrStartToken}.${secondsElapsed}.${qrAuthCode}`;
}

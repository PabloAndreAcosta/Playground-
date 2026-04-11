import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(key, "hex");
}

export function encryptPnr(pnr: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(pnr, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  // Append auth tag to ciphertext
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");

  return {
    encrypted: combined,
    iv: iv.toString("base64"),
  };
}

export function decryptPnr(encrypted: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "base64");
  const combined = Buffer.from(encrypted, "base64");

  // Extract auth tag from end of ciphertext
  const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

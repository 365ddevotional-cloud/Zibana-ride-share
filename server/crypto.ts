import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCODING: BufferEncoding = "hex";

function getDerivedKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.REPL_ID || "fallback-key";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptField(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);
  
  const tag = cipher.getAuthTag();
  
  return `enc:${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted}`;
}

export function decryptField(ciphertext: string): string {
  if (!ciphertext.startsWith("enc:")) {
    return ciphertext;
  }
  
  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted field format");
  }
  
  const key = getDerivedKey();
  const iv = Buffer.from(parts[1], ENCODING);
  const tag = Buffer.from(parts[2], ENCODING);
  const encrypted = parts[3];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, ENCODING, "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith("enc:");
}

export function maskTaxId(taxId: string | null): string | null {
  if (!taxId) return null;
  const plain = isEncrypted(taxId) ? decryptField(taxId) : taxId;
  return plain.slice(-4);
}

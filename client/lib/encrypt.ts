import crypto from 'crypto';

const algorithm = "aes-256-cbc"
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY environment variable must be a 64-character hex string (32 bytes).");
}
const key = Buffer.from(encryptionKey, "hex");

export function encrypt(text: string) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
    return iv.toString("hex") + ":" + encrypted.toString("hex")
}

export function decrypt(text: string) {
    // 1. Guard against non-string, null, undefined, or empty values
    if (typeof text !== 'string' || !text) {
        return '';
    }

    // 2. If it does not contain a colon, it's likely legacy or already plaintext
    if (!text.includes(':')) {
        return text;
    }

    try {
        const [ivHex, encryptedHex] = text.split(":");
        
        // 3. Ensure both parts exist
        if (!ivHex || !encryptedHex) {
            return text;
        }

        // 4. Validate that ivHex is exactly 32 hex characters (16 bytes IV)
        // and encryptedHex contains only valid hex characters
        const hexRegex = /^[0-9a-fA-F]+$/;
        if (ivHex.length !== 32 || !hexRegex.test(ivHex) || !hexRegex.test(encryptedHex)) {
            return text;
        }

        const iv = Buffer.from(ivHex, "hex");
        const encryptedText = Buffer.from(encryptedHex, "hex");

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedText),
            decipher.final(),
        ]);

        return decrypted.toString();
    } catch (error) {
        console.warn("[Decryption Utility] Failed to decrypt, returning original text:", error);
        return text;
    }
}

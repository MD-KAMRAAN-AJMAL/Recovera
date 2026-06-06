// Set a mock ENCRYPTION_KEY of exactly 64 hex characters (32 bytes) before importing encrypt
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

import { encrypt, decrypt } from "../lib/encrypt";

describe("Encryption & Decryption Utilities", () => {
  describe("Happy Path", () => {
    it("should successfully encrypt and decrypt a standard string", () => {
      const plaintext = "my-super-secret-credentials-123!";
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(":");
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt unique values each time due to random IV", () => {
      const plaintext = "same-plaintext";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe("Defensive Layout Guards & Fallbacks", () => {
    it("should gracefully handle non-string types", () => {
      // @ts-expect-error - testing invalid types safely
      expect(decrypt(null)).toBe("");
      // @ts-expect-error - testing invalid types safely
      expect(decrypt(undefined)).toBe("");
      // @ts-expect-error - testing invalid types safely
      expect(decrypt(12345)).toBe("");
    });

    it("should return empty string on empty input", () => {
      expect(decrypt("")).toBe("");
    });

    it("should return the original input if it does not contain a colon (already plaintext)", () => {
      const plaintext = "unencrypted_api_key_value";
      expect(decrypt(plaintext)).toBe(plaintext);
    });

    it("should return the original input if format is invalid (e.g. missing halves)", () => {
      expect(decrypt(":")).toBe(":");
      expect(decrypt("onlyonehalf:")).toBe("onlyonehalf:");
      expect(decrypt(":onlyrightside")).toBe(":onlyrightside");
    });

    it("should return the original input if IV is not exactly 32 hex chars (16 bytes)", () => {
      const invalidIv1 = "123:encryptedhexvalues"; // IV too short
      const invalidIv2 = "0123456789abcdef0123456789abcdef0:encryptedhex"; // IV too long (33 chars)
      const invalidIvChar = "0123456789abcdef0123456789abcdeg:encryptedhex"; // Non-hex character 'g' in IV
      
      expect(decrypt(invalidIv1)).toBe(invalidIv1);
      expect(decrypt(invalidIv2)).toBe(invalidIv2);
      expect(decrypt(invalidIvChar)).toBe(invalidIvChar);
    });

    it("should return the original input if ciphertext is not valid hex", () => {
      const validIv = "0123456789abcdef0123456789abcdef";
      const invalidCipher = `${validIv}:not-a-valid-hex-string`;
      
      expect(decrypt(invalidCipher)).toBe(invalidCipher);
    });

    it("should catch internal decryption errors (bad decrypt) gracefully and return input", () => {
      const validIv = "0123456789abcdef0123456789abcdef";
      const badCipher = `${validIv}:abcdef1234567890`; // Valid hex but invalid decryption block
      
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn(); // Suppress warn log in test output
      
      expect(decrypt(badCipher)).toBe(badCipher);
      expect(console.warn).toHaveBeenCalled();
      
      console.warn = originalConsoleWarn;
    });
  });
});

// Encryption service matching the Kotlin MessageEncryptionManager logic

const INTERNAL_KEY = "hardcoded_key"; // Must match the Kotlin version's key

export class EncryptionService {
  private useRustSdkEncryption = false; // Toggle for encryption type

  // XOR encryption - matches Kotlin implementation
  private xorEncrypt(data: Uint8Array): Uint8Array {
    const keyBytes = new TextEncoder().encode(INTERNAL_KEY);
    return data.map((byte, index) => 
      byte ^ keyBytes[index % keyBytes.length]
    );
  }

  // XOR decryption - matches Kotlin implementation  
  private xorDecrypt(data: Uint8Array): Uint8Array {
    const keyBytes = new TextEncoder().encode(INTERNAL_KEY);
    return data.map((byte, index) => 
      byte ^ keyBytes[index % keyBytes.length]
    );
  }

  // Public encrypt method - matches Kotlin API
  encryptMessage(message: string, targetUserId?: string): string {
    if (!message || message.trim().length === 0) {
      console.log("[Encryption] Cannot encrypt an empty message.");
      return "";
    }

    if (this.useRustSdkEncryption && targetUserId) {
      // TODO: Implement SDK encryption when needed
      return this.encryptMessageWithSdk(message);
    } else {
      // Use XOR encryption
      const messageBytes = new TextEncoder().encode(message);
      const encryptedBytes = this.xorEncrypt(messageBytes);
      return btoa(String.fromCharCode(...encryptedBytes));
    }
  }

  // Public decrypt method - matches Kotlin API
  decryptMessage(encryptedString: string, sourceUserId?: string): string {
    if (!encryptedString || encryptedString.trim().length === 0) {
      console.log("[Decryption] Cannot decrypt an empty message.");
      return "";
    }

    try {
      if (this.useRustSdkEncryption && sourceUserId) {
        // TODO: Implement SDK decryption when needed
        return this.decryptMessageWithSdk(encryptedString);
      } else {
        // Use XOR decryption
        const encryptedBytes = new Uint8Array(
          atob(encryptedString).split('').map(char => char.charCodeAt(0))
        );
        const decryptedBytes = this.xorDecrypt(encryptedBytes);
        return new TextDecoder().decode(decryptedBytes);
      }
    } catch (error) {
      console.error("[Decryption] Failed to decrypt message:", error);
      return "";
    }
  }

  // Placeholder for SDK encryption (to be implemented later)
  private encryptMessageWithSdk(message: string): string {
    console.log("[SDK] SDK encryption not yet implemented, falling back to XOR");
    return this.encryptMessage(message);
  }

  // Placeholder for SDK decryption (to be implemented later)
  private decryptMessageWithSdk(encryptedString: string): string {
    console.log("[SDK] SDK decryption not yet implemented, falling back to XOR");
    return this.decryptMessage(encryptedString);
  }

  // Enable/disable SDK encryption
  setUseRustSdkEncryption(enabled: boolean): void {
    this.useRustSdkEncryption = enabled;
    console.log(`[Encryption] SDK encryption ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService(); 
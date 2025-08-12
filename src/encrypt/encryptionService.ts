// Encryption service matching the Kotlin MessageEncryptionManager logic

// IMPORTANT: This key MUST match the Swift and Kotlin versions exactly
// Both Swift and Kotlin use "hardcoded_key" for XOR encryption
const INTERNAL_KEY = "hardcoded_key"; // Must match Swift and Kotlin versions

export class EncryptionService {
  private useRustSdkEncryption = false; // Toggle for encryption type - set to false to use XOR
  private sdkInstancePtr: number | null = null; // SDK instance pointer

  // XOR encryption - matches Kotlin implementation exactly
  private xorEncrypt(data: Uint8Array): Uint8Array {
    const keyBytes = new TextEncoder().encode(INTERNAL_KEY);
    console.log("[Encryption] Encrypting with key:", INTERNAL_KEY, "Key bytes length:", keyBytes.length);
    return data.map((byte, index) => 
      byte ^ keyBytes[index % keyBytes.length]
    );
  }

  // XOR decryption - matches Kotlin implementation exactly
  private xorDecrypt(data: Uint8Array): Uint8Array {
    const keyBytes = new TextEncoder().encode(INTERNAL_KEY);
    console.log("[Encryption] Decrypting with key:", INTERNAL_KEY, "Key bytes length:", keyBytes.length);
    return data.map((byte, index) => 
      byte ^ keyBytes[index % keyBytes.length]
    );
  }

  // Public encrypt method - matches Kotlin API exactly
  encryptMessage(message: string, targetUserId?: string): string {
    if (!message || message.trim().length === 0) {
      console.log("[Encryption] Cannot encrypt an empty message.");
      return "";
    }

    if (this.useRustSdkEncryption && this.sdkInstancePtr !== null && targetUserId) {
      return this.encryptMessageWithSdk(targetUserId, message);
    } else {
      // Use XOR encryption with hardcoded_key (matches Swift/Kotlin)
      const messageBytes = new TextEncoder().encode(message);
      const encryptedBytes = this.xorEncrypt(messageBytes);
      const result = btoa(String.fromCharCode(...encryptedBytes));
      console.log("[Encryption] Encrypted:", message, "→", result);
      return result;
    }
  }

  // Public decrypt method - matches Kotlin API exactly
  decryptMessage(encryptedString: string, sourceUserId?: string): string {
    if (!encryptedString || encryptedString.trim().length === 0) {
      console.log("[Decryption] Cannot decrypt an empty message.");
      return "";
    }

    try {
      const encryptedBytes = new Uint8Array(
        atob(encryptedString).split('').map(char => char.charCodeAt(0))
      );

      if (this.useRustSdkEncryption && this.sdkInstancePtr !== null && sourceUserId) {
        return this.decryptMessageWithSdk(sourceUserId, encryptedBytes);
      } else {
        // Use XOR decryption with hardcoded_key (matches Swift/Kotlin)
        const decryptedBytes = this.xorDecrypt(encryptedBytes);
        const result = new TextDecoder().decode(decryptedBytes);
        console.log("[Encryption] Decrypted:", encryptedString, "→", result);
        return result;
      }
    } catch (error) {
      console.error("[Decryption] Failed to decrypt message:", error);
      return encryptedString; // Return original if decryption fails
    }
  }

  // ==================================================================================
  // SDK (Rust native) functions (active but protected by switch)
  // ==================================================================================

  // Initialize the SDK KeyManager instance
  initializeSdk(): void {
    if (this.sdkInstancePtr === null) {
      // TODO: Implement SDK initialization when needed
      // this.sdkInstancePtr = await invoke<number>("sdk_create_key_manager");
      console.log("[SDK] SDK initialization not yet implemented");
    }
  }

  // Import a user's public keys (needed for encryption)
  importUserPublicKeys(userId: string): void {
    if (this.sdkInstancePtr !== null) {
      // TODO: Implement SDK key import when needed
      // await invoke("sdk_import_user_keys", { 
      //   sdk: this.sdkInstancePtr, 
      //   userId, 
      //   publicKeys 
      // });
      console.log(`[SDK] Imported public keys for user: ${userId}`);
    } else {
      console.log("[SDK] SDK instance not initialized. Cannot import keys.");
    }
  }

  // Encrypt a message using SDK
  private encryptMessageWithSdk(_targetUserId: string, message: string): string {
    if (this.sdkInstancePtr === null) {
      console.log("[SDK] SDK instance not initialized, falling back to XOR encryption");
      return this.encryptMessage(message);
    }
    // TODO: Implement SDK encryption
    return "";
  }

  // Decrypt a message using SDK
  private decryptMessageWithSdk(_sourceUserId: string, _encryptedBytes: Uint8Array): string {
    if (this.sdkInstancePtr === null) {
      console.log("[SDK] SDK instance not initialized, falling back to XOR decryption");
      return "";
    }
    // TODO: Implement SDK decryption
    return "";
  }

  // Toggle between XOR and SDK encryption
  setUseRustSdkEncryption(enabled: boolean): void {
    this.useRustSdkEncryption = enabled;
    console.log(`[SDK] Rust SDK encryption ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Check if SDK encryption is enabled
  isSdkEncryptionEnabled(): boolean {
    return this.useRustSdkEncryption;
  }

  // Check if SDK is initialized
  isSdkInitialized(): boolean {
    return this.sdkInstancePtr !== null;
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService(); 

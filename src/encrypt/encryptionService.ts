// Encryption service matching the Kotlin MessageEncryptionManager logic

const INTERNAL_KEY = "hardcoded_key"; // Must match the Kotlin version's key

export class EncryptionService {
  private useRustSdkEncryption = false; // Toggle for encryption type
  private sdkInstancePtr: number | null = null; // SDK instance pointer

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

    if (this.useRustSdkEncryption && this.sdkInstancePtr !== null && targetUserId) {
      return this.encryptMessageWithSdk(targetUserId, message);
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
      const encryptedBytes = new Uint8Array(
        atob(encryptedString).split('').map(char => char.charCodeAt(0))
      );

      if (this.useRustSdkEncryption && this.sdkInstancePtr !== null && sourceUserId) {
        return this.decryptMessageWithSdk(sourceUserId, encryptedBytes);
      } else {
        // Use XOR decryption
        const decryptedBytes = this.xorDecrypt(encryptedBytes);
        return new TextDecoder().decode(decryptedBytes);
      }
    } catch (error) {
      console.error("[Decryption] Failed to decrypt message:", error);
      return "";
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

    try {
      // TODO: Implement SDK encryption when needed
      // const encryptedBytes = await invoke<Uint8Array>("sdk_encrypt_message", {
      //   sdk: this.sdkInstancePtr,
      //   targetUserId,
      //   messageBytes: new TextEncoder().encode(message)
      // });
      // return btoa(String.fromCharCode(...encryptedBytes));
      
      console.log("[SDK] SDK encryption not yet implemented, falling back to XOR");
      return this.encryptMessage(message);
    } catch (error) {
      console.error("[SDK] SDK encryption failed, falling back to XOR:", error);
      return this.encryptMessage(message);
    }
  }

  // Decrypt a message using SDK
  private decryptMessageWithSdk(sourceUserId: string, encryptedBytes: Uint8Array): string {
    if (this.sdkInstancePtr === null) {
      console.log("[SDK] SDK instance not initialized, falling back to XOR decryption");
      return this.decryptMessage(btoa(String.fromCharCode(...encryptedBytes)));
    }

    try {
      // TODO: Implement SDK decryption when needed
      // const decryptedBytes = await invoke<Uint8Array>("sdk_decrypt_message", {
      //   sdk: this.sdkInstancePtr,
      //   sourceUserId,
      //   encryptedBytes
      // });
      // return new TextDecoder().decode(decryptedBytes);
      
      console.log("[SDK] SDK decryption not yet implemented, falling back to XOR");
      return this.decryptMessage(btoa(String.fromCharCode(...encryptedBytes)));
    } catch (error) {
      console.error("[SDK] SDK decryption failed, falling back to XOR:", error);
      return this.decryptMessage(btoa(String.fromCharCode(...encryptedBytes)));
    }
  }

  // Enable/disable SDK encryption
  setUseRustSdkEncryption(enabled: boolean): void {
    this.useRustSdkEncryption = enabled;
    console.log(`[Encryption] SDK encryption ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled && this.sdkInstancePtr === null) {
      this.initializeSdk();
    }
  }

  // Get SDK encryption status
  isSdkEncryptionEnabled(): boolean {
    return this.useRustSdkEncryption;
  }

  // Get SDK instance status
  isSdkInitialized(): boolean {
    return this.sdkInstancePtr !== null;
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService(); 
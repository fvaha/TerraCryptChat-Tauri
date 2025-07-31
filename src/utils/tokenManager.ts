import { invoke } from "@tauri-apps/api/core";

export interface TokenData {
  accessToken: string;
  username?: string;
  password?: string;
}

export class TokenManager {
  private cachedToken: string | null = null;
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly USERNAME_KEY = "username";
  private readonly PASSWORD_KEY = "password";

  constructor() {
    this.loadCachedToken();
  }

  private async loadCachedToken() {
    try {
      this.cachedToken = await this.getStoredToken();
    } catch (error) {
      console.error("Failed to load cached token:", error);
    }
  }

  getCachedAccessToken(): string | null {
    return this.cachedToken;
  }

  async getAccessToken(): Promise<string | null> {
    if (this.cachedToken) {
      return this.cachedToken;
    }
    
    const token = await this.getStoredToken();
    if (token) {
      this.cachedToken = token;
    }
    return token;
  }

  async updateAccessToken(token: string): Promise<void> {
    const current = await this.getStoredToken();
    if (current !== token) {
      await this.saveToken(token);
      this.cachedToken = token;
      this.logTokenExpiry(token);
    }
  }

  async clearAccessToken(): Promise<void> {
    await this.removeToken();
    this.cachedToken = null;
  }

  async updateCredentials(username: string | null, password: string | null): Promise<void> {
    if (username) {
      await invoke("save_token", { key: this.USERNAME_KEY, value: username });
    }
    if (password) {
      await invoke("save_token", { key: this.PASSWORD_KEY, value: password });
    }
  }

  async getStoredCredentials(): Promise<{ username: string | null; password: string | null }> {
    try {
      const username = await invoke<string | null>("load_token", { key: this.USERNAME_KEY });
      const password = await invoke<string | null>("load_token", { key: this.PASSWORD_KEY });
      return { username, password };
    } catch (error) {
      console.error("Failed to get stored credentials:", error);
      return { username: null, password: null };
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      await invoke("remove_token", { key: this.USERNAME_KEY });
      await invoke("remove_token", { key: this.PASSWORD_KEY });
    } catch (error) {
      console.error("Failed to clear credentials:", error);
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;

      const payload = this.decodeBase64URL(parts[1]);
      if (!payload) return true;

      const json = JSON.parse(new TextDecoder().decode(payload));
      const exp = json.exp || 0;
      const expired = exp <= 0 || new Date(exp * 1000) < new Date();

      console.log("TokenManager: Decoded token exp=", exp, "vs now=", Math.floor(Date.now() / 1000));
      return expired;
    } catch (error) {
      console.error("Failed to check token expiry:", error);
      return true;
    }
  }

  async ensureValidAccessToken(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token || this.isTokenExpired(token)) {
      throw new Error("Access token is missing or expired");
    }
    return token;
  }

  getExpirationTime(token: string): number {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return 0;

      const payload = this.decodeBase64URL(parts[1]);
      if (!payload) return 0;

      const json = JSON.parse(new TextDecoder().decode(payload));
      return json.exp || 0;
    } catch (error) {
      console.error("Failed to get token expiration time:", error);
      return 0;
    }
  }

  private logTokenExpiry(token: string): void {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return;

      const payload = this.decodeBase64URL(parts[1]);
      if (!payload) return;

      const json = JSON.parse(new TextDecoder().decode(payload));
      const exp = json.exp || 0;
      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = exp - now;

      console.log("TokenManager: Token expires in", secondsLeft, "seconds (exp=", exp, ", now=", now, ")");
    } catch (error) {
      console.error("Failed to log token expiry:", error);
    }
  }

  private decodeBase64URL(base64: string): Uint8Array | null {
    try {
      let base64String = base64.replace(/-/g, "+").replace(/_/g, "/");
      while (base64String.length % 4 !== 0) {
        base64String += "=";
      }
      
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error("Failed to decode base64 URL:", error);
      return null;
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      await invoke("save_token", { key: this.ACCESS_TOKEN_KEY, value: token });
    } catch (error) {
      console.error("Failed to save token:", error);
      throw error;
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await invoke<string | null>("load_token", { key: this.ACCESS_TOKEN_KEY });
    } catch (error) {
      console.error("Failed to load token:", error);
      return null;
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await invoke("remove_token", { key: this.ACCESS_TOKEN_KEY });
    } catch (error) {
      console.error("Failed to remove token:", error);
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager(); 
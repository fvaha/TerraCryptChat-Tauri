import { invoke } from "@tauri-apps/api/core";

const ACCESS_TOKEN_KEY = "access_token";

export interface TokenData {
  accessToken: string;
}

/**
 * Saves token data securely
 */
export async function saveTokenData({
  accessToken,
}: TokenData): Promise<void> {
  try {
    await invoke("save_token", {
      key: ACCESS_TOKEN_KEY,
      value: accessToken,
    });
  } catch (error) {
          console.error("Failed to save token data:", error);
    throw new Error("Failed to save authentication data");
  }
}

/**
 * Retrieves the access token
 */
export async function loadToken(): Promise<string | null> {
  try {
    const token: string | null = await invoke("load_token", {
      key: ACCESS_TOKEN_KEY,
    });
    return token;
  } catch (error) {
          console.error("Failed to load token:", error);
    return null;
  }
}

/**
 * Clears all authentication tokens
 */
export async function clearToken(): Promise<void> {
  try {
    await invoke("remove_token", { key: ACCESS_TOKEN_KEY });
  } catch (error) {
          console.error("Failed to clear tokens:", error);
  }
}

/**
 * Verifies token validity
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    return await invoke<boolean>("verify_token", { token });
  } catch (error) {
          console.error("Token verification failed:", error);
    return false;
  }
}

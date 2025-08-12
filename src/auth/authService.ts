import { invoke } from "@tauri-apps/api/core";

interface LoginResponse {
  access_token: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    return await invoke<LoginResponse>("login", { username, password });
  } catch (error) {
    console.error("Login failed:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Login failed. Please check your credentials and try again."
    );
  }
}

export async function register(username: string, email: string, password: string): Promise<LoginResponse> {
  try {
    return await invoke<LoginResponse>("register", { username, email, password });
  } catch (error) {
    console.error("Registration failed:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Registration failed. Please try again."
    );
  }
}

export async function logout(token: string): Promise<void> {
  try {
    await invoke("logout", { token });
  } catch (error) {
    console.error("Logout failed:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Logout failed. Please try again."
    );
  }
}

export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  try {
    return await invoke<LoginResponse>("refresh_token", { refreshToken });
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Token refresh failed. Please log in again."
    );
  }
}

export async function invalidateToken(token: string): Promise<void> {
  try {
    await invoke("invalidate_token", { token });
  } catch (error) {
    console.error("Token invalidation failed:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Token invalidation failed."
    );
  }
}

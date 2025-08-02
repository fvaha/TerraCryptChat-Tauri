import { invoke } from "@tauri-apps/api/core";

interface LoginResponse {
  access_token: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return await invoke<LoginResponse>("login", { username, password });
}

export async function register(username: string, email: string, password: string): Promise<LoginResponse> {
  return await invoke<LoginResponse>("register", { username, email, password });
}

export async function logout(token: string): Promise<void> {
  await invoke("logout", { token });
}

export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  return await invoke<LoginResponse>("refresh_token", { refreshToken });
}



export async function invalidateToken(token: string): Promise<void> {
  await invoke("invalidate_token", { token });
}
import { invoke } from "@tauri-apps/api/core";

export interface ChatMember {
  user_id: string;
  is_admin: boolean;
}

export async function createChat(name: string, isGroup: boolean, members: ChatMember[], token: string): Promise<void> {
  await invoke("create_chat", {
    token,
    name,
    is_group: isGroup,
    members
  });
}
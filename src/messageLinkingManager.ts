import { invoke } from "@tauri-apps/api/core";

export class MessageLinkingManager {
  private messageLinks: Map<string, string> = new Map();

  async linkMessage(clientMessageId: string, serverMessageId: string) {
    this.messageLinks.set(clientMessageId, serverMessageId);
    
    try {
      await invoke("db_link_message", {
        clientMessageId,
        serverMessageId
      });
    } catch (error) {
      console.error("Failed to link message in database:", error);
    }
  }

  getServerMessageId(clientMessageId: string): string | undefined {
    return this.messageLinks.get(clientMessageId);
  }

  getClientMessageId(serverMessageId: string): string | undefined {
    for (const [clientId, serverId] of this.messageLinks.entries()) {
      if (serverId === serverMessageId) {
        return clientId;
      }
    }
    return undefined;
  }

  clearLinks() {
    this.messageLinks.clear();
  }
}

// Export singleton instance
export const messageLinkingManager = new MessageLinkingManager(); 
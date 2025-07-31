import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { invoke } from "@tauri-apps/api/core";

import { Participant } from '../services/databaseServiceAsync';

export class ParticipantService {
  private participantCache = new Map<string, { participants: Participant[], timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  async getParticipantsForChat(chatId: string): Promise<Participant[]> {
    try {
      // Check cache first
      const cached = this.participantCache.get(chatId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[ParticipantService] Using cached participants for chat ${chatId}`);
        return cached.participants;
      }

      console.log(`[ParticipantService] Fetching participants for chat ${chatId} from database`);
      const participants = await databaseServiceAsync.getParticipantsForChat(chatId);
      
      if (!Array.isArray(participants)) {
        console.warn("Invalid participants data received:", participants);
        return [];
      }
      
      const mappedParticipants = participants.map(p => ({
        id: p.id,
        participant_id: p.participant_id,
        user_id: p.user_id,
        chat_id: p.chat_id,
        username: p.username,
        name: p.name,
        email: p.email,
        picture: p.picture,
        role: p.role,
        joined_at: p.joined_at,
        left_at: p.left_at,
        is_active: p.is_active
      }));

      // Cache the result
      this.participantCache.set(chatId, {
        participants: mappedParticipants,
        timestamp: Date.now()
      });

      return mappedParticipants;
    } catch (error) {
      console.error(`Failed to get participants for chat ${chatId}:`, error);
      return [];
    }
  }

  // Clear cache for a specific chat
  clearCacheForChat(chatId: string): void {
    this.participantCache.delete(chatId);
    console.log(`[ParticipantService] Cleared cache for chat ${chatId}`);
  }

  // Clear all cache
  clearAllCache(): void {
    this.participantCache.clear();
    console.log(`[ParticipantService] Cleared all participant cache`);
  }

  async addParticipant(participant: Participant): Promise<void> {
    try {
      const dbParticipant = {
        id: participant.id,
        participant_id: participant.participant_id,
        user_id: participant.user_id,
        chat_id: participant.chat_id,
        username: participant.username,
        name: participant.name,
        email: participant.email,
        picture: participant.picture,
        role: participant.role,
        joined_at: participant.joined_at,
        left_at: participant.left_at,
        is_active: participant.is_active
      };
      
      await databaseServiceAsync.insertParticipant(dbParticipant);
      console.log(`[ParticipantService] Participant added successfully: ${participant.username}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to add participant:`, error);
      throw error;
    }
  }

  async removeParticipant(participantId: string): Promise<void> {
    try {
      await databaseServiceAsync.deleteParticipant(participantId);
      console.log(`[ParticipantService] Participant removed successfully: ${participantId}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to remove participant:`, error);
      throw error;
    }
  }

  async updateParticipantRole(participantId: string, role: string): Promise<void> {
    try {
      await databaseServiceAsync.updateParticipantRole(participantId, role);
      console.log(`[ParticipantService] Participant role updated: ${participantId} -> ${role}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to update participant role:`, error);
      throw error;
    }
  }

  async getParticipantById(participantId: string): Promise<Participant | null> {
    try {
      const participant = await databaseServiceAsync.getParticipantById(participantId);
      if (!participant) return null;

      return {
        id: participant.id,
        participant_id: participant.participant_id,
        user_id: participant.user_id,
        chat_id: participant.chat_id,
        username: participant.username,
        name: participant.name,
        email: participant.email,
        picture: participant.picture,
        role: participant.role,
        joined_at: participant.joined_at,
        left_at: participant.left_at,
        is_active: participant.is_active
      };
    } catch (error) {
      console.error(`[ParticipantService] Failed to get participant by ID:`, error);
      return null;
    }
  }

  async getParticipantByUserIdAndChatId(userId: string, chatId: string): Promise<Participant | null> {
    try {
      const participant = await databaseServiceAsync.getParticipantByUserIdAndChatId(userId, chatId);
      if (!participant) return null;

      return {
        id: participant.id,
        participant_id: participant.participant_id,
        user_id: participant.user_id,
        chat_id: participant.chat_id,
        username: participant.username,
        name: participant.name,
        email: participant.email,
        picture: participant.picture,
        role: participant.role,
        joined_at: participant.joined_at,
        left_at: participant.left_at,
        is_active: participant.is_active
      };
    } catch (error) {
      console.error(`[ParticipantService] Failed to get participant by user ID and chat ID:`, error);
      return null;
    }
  }

  async clearParticipantsForChat(chatId: string): Promise<void> {
    try {
      await databaseServiceAsync.clearParticipantData();
      console.log(`[ParticipantService] Participants cleared for chat: ${chatId}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to clear participants for chat:`, error);
      throw error;
    }
  }

  async syncParticipantsFromServer(chatId: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Syncing participants for chat ${chatId} from server...`);
      
      // Get participants from server
      const response = await invoke<{ data: any[] }>("get_participants", { chatId });
      
      if (!response || !response.data) {
        console.warn(`[ParticipantService] No participants data received for chat ${chatId}`);
        return;
      }
      
      console.log(`[ParticipantService] Received ${response.data.length} participants from server`);
      
      // Clear existing participants for this chat
      await this.clearParticipantsForChat(chatId);
      
      // Add new participants
      for (const serverParticipant of response.data) {
        const participant: Participant = {
          id: serverParticipant.id || generateUUID(),
          participant_id: serverParticipant.participant_id || generateUUID(),
          user_id: serverParticipant.user_id,
          chat_id: chatId,
          username: serverParticipant.username,
          name: serverParticipant.name,
          email: serverParticipant.email,
          picture: serverParticipant.picture,
          role: serverParticipant.role,
          joined_at: new Date(serverParticipant.joined_at).getTime(),
          left_at: serverParticipant.left_at ? new Date(serverParticipant.left_at).getTime() : undefined,
          is_active: Boolean(serverParticipant.is_active)
        };
        
        await this.addParticipant(participant);
      }
      
      console.log(`[ParticipantService] Participant sync completed for chat ${chatId}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to sync participants for chat ${chatId}:`, error);
    }
  }

  async fetchParticipantsAsync(chatId: string): Promise<Participant[]> {
    try {
      console.log(`[ParticipantService] Fetching participants for chat ${chatId}...`);
      
      // First try to get from local database
      let participants = await this.getParticipantsForChat(chatId);
      
      if (participants.length === 0) {
        console.log(`[ParticipantService] No local participants found, syncing from server...`);
        await this.syncParticipantsFromServer(chatId);
        participants = await this.getParticipantsForChat(chatId);
      }
      
      console.log(`[ParticipantService] Retrieved ${participants.length} participants for chat ${chatId}`);
      return participants;
    } catch (error) {
      console.error(`[ParticipantService] Failed to fetch participants for chat ${chatId}:`, error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const user = await databaseServiceAsync.getUserById(userId);
      return user;
    } catch (error) {
      console.error(`[ParticipantService] Failed to get user by ID:`, error);
      return null;
    }
  }

  async fetchAndSaveParticipants(chatId: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Fetching and saving participants for chat ${chatId}...`);
      await this.syncParticipantsFromServer(chatId);
      console.log(`[ParticipantService] Participants fetched and saved for chat ${chatId}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to fetch and save participants for chat ${chatId}:`, error);
      throw error;
    }
  }
}

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const participantService = new ParticipantService();
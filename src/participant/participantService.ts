import { invoke } from '@tauri-apps/api/core';
import { databaseServiceAsync } from '../services/databaseServiceAsync';
import { apiService } from '../api/apiService';
import { Participant, User } from '../models/models';
import { sessionManager } from '../utils/sessionManager';

interface ParticipantData {
  participant_id?: string;
  id?: string;
  chat_id: string;
  user_id: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  username?: string;
  name?: string;
  picture?: string;
}

interface CachedParticipants {
  participants: Participant[];
  timestamp: number;
}

export class ParticipantService {
  private static instance: ParticipantService;
  private participantCache: Map<string, CachedParticipants> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ParticipantService {
    if (!ParticipantService.instance) {
      ParticipantService.instance = new ParticipantService();
    }
    return ParticipantService.instance;
  }

  async get_participants_for_chat(chat_id: string): Promise<Participant[]> {
    try {
      // Validate chat_id first
      if (!chat_id || chat_id.trim() === '') {
        console.log(`[ParticipantService] Invalid chat_id: ${chat_id}`);
        return [];
      }

      const cached = this.participantCache.get(chat_id);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[ParticipantService] Using cached participants for chat ${chat_id}`);
        return cached.participants;
      }

      console.log(`[ParticipantService] Fetching participants for chat ${chat_id} from database`);
      const participants = await databaseServiceAsync.get_participants_for_chat(chat_id);
      
      if (participants && participants.length > 0) {
        this.updateCache(chat_id, participants);
        return participants;
      }

      // Only try server sync if no participants found and we have a valid chat_id
      if (chat_id && chat_id.trim() !== '') {
        console.log(`[ParticipantService] No participants found in database for chat ${chat_id}, will try server sync later`);
        // Don't block UI - return empty array and let background sync handle it
        return [];
      }

      return [];
    } catch (error) {
      console.error(`Failed to get participants for chat ${chat_id}:`, error);
      return [];
    }
  }

  private updateCache(chat_id: string, participants: Participant[]): void {
    this.participantCache.set(chat_id, {
      participants,
      timestamp: Date.now()
    });
    console.log(`[ParticipantService] Updated cache for chat ${chat_id} with ${participants.length} participants`);
  }

  private clearCacheForChat(chat_id: string): void {
    this.participantCache.delete(chat_id);
    console.log(`[ParticipantService] Cleared cache for chat ${chat_id}`);
  }

  async addParticipant(participant: Participant): Promise<void> {
    try {
      await databaseServiceAsync.insertParticipant(participant);
      this.clearCacheForChat(participant.chat_id);
      console.log(`[ParticipantService] Participant added successfully: ${participant.participant_id}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to add participant:`, error);
      throw error;
    }
  }

  async removeParticipant(participant_id: string): Promise<void> {
    try {
      const participant = await databaseServiceAsync.getParticipantById(participant_id);
      if (participant) {
        await databaseServiceAsync.deleteParticipant(participant_id);
        this.clearCacheForChat(participant.chat_id);
        console.log(`[ParticipantService] Participant removed successfully: ${participant_id}`);
      }
    } catch (error) {
      console.error(`[ParticipantService] Failed to remove participant:`, error);
      throw error;
    }
  }

  async updateParticipantRole(participant_id: string, role: string): Promise<void> {
    try {
      await databaseServiceAsync.updateParticipantRole(participant_id, role);
      console.log(`[ParticipantService] Participant role updated: ${participant_id} -> ${role}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to update participant role:`, error);
      throw error;
    }
  }

  async getParticipantById(participant_id: string): Promise<Participant | null> {
    try {
      const participant = await databaseServiceAsync.getParticipantById(participant_id);
      return participant;
    } catch (error) {
      console.error(`[ParticipantService] Failed to get participant by ID:`, error);
      return null;
    }
  }

  async getParticipantByUserIdAndChatId(user_id: string, chat_id: string): Promise<Participant | null> {
    try {
      const participant = await databaseServiceAsync.getParticipantByUserIdAndChatId(user_id, chat_id);
      return participant;
    } catch (error) {
      console.error('[ParticipantService] Failed to get participant by user ID and chat ID:', error);
      return null;
    }
  }

  async getAllParticipants(): Promise<Participant[]> {
    try {
      // This would need to be implemented in the backend
      console.log('[ParticipantService] Getting all participants not implemented yet');
      return [];
    } catch (error) {
      console.error('[ParticipantService] Failed to get all participants:', error);
      return [];
    }
  }

  async clearParticipantsForChat(chat_id: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Clearing participants for chat ${chat_id}...`);
      
      // Get all participants for this chat
      const participants = await this.get_participants_for_chat(chat_id);
      
      // Delete each participant
      for (const participant of participants) {
        if (participant.participant_id) {
          await databaseServiceAsync.deleteParticipant(participant.participant_id);
        }
      }
      
      // Clear cache for this chat
      this.clearCacheForChat(chat_id);
      
      console.log(`[ParticipantService] Cleared ${participants.length} participants for chat ${chat_id}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to clear participants for chat ${chat_id}:`, error);
      throw error;
    }
  }

  async syncParticipantsFromServer(chat_id: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Syncing participants for chat ${chat_id} from server...`);
      
      // Use the server API instead of Tauri command
      const response = await apiService.getChatMembersFromServer(chat_id);
      const members = response.data || [];
      
      if (!members || members.length === 0) {
        console.warn(`[ParticipantService] No participants data received for chat ${chat_id}`);
        return;
      }

      console.log(`[ParticipantService] Received ${members.length} participants from server for chat ${chat_id}`);

      // Clear existing participants for this chat
      await this.clearParticipantsForChat(chat_id);

      // Save new participants to database
      for (const memberData of members) {
        console.log(`[ParticipantService] Processing member:`, memberData);
        
        const participant: Participant = {
          id: memberData.participant_id || memberData.id || `temp_${Date.now()}_${Math.random()}`,
          participant_id: memberData.participant_id || memberData.id || `temp_${Date.now()}_${Math.random()}`,
          chat_id: chat_id,
          user_id: memberData.user_id,
          username: memberData.user?.username || memberData.username || 'unknown',
          name: memberData.user?.name || memberData.name || '',
          email: memberData.user?.email || '',
          picture: memberData.user?.picture || memberData.picture || '',
          role: memberData.is_admin ? 'admin' : 'member',
          joined_at: memberData.joined_at ? new Date(memberData.joined_at).getTime() : Date.now(),
          left_at: memberData.deleted_at,
          is_active: !memberData.deleted_at
        };

        console.log(`[ParticipantService] Saving participant:`, {
          participant_id: participant.participant_id,
          user_id: participant.user_id,
          username: participant.username,
          role: participant.role
        });

        await this.addParticipant(participant);
      }

      // FIXED: Update chat name with proper username from participants
      await this.updateChatNameFromParticipants(chat_id, members);

      console.log(`[ParticipantService] Participant sync completed for chat ${chat_id}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to sync participants for chat ${chat_id}:`, error);
      throw error;
    }
  }

  /**
   * Update chat name based on participant information from server
   */
  private async updateChatNameFromParticipants(chat_id: string, members: any[]): Promise<void> {
    try {
      console.log(`[ParticipantService] Updating chat name for chat ${chat_id} from participants...`);
      
      // Get current user ID to determine the other participant
      const currentUserId = await sessionManager.getCurrentUserId();
      if (!currentUserId) {
        console.warn(`[ParticipantService] No current user ID available for chat name update`);
        return;
      }

      // Find the other participant (not current user)
      const otherMember = members.find(member => member.user_id !== currentUserId);
      if (!otherMember) {
        console.warn(`[ParticipantService] No other participant found for chat ${chat_id}`);
        return;
      }

      // Get the username from the other participant
      const otherUsername = otherMember.user?.username || otherMember.username;
      if (!otherUsername || otherUsername === 'unknown') {
        console.warn(`[ParticipantService] No valid username found for other participant in chat ${chat_id}`);
        return;
      }

      console.log(`[ParticipantService] Updating chat name to: ${otherUsername} for chat ${chat_id}`);

      // Update the chat name in the database
      const chatUpdate = {
        chat_id: chat_id,
        name: otherUsername
      };

      await invoke('db_insert_or_update_chat', { chat: chatUpdate });
      console.log(`[ParticipantService] Chat name updated successfully for chat ${chat_id}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to update chat name for chat ${chat_id}:`, error);
    }
  }

  /**
   * Get current user ID for participant operations
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      return await sessionManager.getCurrentUserId();
    } catch (error) {
      console.error(`[ParticipantService] Failed to get current user ID:`, error);
      return null;
    }
  }

  async fetchParticipantsAsync(chat_id: string): Promise<Participant[]> {
    try {
      console.log(`[ParticipantService] Fetching participants for chat ${chat_id}...`);
      
      let participants = await this.get_participants_for_chat(chat_id);
      
      if (participants.length === 0) {
        await this.syncParticipantsFromServer(chat_id);
        participants = await this.get_participants_for_chat(chat_id);
      }
      
      console.log(`[ParticipantService] Retrieved ${participants.length} participants for chat ${chat_id}`);
      return participants;
    } catch (error) {
      console.error(`[ParticipantService] Failed to fetch participants for chat ${chat_id}:`, error);
      return [];
    }
  }

  async get_user_by_id(user_id: string): Promise<User | null> {
    try {
      const user = await databaseServiceAsync.get_user_by_id(user_id);
      return user;
    } catch (error) {
      console.error('[ParticipantService] Failed to get user by ID:', error);
      return null;
    }
  }

  async fetchAndSaveParticipants(chat_id: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Fetching and saving participants for chat ${chat_id}...`);
      await this.syncParticipantsFromServer(chat_id);
      console.log(`[ParticipantService] Participants fetched and saved for chat ${chat_id}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to fetch and save participants for chat ${chat_id}:`, error);
      throw error;
    }
  }

  /**
   * Manually sync participants for all existing chats to fix their names
   * This is useful for fixing existing chats that have UUIDs as names
   */
  async syncAllExistingChats(): Promise<void> {
    try {
      console.log(`[ParticipantService] Starting sync for all existing chats...`);
      
      // Get all chats from the database
      const allChats = await databaseServiceAsync.getAllChats();
      
      console.log(`[ParticipantService] Found ${allChats.length} chats to sync`);
      
      for (const chat of allChats) {
        try {
          console.log(`[ParticipantService] Syncing participants for chat: ${chat.chat_id} (current name: ${chat.name || 'unnamed'})`);
          
          // Only sync if the chat name looks like a UUID (missing proper name)
          if (!chat.name || chat.name.length === 36 || chat.name.includes('-')) {
            await this.syncParticipantsFromServer(chat.chat_id);
            console.log(`[ParticipantService] Successfully synced chat: ${chat.chat_id}`);
          } else {
            console.log(`[ParticipantService] Skipping chat ${chat.chat_id} - already has proper name: ${chat.name}`);
          }
        } catch (chatError) {
          console.error(`[ParticipantService] Failed to sync chat ${chat.chat_id}:`, chatError);
          // Continue with other chats
        }
      }
      
      console.log(`[ParticipantService] Completed sync for all existing chats`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to sync all existing chats:`, error);
      throw error;
    }
  }

  clearAllCache(): void {
    this.participantCache.clear();
    console.log('[ParticipantService] All participant cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.participantCache.size,
      entries: Array.from(this.participantCache.keys())
    };
  }
}

export const participantService = ParticipantService.getInstance();

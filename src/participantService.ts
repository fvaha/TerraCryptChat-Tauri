import { invoke } from '@tauri-apps/api/core';
import { nativeApiService } from './nativeApiService';

export interface Participant {
  participantId: string;
  userId: string;
  username: string;
  joinedAt: string;
  role: string; // 'creator', 'admin', 'member'
}

export interface PaginatedParticipantResponse {
  data: Participant[];
  limit: number;
  offset: number;
}

class ParticipantService {
  private participantsCache: Map<string, Participant[]> = new Map();

  // Fetch and save participants for a chat
  async fetchAndSaveParticipants(chatId: string): Promise<void> {
    try {
      console.log(`[ParticipantService] Fetching participants for chat: ${chatId}`);
      
      const response = await nativeApiService.getChatMembers(chatId);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.warn(`[ParticipantService] Invalid response for chat ${chatId}:`, response);
        return;
      }

      const participants: Participant[] = response.data.map((item: any) => ({
        participantId: item.user.user_id, // Using user_id as participantId for simplicity
        userId: item.user.user_id,
        username: item.user.username,
        joinedAt: item.joined_at,
        role: item.is_admin ? 'admin' : 'member' // We'll determine creator role later
      }));

      // Save to cache
      this.participantsCache.set(chatId, participants);
      
      // Save to database
      for (const participant of participants) {
        try {
          const dbParticipant = {
            participant_id: participant.participantId,
            user_id: participant.userId,
            username: participant.username,
            joined_at: new Date(participant.joinedAt).getTime(),
            role: participant.role,
            chat_id: chatId
          };
          await invoke('db_insert_participant', { participant: dbParticipant });
        } catch (dbError) {
          console.warn(`[ParticipantService] Failed to save participant to database:`, dbError);
        }
      }

      console.log(`[ParticipantService] Successfully fetched and saved ${participants.length} participants for chat ${chatId}`);
    } catch (error) {
      console.error(`[ParticipantService] Failed to fetch participants for chat ${chatId}:`, error);
    }
  }

  // Get participants for a chat (from cache or fetch if needed)
  async getParticipants(chatId: string): Promise<Participant[]> {
    // Check cache first
    const cached = this.participantsCache.get(chatId);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fetch from database
    try {
      const dbParticipants = await invoke('db_get_participants_for_chat', { chat_id: chatId });
      if (dbParticipants && Array.isArray(dbParticipants) && dbParticipants.length > 0) {
        const participants: Participant[] = dbParticipants.map((p: any) => ({
          participantId: p.participant_id,
          userId: p.user_id,
          username: p.username,
          joinedAt: new Date(p.joined_at).toISOString(),
          role: p.role
        }));
        this.participantsCache.set(chatId, participants);
        return participants;
      }
    } catch (dbError) {
      console.warn(`[ParticipantService] Failed to get participants from database:`, dbError);
    }

    // Fetch from API if not in cache or database
    await this.fetchAndSaveParticipants(chatId);
    return this.participantsCache.get(chatId) || [];
  }

  // Get the other participant's username for direct chats
  async getOtherParticipantUsername(chatId: string, currentUserId: string): Promise<string | null> {
    try {
      const participants = await this.getParticipants(chatId);
      
      if (participants.length === 0) {
        console.warn(`[ParticipantService] No participants found for chat ${chatId}`);
        return null;
      }

      // For direct chats, find the other participant
      if (participants.length === 2) {
        const otherParticipant = participants.find(p => p.userId !== currentUserId);
        if (otherParticipant) {
          return otherParticipant.username;
        }
      }

      // For group chats or if we can't find the other participant
      console.warn(`[ParticipantService] Could not determine other participant for chat ${chatId}`);
      return null;
    } catch (error) {
      console.error(`[ParticipantService] Error getting other participant username:`, error);
      return null;
    }
  }

  // Get sender name for messages
  getSenderName(senderId: string, chatId: string): string {
    const participants = this.participantsCache.get(chatId);
    if (!participants) {
      return 'Unknown';
    }

    const participant = participants.find(p => p.userId === senderId);
    return participant ? participant.username : 'Unknown';
  }

  // Clear cache for a specific chat
  clearCache(chatId: string): void {
    this.participantsCache.delete(chatId);
  }

  // Clear all cache
  clearAllCache(): void {
    this.participantsCache.clear();
  }

  // Ensure participants are loaded for a chat
  async ensureParticipantsLoaded(chatId: string): Promise<void> {
    const participants = await this.getParticipants(chatId);
    if (participants.length === 0) {
      await this.fetchAndSaveParticipants(chatId);
    }
  }
}

export const participantService = new ParticipantService();
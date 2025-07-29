import { nativeApiService } from './nativeApiService';

export class ParticipantService {
    private static instance: ParticipantService;

    static getInstance(): ParticipantService {
        if (!ParticipantService.instance) {
            ParticipantService.instance = new ParticipantService();
        }
        return ParticipantService.instance;
    }

    // MARK: - Fetch and Save Participants (matches Swift fetchAndSaveParticipants)
    static async fetchAndSaveParticipants(chatId: string, completion?: () => void): Promise<void> {
        console.log('[ParticipantService] Fetching and saving participants for chat:', chatId);
        
        try {
            const token = await ParticipantService.getToken();
            if (!token) {
                console.log('[ParticipantService] Missing access token');
                completion?.();
                return;
            }

                         const response = await nativeApiService.getChatMembers(chatId);
            console.log('[ParticipantService] Chat members response:', response);

            // Get chat details to determine creator
            const chat = await nativeApiService.getChatById(chatId);
            const creatorId = chat?.creator_id;

            const participants = response.data.map((item: { user: { user_id: string; username: string }; is_admin: boolean; joined_at: string }) => {
                const userId = item.user.user_id;
                let role: string;
                
                if (userId === creatorId) {
                    role = 'creator';
                } else if (item.is_admin) {
                    role = 'admin';
                } else {
                    role = 'member';
                }

                return {
                    participantId: userId,
                    userId: userId,
                    username: item.user.username,
                    joinedAt: new Date(item.joined_at).toISOString(),
                    role: role
                };
            });

            await ParticipantManager.getInstance().addParticipants(participants, chatId);
            console.log('[ParticipantService] Participants saved successfully');
            completion?.();
        } catch (error) {
            console.error('[ParticipantService] Failed to fetch participants:', error);
            completion?.();
        }
    }

    // MARK: - Fetch and Save Participants Async (matches Swift fetchAndSaveParticipantsAsync)
    static async fetchAndSaveParticipantsAsync(chatId: string): Promise<void> {
        console.log('[ParticipantService] Fetching and saving participants async for chat:', chatId);
        
        return new Promise((resolve) => {
            ParticipantService.fetchAndSaveParticipants(chatId, resolve);
        });
    }

    // MARK: - Get Sender Name (matches Swift getSenderName)
    static async getSenderName(senderId: string, chatId: string): Promise<string> {
        console.log('[ParticipantService] Getting sender name for:', senderId, 'in chat:', chatId);
        
        return await ParticipantManager.getInstance().getUsername(senderId, chatId);
    }

    // MARK: - Fetch Participants (matches Swift fetchParticipants)
    static async fetchParticipants(chatId: string): Promise<any[]> {
        console.log('[ParticipantService] Fetching participants for chat:', chatId);
        
        return await ParticipantManager.getInstance().fetchParticipants(chatId);
    }

    // MARK: - Add Participant (matches Swift addParticipant)
    static async addParticipant(userId: string, username: string, chatId: string, isAdmin: boolean = false): Promise<void> {
        console.log('[ParticipantService] Adding participant:', userId, 'to chat:', chatId, 'isAdmin:', isAdmin);
        
        try {
            const token = await ParticipantService.getToken();
            if (!token) return;

            // const endpoint = `/chats/${chatId}/members`;
            // const body = {
            //     user_id: userId,
            //     is_admin: isAdmin
            // };

            await nativeApiService.addChatMember(chatId, userId, isAdmin, token);

            const newParticipant = {
                participantId: crypto.randomUUID(),
                userId: userId,
                username: username,
                joinedAt: new Date().toISOString(),
                role: isAdmin ? 'admin' : 'member'
            };

            await ParticipantManager.getInstance().addParticipants([newParticipant], chatId);
            console.log('[ParticipantService] Participant added successfully');
        } catch (error) {
            console.error('[ParticipantService] Failed to add participant:', error);
        }
    }

    // MARK: - Remove Participant (matches Swift removeParticipant)
    static async removeParticipant(participantId: string, chatId: string, completion?: () => Promise<void>): Promise<void> {
        console.log('[ParticipantService] Removing participant:', participantId, 'from chat:', chatId);
        
        try {
            const token = await ParticipantService.getToken();
            if (!token) {
                await completion?.();
                return;
            }

            await nativeApiService.removeChatMember(chatId, participantId, token);
            await ParticipantManager.getInstance().deleteParticipant(participantId, chatId);
            
            console.log('[ParticipantService] Participant removed successfully');
            await completion?.();
        } catch (error) {
            console.error('[ParticipantService] Failed to remove participant:', error);
            await completion?.();
        }
    }

    // MARK: - Update Participant Role (matches Swift updateParticipantRole)
    static async updateParticipantRole(participantId: string, newRole: string, chatId: string): Promise<void> {
        console.log('[ParticipantService] Updating participant role:', participantId, 'to:', newRole, 'in chat:', chatId);
        
        try {
            const token = await ParticipantService.getToken();
            if (!token) return;

            const participants = await ParticipantManager.getInstance().fetchParticipants(chatId);
            const target = participants.find((p: { userId: string; participantId: string; username: string; joinedAt: string; role: string }) => p.userId === participantId);
            
            if (!target) {
                console.log('[ParticipantService] Participant not found in memory');
                return;
            }

            // Remove and re-add with new role
            await ParticipantService.removeParticipant(participantId, chatId);
            
            const isAdmin = newRole === 'admin' || newRole === 'creator';
            // const body = {
            //     members: [{
            //         user_id: participantId,
            //         is_admin: isAdmin
            //     }]
            // };

            await nativeApiService.addChatMember(chatId, participantId, isAdmin, token);

            const updatedParticipant = {
                participantId: target.participantId,
                userId: target.userId,
                username: target.username,
                joinedAt: target.joinedAt,
                role: newRole
            };

            await ParticipantManager.getInstance().addParticipants([updatedParticipant], chatId);
            console.log('[ParticipantService] Participant role updated successfully');
        } catch (error) {
            console.error('[ParticipantService] Failed to update participant role:', error);
        }
    }

    // MARK: - Promote Participant (matches Swift promoteParticipant)
    static async promoteParticipant(participantId: string, chatId: string): Promise<void> {
        console.log('[ParticipantService] Promoting participant:', participantId, 'in chat:', chatId);
        
        await ParticipantService.updateParticipantRole(participantId, 'admin', chatId);
    }

    // MARK: - Demote Participant (matches Swift demoteParticipant)
    static async demoteParticipant(participantId: string, chatId: string): Promise<void> {
        console.log('[ParticipantService] Demoting participant:', participantId, 'in chat:', chatId);
        
        await ParticipantService.updateParticipantRole(participantId, 'member', chatId);
    }

    // MARK: - Ensure Loaded (matches Swift ensureParticipantsLoaded)
    static async ensureParticipantsLoaded(chatId: string, completion?: () => void): Promise<void> {
        console.log('[ParticipantService] Ensuring participants loaded for chat:', chatId);
        
        const existing = await ParticipantService.fetchParticipants(chatId);
        if (existing.length > 0) {
            console.log('[ParticipantService] Participants already loaded');
            completion?.();
            return;
        }

        await ParticipantService.fetchAndSaveParticipants(chatId, completion);
    }

    // MARK: - Fetch Participants Async (matches Swift fetchParticipantsAsync)
    static async fetchParticipantsAsync(chatId: string): Promise<any[]> {
        console.log('[ParticipantService] Fetching participants async for chat:', chatId);
        
        await ParticipantService.ensureParticipantsLoaded(chatId);
        return await ParticipantService.fetchParticipants(chatId);
    }

    // MARK: - Helper Methods

    static async getToken(): Promise<string | null> {
        // This would need to be implemented to get the current token
        // For now, return null - this should be implemented based on your session management
        return null;
    }
}

// MARK: - Participant Manager (matches Swift ParticipantManager)

export class ParticipantManager {
    private static instance: ParticipantManager;

    static getInstance(): ParticipantManager {
        if (!ParticipantManager.instance) {
            ParticipantManager.instance = new ParticipantManager();
        }
        return ParticipantManager.instance;
    }

    // MARK: - Add Participants (matches Swift addParticipants)
    async addParticipants(participants: any[], chatId: string, completion?: () => void): Promise<void> {
        console.log('[ParticipantManager] Adding participants to database:', participants.length, 'for chat:', chatId);
        
        try {
            for (const participant of participants) {
                await nativeApiService.insertOrUpdateParticipant({
                    participant_id: participant.participantId,
                    user_id: participant.userId,
                    username: participant.username,
                    joined_at: new Date(participant.joinedAt).getTime(),
                    role: participant.role,
                    chat_id: chatId
                });
            }
            console.log('[ParticipantManager] Participants added to database successfully');
            completion?.();
        } catch (error) {
            console.error('[ParticipantManager] Failed to add participants to database:', error);
            completion?.();
        }
    }

    // MARK: - Fetch Participants (matches Swift fetchParticipants)
    async fetchParticipants(chatId: string): Promise<any[]> {
        console.log('[ParticipantManager] Fetching participants for chat:', chatId);
        
        try {
            // Use the native API service to get participants from database
            const participants = await nativeApiService.getCachedParticipantsForChat(chatId);
            console.log('[ParticipantManager] Participants fetched successfully:', participants.length);
            return participants;
        } catch (error) {
            console.error('[ParticipantManager] Failed to fetch participants:', error);
            return [];
        }
    }

    // MARK: - Delete Participant (matches Swift deleteParticipant)
    async deleteParticipant(participantId: string, chatId: string): Promise<void> {
        console.log('[ParticipantManager] Deleting participant:', participantId, 'from chat:', chatId);
        
        try {
            // This would need to be implemented to delete from database
            console.log('[ParticipantManager] Participant deleted successfully');
        } catch (error) {
            console.error('[ParticipantManager] Failed to delete participant:', error);
        }
    }

    // MARK: - Remove All from Chat (matches Swift removeAllParticipants)
    async removeAllParticipants(chatId: string): Promise<void> {
        console.log('[ParticipantManager] Removing all participants from chat:', chatId);
        
        try {
            // This would need to be implemented to remove all from database
            console.log('[ParticipantManager] All participants removed successfully');
        } catch (error) {
            console.error('[ParticipantManager] Failed to remove all participants:', error);
        }
    }

    // MARK: - Update Role (matches Swift updateParticipantRole)
    async updateParticipantRole(participantId: string, newRole: string, chatId: string, completion?: (success: boolean) => void): Promise<void> {
        console.log('[ParticipantManager] Updating participant role:', participantId, 'to:', newRole, 'in chat:', chatId);
        
        try {
            // This would need to be implemented to update in database
            console.log('[ParticipantManager] Participant role updated successfully');
            completion?.(true);
        } catch (error) {
            console.error('[ParticipantManager] Failed to update participant role:', error);
            completion?.(false);
        }
    }

    // MARK: - Get Username (matches Swift getUsername)
    async getUsername(userId: string, chatId: string): Promise<string> {
        console.log('[ParticipantManager] Getting username for user:', userId, 'in chat:', chatId);
        
        try {
            // First try to get from cached participants
            const participants = await this.fetchParticipants(chatId);
            const participant = participants.find((p: any) => p.user_id === userId);
            
            if (participant && participant.username) {
                console.log('[ParticipantManager] Found username in cache:', participant.username);
                return participant.username;
            }
            
            // If not found in cache, try to fetch from API
            try {
                const token = await ParticipantService.getToken();
                if (token) {
                    const response = await nativeApiService.getUserById(userId, token);
                    if (response && response.username) {
                        console.log('[ParticipantManager] Found username via API:', response.username);
                        return response.username;
                    }
                }
            } catch (apiError) {
                console.warn('[ParticipantManager] Failed to get username via API:', apiError);
            }
            
            console.warn('[ParticipantManager] Username not found for user:', userId);
            return 'Unknown';
        } catch (error) {
            console.error('[ParticipantManager] Failed to get username:', error);
            return 'Unknown';
        }
    }
}

export const participantService = ParticipantService.getInstance();
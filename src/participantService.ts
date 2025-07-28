import { databaseService, Participant } from './databaseService';

export async function insertParticipant(part: any) {
  const participant: Participant = {
    participant_id: part.participantId,
    user_id: part.userId,
    username: part.username,
    joined_at: part.joinedAt,
    role: part.role,
    chat_id: part.chatId
  };
  await databaseService.insertParticipant(participant);
}

export async function fetchParticipants(chatId: string): Promise<any[]> {
  return await databaseService.getParticipantsForChat(chatId);
}
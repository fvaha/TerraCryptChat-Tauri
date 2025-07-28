import { databaseService } from './databaseService';

export async function updateDarkMode(userId: string, isDarkMode: boolean) {
  await databaseService.updateDarkMode(userId, isDarkMode);
}

export async function getDarkMode(userId: string): Promise<boolean> {
  return await databaseService.getDarkMode(userId);
}
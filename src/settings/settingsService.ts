import { databaseServiceAsync } from '../services/databaseServiceAsync';

export class SettingsService {
  async updateDarkMode(userId: string, isDarkMode: boolean): Promise<void> {
    try {
      await databaseServiceAsync.updateDarkMode(userId, isDarkMode);
      console.log(`[SettingsService] Dark mode updated for user ${userId}: ${isDarkMode}`);
    } catch (error) {
      console.error(`[SettingsService] Failed to update dark mode:`, error);
      throw error;
    }
  }

  async getDarkMode(userId: string): Promise<boolean> {
    try {
      return await databaseServiceAsync.getDarkMode(userId);
    } catch (error) {
      console.error(`[SettingsService] Failed to get dark mode:`, error);
      return false;
    }
  }
}

export const settingsService = new SettingsService();
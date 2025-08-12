import { databaseServiceAsync } from '../services/databaseServiceAsync';

export class SettingsService {
  private static instance: SettingsService;

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async update_dark_mode(user_id: string, is_dark_mode: boolean): Promise<void> {
    try {
      await databaseServiceAsync.update_dark_mode(user_id, is_dark_mode);
      console.log(`[SettingsService] Dark mode updated for user ${user_id}: ${is_dark_mode}`);
    } catch (error) {
      console.error('[SettingsService] Failed to update dark mode:', error);
      throw error;
    }
  }

  async get_dark_mode(user_id: string): Promise<boolean> {
    try {
      return await databaseServiceAsync.get_dark_mode(user_id);
    } catch (error) {
      console.error('[SettingsService] Failed to get dark mode:', error);
      return false;
    }
  }

  async update_color_scheme(user_id: string, color_scheme: string): Promise<void> {
    try {
      await databaseServiceAsync.update_color_scheme(user_id, color_scheme);
      console.log(`[SettingsService] Color scheme updated for user ${user_id}: ${color_scheme}`);
    } catch (error) {
      console.error('[SettingsService] Failed to update color scheme:', error);
      throw error;
    }
  }

  async get_color_scheme(user_id: string): Promise<string> {
    try {
      return await databaseServiceAsync.get_color_scheme(user_id);
    } catch (error) {
      console.error('[SettingsService] Failed to get color scheme:', error);
      return 'default';
    }
  }
}

export const settingsService = SettingsService.getInstance();

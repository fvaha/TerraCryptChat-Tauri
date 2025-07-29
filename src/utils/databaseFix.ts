import { nativeApiService } from '../nativeApiService';

export class DatabaseFixUtil {
  /**
   * Fixes database schema issues by resetting the database
   * This will clear all local data and recreate the database with the correct schema
   */
  static async fixDatabaseSchema(): Promise<void> {
    console.log('[DatabaseFixUtil] Starting database schema fix...');
    
    try {
      await nativeApiService.fixDatabaseSchema();
      console.log('[DatabaseFixUtil] Database schema fixed successfully');
    } catch (error) {
      console.error('[DatabaseFixUtil] Failed to fix database schema:', error);
      throw error;
    }
  }

  /**
   * Checks if the current database has schema issues
   * This can be called to detect problems before they cause errors
   */
  static async checkDatabaseHealth(): Promise<{ isHealthy: boolean; issues: string[] }> {
    console.log('[DatabaseFixUtil] Checking database health...');
    
    const issues: string[] = [];
    
    try {
      // Try to insert a test friend to check for schema issues
      const testFriend = {
        user_id: 'test-user-id',
        username: 'test-username',
        email: 'test@example.com',
        name: 'Test User',
        picture: null,
        created_at: null,
        updated_at: null,
        status: null,
        is_favorite: false
      };
      
      await nativeApiService.insertOrUpdateFriend(testFriend);
      
      // If we get here, the friend table is working
      console.log('[DatabaseFixUtil] Friend table schema is healthy');
    } catch (error) {
      if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table friend has no column named user_id')) {
        issues.push('Friend table missing user_id column');
      }
    }
    
    try {
      // Try to insert a test chat to check for schema issues
      const testChat = {
        chat_id: 'test-chat-id',
        name: 'Test Chat',
        created_at: Date.now(),
        creator_id: 'test-creator',
        is_group: false,
        group_name: null,
        description: null,
        unread_count: 0,
        last_message_content: null,
        last_message_timestamp: null,
        participants: null
      };
      
      await nativeApiService.insertOrUpdateChat(testChat);
      
      // If we get here, the chat table is working
      console.log('[DatabaseFixUtil] Chat table schema is healthy');
    } catch (error) {
      if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table chat has no column named name')) {
        issues.push('Chat table missing name column');
      }
    }
    
    const isHealthy = issues.length === 0;
    
    if (isHealthy) {
      console.log('[DatabaseFixUtil] Database is healthy');
    } else {
      console.log('[DatabaseFixUtil] Database has issues:', issues);
    }
    
    return { isHealthy, issues };
  }

  /**
   * Automatically fixes database issues if they are detected
   */
  static async autoFixIfNeeded(): Promise<boolean> {
    console.log('[DatabaseFixUtil] Checking if database needs fixing...');
    
    try {
      const health = await this.checkDatabaseHealth();
      
      if (!health.isHealthy) {
        console.log('[DatabaseFixUtil] Database issues detected, attempting to fix...');
        await this.fixDatabaseSchema();
        console.log('[DatabaseFixUtil] Database auto-fix completed');
        return true;
      } else {
        console.log('[DatabaseFixUtil] Database is healthy, no fix needed');
        return false;
      }
    } catch (error) {
      console.error('[DatabaseFixUtil] Auto-fix failed:', error);
      throw error;
    }
  }

  /**
   * Force reset the database immediately (for emergency fixes)
   */
  static async forceResetDatabase(): Promise<void> {
    console.log('[DatabaseFixUtil] Force resetting database...');
    
    try {
      await nativeApiService.resetDatabase();
      console.log('[DatabaseFixUtil] Database force reset completed');
      
      // Wait a moment for the reset to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test the database after reset
      const health = await this.checkDatabaseHealth();
      if (health.isHealthy) {
        console.log('[DatabaseFixUtil] Database reset successful and healthy');
      } else {
        console.error('[DatabaseFixUtil] Database reset failed, still has issues:', health.issues);
      }
    } catch (error) {
      console.error('[DatabaseFixUtil] Force reset failed:', error);
      throw error;
    }
  }
} 
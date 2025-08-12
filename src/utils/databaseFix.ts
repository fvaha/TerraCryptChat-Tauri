import { nativeApiService } from '../api/nativeApiService';

export class DatabaseFixUtil {
  /**
   * Fixes database schema issues by resetting the database
   * This will clear all local data and recreate the database with the correct schema
   */
  static async fixDatabaseSchema(): Promise<void> {
    console.log('[DatabaseFixUtil] Starting database schema fix...');
    
    try {
      await nativeApiService.clearAllData();
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
      // Check if friend table has the correct schema by trying to access it
      // We don't actually insert test data, just check if the table exists
      await nativeApiService.get_all_friends();
      
      // If we get here, the friend table is working
      console.log('[DatabaseFixUtil] Friend table schema is healthy');
    } catch (error) {
      if (error && typeof error === 'object' && 'toString' in error && error.toString().includes('table friend has no column named user_id')) {
        issues.push('Friend table missing user_id column');
      }
    }
    
    try {
      // Check if chat table has the correct schema by trying to access it
      // We don't actually insert test data, just check if the table exists
      await nativeApiService.getCachedChatsOnly();
      
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
      await nativeApiService.clearAllData();
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

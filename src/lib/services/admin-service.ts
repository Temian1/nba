import { AuthService } from './auth-service';
import { db } from '../db';
import { users, players, teams, games, playerStats } from '../db/schema';
import { eq, count, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { withDbFallback } from '../db/fallback-service';
import { CACHE_KEYS } from '../storage';

export class AdminService {
  private static instance: AdminService;
  private static readonly ADMIN_EMAIL = 'admin@admin.com';

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * Initialize default admin user if it doesn't exist
   */
  async initializeDefaultAdmin(): Promise<{ email: string; password?: string; existed: boolean }> {
    try {
      // Check if admin already exists
      const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.email, AdminService.ADMIN_EMAIL))
        .limit(1);

      if (existingAdmin.length > 0) {
        console.log('✅ Default admin user already exists');
        return {
          email: AdminService.ADMIN_EMAIL,
          existed: true
        };
      }

      // Generate secure random password
      const password = this.generateSecurePassword();

      // Create admin user
      await AuthService.register({
        email: AdminService.ADMIN_EMAIL,
        password: password,
        firstName: 'Admin',
        lastName: 'User'
      });

      // Update role to admin
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, AdminService.ADMIN_EMAIL));

      // Store password securely (in production, this should be handled differently)
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_initial_password', password);
      }

      console.log('🔑 Default admin user created:');
      console.log(`Email: ${AdminService.ADMIN_EMAIL}`);
      console.log(`Password: ${password}`);
      console.log('⚠️  Please change this password after first login!');

      return {
        email: AdminService.ADMIN_EMAIL,
        password: password,
        existed: false
      };
    } catch (error) {
      console.error('❌ Error initializing default admin:', error);
      throw error;
    }
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Get admin statistics for dashboard
   */
  async getAdminStats(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    totalGames: number;
    totalStats: number;
    lastSyncTime?: Date;
  }> {
    return await withDbFallback(
      async () => {
        const [playersCount] = await db.select({ count: count() }).from(players);
        const [teamsCount] = await db.select({ count: count() }).from(teams);
        const [gamesCount] = await db.select({ count: count() }).from(games);
        const [statsCount] = await db.select({ count: count() }).from(playerStats);
        
        // Get last sync time from most recent game or player stat
        const [lastSyncGames] = await db.select({ lastSync: sql<Date>`MAX(${games.created_at})` }).from(games);
        const [lastSyncStats] = await db.select({ lastSync: sql<Date>`MAX(${playerStats.created_at})` }).from(playerStats);
        
        const lastSyncTime = lastSyncGames.lastSync && lastSyncStats.lastSync 
          ? new Date(Math.max(lastSyncGames.lastSync.getTime(), lastSyncStats.lastSync.getTime()))
          : lastSyncGames.lastSync || lastSyncStats.lastSync || undefined;

        return {
          totalPlayers: Number(playersCount.count || 0),
          totalTeams: Number(teamsCount.count || 0),
          totalGames: Number(gamesCount.count || 0),
          totalStats: Number(statsCount.count || 0),
          lastSyncTime
        };
      },
      `${CACHE_KEYS.ADMIN}_stats`,
      {
        totalPlayers: 0,
        totalTeams: 0,
        totalGames: 0,
        totalStats: 0,
        lastSyncTime: new Date(0) // Unix epoch start date as fallback
      }
    );
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user?.role === 'admin';
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Update admin password
   */
  async updateAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // First verify current password
      await AuthService.login({
        email: AdminService.ADMIN_EMAIL,
        password: currentPassword
      });

      // Update password
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await db
        .update(users)
        .set({ password_hash: passwordHash })
        .where(eq(users.email, AdminService.ADMIN_EMAIL));

      console.log('✅ Admin password updated successfully');
    } catch (error) {
      console.error('❌ Error updating admin password:', error);
      throw error;
    }
  }
}

export const adminService = AdminService.getInstance();
import { AuthService } from './auth-service';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

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
    try {
      const [playersCount] = await db.execute(`SELECT COUNT(*) as count FROM players`);
      const [teamsCount] = await db.execute(`SELECT COUNT(*) as count FROM teams`);
      const [gamesCount] = await db.execute(`SELECT COUNT(*) as count FROM games`);
      const [statsCount] = await db.execute(`SELECT COUNT(*) as count FROM player_stats`);
      
      // Get last sync time from most recent game or player stat
      const [lastSync] = await db.execute(`
        SELECT MAX(created_at) as last_sync 
        FROM (
          SELECT created_at FROM games 
          UNION ALL 
          SELECT created_at FROM player_stats
        ) as combined
      `);

      return {
        totalPlayers: Number(playersCount.rows[0]?.count || 0),
        totalTeams: Number(teamsCount.rows[0]?.count || 0),
        totalGames: Number(gamesCount.rows[0]?.count || 0),
        totalStats: Number(statsCount.rows[0]?.count || 0),
        lastSyncTime: lastSync.rows[0]?.last_sync ? new Date(lastSync.rows[0].last_sync) : undefined
      };
    } catch (error) {
      console.error('❌ Error getting admin stats:', error);
      throw error;
    }
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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, userSessions } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        is_active: true,
        email_verified: false
      })
      .returning();

    // Generate JWT token
    const token = this.generateToken(newUser.id);

    // Store session
    await this.createSession(newUser.id, token);

    return {
      user: this.formatUser(newUser),
      token
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials;

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db
      .update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Store session
    await this.createSession(user.id, token);

    return {
      user: this.formatUser(user),
      token
    };
  }

  /**
   * Verify JWT token and get user
   */
  static async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      // Check if session exists and is valid
      const tokenHash = await bcrypt.hash(token, 10);
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.user_id, decoded.userId),
            gt(userSessions.expires_at, new Date())
          )
        )
        .limit(1);

      if (!session) {
        return null;
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user || !user.is_active) {
        return null;
      }

      // Update session last used
      await db
        .update(userSessions)
        .set({ last_used: new Date() })
        .where(eq(userSessions.id, session.id));

      return this.formatUser(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user (invalidate session)
   */
  static async logout(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      // Delete all sessions for this user
      await db
        .delete(userSessions)
        .where(eq(userSessions.user_id, decoded.userId));
    } catch (error) {
      // Token is invalid, but that's okay for logout
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    await db
      .delete(userSessions)
      .where(gt(new Date(), userSessions.expires_at));
  }

  /**
   * Generate JWT token
   */
  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Create session record
   */
  private static async createSession(userId: string, token: string): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(userSessions).values({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt
    });
  }

  /**
   * Format user object for response
   */
  private static formatUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at
    };
  }
}

/**
 * Middleware to protect routes
 */
export async function requireAuth(request: Request): Promise<User> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const user = await AuthService.verifyToken(token);
  
  if (!user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

/**
 * Extract token from request headers
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}
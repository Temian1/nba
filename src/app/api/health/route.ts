import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const dbCheck = await db.execute(sql`SELECT 1 as health_check`);
    const dbResponseTime = Date.now() - startTime;
    
    // Check if we have recent data
    const dataCheck = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM games 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    const recentGamesCount = Number((dataCheck as any)[0]?.count || 0);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'healthy',
          responseTime: `${dbResponseTime}ms`
        },
        data: {
          status: recentGamesCount > 0 ? 'healthy' : 'warning',
          recentGames: recentGamesCount,
          message: recentGamesCount > 0 ? 'Recent data available' : 'No recent games data'
        }
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
    
    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: {
          status: 'unhealthy',
          error: 'Database connection failed'
        }
      }
    };
    
    return NextResponse.json(health, { status: 503 });
  }
}
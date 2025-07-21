import { NextRequest, NextResponse } from 'next/server';
import { AuthService, extractToken } from '@/lib/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    
    if (token) {
      await AuthService.logout(token);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error: any) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Logout failed'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    return NextResponse.json({
      success: true,
      data: { user }
    });
    
  } catch (error: any) {
    console.error('Get user error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Unauthorized'
    }, { status: 401 });
  }
}
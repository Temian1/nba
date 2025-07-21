import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth-service';
import { adminService } from '@/lib/services/admin-service';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await requireAuth(request);
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get admin statistics
    const stats = await adminService.getAdminStats();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
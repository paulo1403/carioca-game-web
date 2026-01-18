import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = await prisma.gameHistory.findMany({
      orderBy: { playedAt: 'desc' },
      take: 20,
    });
    
    // Parse participants JSON
    const formattedHistory = history.map(h => ({
        ...h,
        participants: JSON.parse(h.participants)
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

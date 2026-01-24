import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerIdToRemove, requesterId } = await request.json();

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (session.status !== 'WAITING') {
      return NextResponse.json({ error: 'Cannot remove players during game' }, { status: 400 });
    }

    // Check permissions
    const requester = session.players.find(p => p.id === requesterId);
    const isHost = session.creatorId === requesterId;
    const isSelf = playerIdToRemove === requesterId;

    if (!requester) {
      return NextResponse.json({ error: 'Requester not in game' }, { status: 403 });
    }

    // Only allow removal if:
    // 1. Requester is the Host (can kick anyone)
    // 2. Requester is removing themselves (leave game)
    if (!isHost && !isSelf) {
      return NextResponse.json({ error: 'Only host can remove other players' }, { status: 403 });
    }

    // Get removed player's name (for notification), then delete
    const playerToRemove = await prisma.player.findUnique({ where: { id: playerIdToRemove } });

    await prisma.player.delete({
      where: { id: playerIdToRemove }
    });

    // Touch GameSession to trigger Realtime UPDATE so other clients get notified
    if (playerToRemove) {
      await prisma.gameSession.update({
        where: { id },
        data: {
          lastAction: JSON.stringify({
            playerId: playerIdToRemove,
            type: "LEAVE",
            description: `${playerToRemove.name} abandonó la partida`,
            timestamp: Date.now(),
          }),
        },
      });
    }

    return NextResponse.json({ success: true, removedPlayer: playerToRemove });

  } catch (error) {
    console.error('Error removing player:', error);
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 });
  }
}

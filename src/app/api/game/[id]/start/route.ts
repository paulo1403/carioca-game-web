import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDeck, shuffleDeck } from '@/utils/deck';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    if (session.players.length < 3) {
      return NextResponse.json({ error: 'Minimum 3 players required' }, { status: 400 });
    }

    // Deal Cards
    const deck = shuffleDeck(createDeck());
    const discardPile = [deck.pop()!];

    // Deal 11 cards to each player
    const updates = session.players.map(player => {
      const hand = deck.splice(0, 11);
      return prisma.player.update({
        where: { id: player.id },
        data: {
          hand: JSON.stringify(hand),
          melds: '[]', // Reset melds on start
          hasDrawn: false
        }
      });
    });

    // Update Session
    const updateSession = prisma.gameSession.update({
      where: { id },
      data: {
        status: 'PLAYING',
        deck: JSON.stringify(deck),
        discardPile: JSON.stringify(discardPile),
        currentTurn: 0,
        reshuffleCount: 0,
        direction: 'counter-clockwise',
        pendingBuyIntents: "[]",
        pendingDiscardIntents: "[]",
        lastAction: JSON.stringify({
          playerId: "SYSTEM",
          type: "START_GAME",
          description: "¡Partida iniciada!",
          timestamp: Date.now(),
        }),
      }
    });

    await prisma.$transaction([...updates, updateSession]);

    // Check if the first player is a bot and process its turn
    const { checkAndProcessBotTurns } = await import("@/services/gameService");
    await checkAndProcessBotTurns(id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}

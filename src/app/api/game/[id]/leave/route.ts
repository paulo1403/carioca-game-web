import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { playerId } = await request.json();

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: orderPlayersByTurn,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Check if player is in game
    const player = session.players.find((p) => p.id === playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not in game" }, { status: 404 });
    }

    // If host leaves (first player usually, or we can check index 0), we might want to destroy game or reassign host.
    // For MVP, if host leaves, game continues but without host, or destroy.
    // Let's just remove the player.

    await prisma.player.delete({
      where: { id: playerId },
    });

    const remaining = session.players.filter((p) => p.id !== playerId);
    const reindexUpdates = remaining.map((p, idx) =>
      prisma.player.update({
        where: { id: p.id },
        data: { turnOrder: idx } as any,
      }),
    );

    // If no players left, maybe delete session? (Optional cleanup)
    const remainingPlayers = session.players.length - 1;
    if (remainingPlayers === 0) {
      await prisma.gameSession.delete({ where: { id } });
    } else if (reindexUpdates.length > 0) {
      await prisma.$transaction(reindexUpdates);
    }

    return NextResponse.json({ success: true, playerName: player.name });
  } catch (error) {
    console.error("Error leaving game:", error);
    return NextResponse.json({ error: "Failed to leave game" }, { status: 500 });
  }
}

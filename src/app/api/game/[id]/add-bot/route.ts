import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { createDeck, shuffleDeck } from "@/utils/deck";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { difficulty } = await request.json(); // 'EASY', 'MEDIUM', 'HARD'

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

    if (session.status !== "WAITING" && session.status !== "PLAYING") {
      // Can we add bots mid-game? Usually no, but for lobby yes.
      // Assuming we can only add bots in lobby.
      if (session.status !== "WAITING") {
        return NextResponse.json({ error: "Cannot add bot now" }, { status: 400 });
      }
    }

    // Check max players
    if (session.players.length >= 5) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    const botId = uuidv4();
    const botName = `Bot ${session.players.length + 1} (${
      difficulty === "EASY" ? "Fácil" : difficulty === "MEDIUM" ? "Medio" : "Difícil"
    })`;

    // Deal cards if game already started? No, assuming lobby only.
    // If we support joining mid-game, we'd need to deal cards.
    // For now, hand is empty until Start.

    const createdBot = await prisma.player.create({
      data: {
        id: botId,
        name: botName,
        hand: "[]", // Empty initially
        boughtCards: "[]",
        melds: "[]",
        score: 0,
        buysUsed: 0,
        isBot: true,
        difficulty: difficulty || "EASY",
        turnOrder: session.players.length,
        gameSessionId: id,
      } as any,
    });

    // Touch GameSession to trigger Realtime UPDATE for other clients
    await prisma.gameSession.update({
      where: { id },
      data: {
        lastAction: JSON.stringify({
          playerId: botId,
          type: "JOIN",
          description: `${botName} se unió a la partida`,
          timestamp: Date.now(),
        }),
      },
    });

    return NextResponse.json({ bot: createdBot });
  } catch (error) {
    console.error("Error adding bot:", error);
    return NextResponse.json({ error: "Failed to add bot" }, { status: 500 });
  }
}

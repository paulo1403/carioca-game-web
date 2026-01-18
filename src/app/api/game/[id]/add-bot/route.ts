import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { createDeck, shuffleDeck } from "@/utils/deck";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { difficulty } = await request.json(); // 'EASY', 'MEDIUM', 'HARD'

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (session.status !== "WAITING" && session.status !== "PLAYING") {
      // Can we add bots mid-game? Usually no, but for lobby yes.
      // Assuming we can only add bots in lobby.
      if (session.status !== "WAITING") {
        return NextResponse.json(
          { error: "Cannot add bot now" },
          { status: 400 }
        );
      }
    }

    // Check max players
    if (session.players.length >= 5) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    const botId = uuidv4();
    const botName = `Bot ${session.players.length + 1} (${
      difficulty === "EASY"
        ? "Fácil"
        : difficulty === "MEDIUM"
        ? "Medio"
        : "Difícil"
    })`;

    // Deal cards if game already started? No, assuming lobby only.
    // If we support joining mid-game, we'd need to deal cards.
    // For now, hand is empty until Start.

    await prisma.player.create({
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
        gameSessionId: id,
      },
    });

    return NextResponse.json({ success: true, botId });
  } catch (error) {
    console.error("Error adding bot:", error);
    return NextResponse.json({ error: "Failed to add bot" }, { status: 500 });
  }
}

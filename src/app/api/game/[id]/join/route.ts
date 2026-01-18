import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { Card } from "@/types/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerName } = await request.json();
  const playerId = uuidv4();

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (session.status !== "WAITING") {
      return NextResponse.json(
        { error: "Game already started" },
        { status: 400 }
      );
    }

    if (session.players.length >= 5) {
      return NextResponse.json({ error: "Game full" }, { status: 400 });
    }

    // Add new player
    await prisma.player.create({
      data: {
        id: playerId,
        name: playerName,
        hand: "[]",
        boughtCards: "[]",
        melds: "[]",
        score: 0,
        buysUsed: 0,
        isBot: false,
        gameSessionId: id,
      },
    });

    return NextResponse.json({ playerId });
  } catch (error) {
    console.error("Error joining game:", error);
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Card } from "@/types/game";

export async function GET(
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
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const gameState = {
      ...session,
      deck: JSON.parse(session.deck),
      discardPile: JSON.parse(session.discardPile),
      creatorId: session.creatorId,
      players: session.players.map((p) => ({
        ...p,
        hand: JSON.parse(p.hand) as Card[],
        melds: JSON.parse(p.melds || "[]") as Card[][],
        boughtCards: JSON.parse(p.boughtCards || "[]") as Card[],
        roundScores: JSON.parse(p.roundScores || "[]") as number[],
        roundBuys: JSON.parse(p.roundBuys || "[]") as number[],
      })),
      readyForNextRound: JSON.parse(session.readyForNextRound || "[]"),
      lastAction: session.lastAction
        ? JSON.parse(session.lastAction)
        : undefined,
    };

    return NextResponse.json({ gameState });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch state" },
      { status: 500 }
    );
  }
}

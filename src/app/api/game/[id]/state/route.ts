import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Card } from "@/types/game";
import { checkAndProcessBotTurns } from "@/services/gameService";

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

    // TRIGGER BOTS: If it's a bot's turn, process it before returning state
    const currentPlayer = session.players[session.currentTurn];
    if (currentPlayer?.isBot && session.status === "PLAYING") {
      await checkAndProcessBotTurns(id);
      // Re-fetch to get updated state after bot moves
      const updatedSession = await prisma.gameSession.findUnique({
        where: { id },
        include: { players: { orderBy: { createdAt: "asc" } } },
      });
      if (updatedSession) {
        // Use updated session for response
        const gameState = {
          ...updatedSession,
          deck: JSON.parse(updatedSession.deck),
          discardPile: JSON.parse(updatedSession.discardPile),
          creatorId: updatedSession.creatorId,
          players: updatedSession.players.map((p) => ({
            ...p,
            hand: JSON.parse(p.hand) as Card[],
            melds: JSON.parse(p.melds || "[]") as Card[][],
            boughtCards: JSON.parse(p.boughtCards || "[]") as Card[],
            roundScores: JSON.parse(p.roundScores || "[]") as number[],
            roundBuys: JSON.parse(p.roundBuys || "[]") as number[],
          })),
          readyForNextRound: JSON.parse(updatedSession.readyForNextRound || "[]"),
          lastAction: updatedSession.lastAction
            ? JSON.parse(updatedSession.lastAction)
            : undefined,
        };
        return NextResponse.json({ gameState });
      }
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

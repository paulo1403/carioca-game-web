import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDeck, shuffleDeck } from "@/utils/deck";
import { v4 as uuidv4 } from "uuid";
import { GameState, Player } from "@/types/game";

export async function POST(request: Request) {
  const { hostName } = await request.json();
  const roomId = uuidv4().slice(0, 8);
  const hostId = uuidv4();

  // Initial Game State Setup
  // Don't shuffle yet, wait for start
  // const deck = shuffleDeck(createDeck());
  // const discardPile = [deck.pop()!];

  // Host Player
  const hostPlayer: Player = {
    id: hostId,
    name: hostName || "Anfitrión",
    hand: [], // Empty initially
    boughtCards: [], // Empty initially
    melds: [], // Empty initially
    score: 0,
    isBot: false,
    buysUsed: 0,
  };

  try {
    const session = await prisma.gameSession.create({
      data: {
        id: roomId,
        creatorId: hostId,
        status: "WAITING",
        currentTurn: 0,
        currentRound: 1,
        direction: "clockwise",
        deck: "[]", // Empty
        discardPile: "[]", // Empty
        reshuffleCount: 0,
        players: {
          create: {
            id: hostPlayer.id,
            name: hostPlayer.name,
            hand: "[]",
            boughtCards: "[]",
            melds: "[]",
            score: hostPlayer.score,
            isBot: hostPlayer.isBot,
            buysUsed: hostPlayer.buysUsed,
          },
        },
      },
      include: {
        players: true,
      },
    });

    return NextResponse.json({
      roomId: session.id,
      playerId: hostId,
      gameState: {
        ...session,
        deck: JSON.parse(session.deck),
        discardPile: JSON.parse(session.discardPile),
        players: session.players.map((p) => ({
          ...p,
          hand: JSON.parse(p.hand),
          melds: JSON.parse(p.melds),
          boughtCards: JSON.parse(p.boughtCards),
        })),
      },
    });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createGameSchema, validateRequest } from "@/lib/validations";
import { GameState, type Player } from "@/types/game";
import { createDeck, shuffleDeck } from "@/utils/deck";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Validar con JOI
  const { value, error } = await validateRequest(createGameSchema, body);
  if (error) {
    return NextResponse.json({ error: "Invalid input", details: error }, { status: 400 });
  }

  const { creatorName, difficulty = "MEDIUM" } = value;

  // 2. Verificar si hay sesión
  const session = await auth();
  const ownerId = session?.user?.id;

  const roomId = uuidv4().slice(0, 8);
  const hostId = uuidv4();

  // Initial Game State Setup
  // Don't shuffle yet, wait for start
  // const deck = shuffleDeck(createDeck());
  // const discardPile = [deck.pop()!];

  // Host Player
  const hostPlayer: Player = {
    id: hostId,
    name: creatorName || "Anfitrión",
    hand: [], // Empty initially
    boughtCards: [], // Empty initially
    melds: [], // Empty initially
    score: 0,
    roundScores: [],
    roundBuys: [],
    isBot: false,
    buysUsed: 0,
    hasDrawn: false,
    turnOrder: 0,
  };

  try {
    const session = await prisma.gameSession.create({
      data: {
        id: roomId,
        creatorId: hostId,
        ownerId: ownerId, // El usuario de Auth que es dueño de la sala
        status: "WAITING",
        currentTurn: 0,
        currentRound: 1,
        direction: "counter-clockwise",
        deck: "[]", // Empty
        discardPile: "[]", // Empty
        reshuffleCount: 0,
        players: {
          create: {
            id: hostPlayer.id,
            userId: ownerId, // Si está autenticado, vinculamos el jugador al usuario
            name: hostPlayer.name,
            hand: "[]",
            boughtCards: "[]",
            melds: "[]",
            score: hostPlayer.score,
            isBot: hostPlayer.isBot,
            buysUsed: hostPlayer.buysUsed,
            turnOrder: hostPlayer.turnOrder,
          },
        },
      },
      include: {
        players: {
          orderBy: orderPlayersByTurn,
        },
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
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { Card } from "@/types/game";

import { joinGameSchema, validateRequest } from "@/lib/validations";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // 1. Validar con JOI
  const { value, error } = await validateRequest(joinGameSchema, body);
  if (error) {
    return NextResponse.json(
      { error: "Invalid input", details: error },
      { status: 400 },
    );
  }

  const { name } = value;

  // 2. Verificar si hay sesión
  const sessionUser = await auth();
  const userId = sessionUser?.user?.id;

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

    if (session.status !== "WAITING") {
      return NextResponse.json(
        { error: "Game already started" },
        { status: 400 },
      );
    }

    // Check if user is already in the game (if authenticated)
    if (userId) {
      const existingPlayer = session.players.find((p) => p.userId === userId);
      if (existingPlayer) {
        return NextResponse.json({ playerId: existingPlayer.id });
      }
    }

    if (session.players.length >= 5) {
      return NextResponse.json({ error: "Game full" }, { status: 400 });
    }

    const playerId = uuidv4();

    // Add new player
    await prisma.player.create({
      data: {
        id: playerId,
        userId: userId, // Vinculamos el jugador al usuario de Auth si existe
        name: name,
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

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processMove } from "@/services/gameService";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

/**
 * Force skip the current bot's turn
 * Only the host can call this endpoint
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { requesterId } = await req.json();

    // Get game session
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: orderPlayersByTurn,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
    }

    // Verify requester is the host
    if (session.creatorId !== requesterId) {
      return NextResponse.json(
        { error: "Solo el anfitrión puede forzar el turno de un bot" },
        { status: 403 },
      );
    }

    // Get current player
    const currentPlayer = session.players[session.currentTurn];
    if (!currentPlayer) {
      return NextResponse.json({ error: "Jugador actual no encontrado" }, { status: 400 });
    }

    // Only allow skipping bot turns
    if (!currentPlayer.isBot) {
      return NextResponse.json({ error: "Solo se pueden saltar turnos de bots" }, { status: 400 });
    }

    // Force the bot to discard a card if they have cards in hand
    if (currentPlayer.hand.length === 0) {
      return NextResponse.json({ error: "El bot no tiene cartas para descartar" }, { status: 400 });
    }

    // Get the worst card to discard (highest point value that's not a joker)
    const hand = JSON.parse(currentPlayer.hand as any);
    let cardToDiscard = hand[0];
    let maxPoints = 0;

    for (const card of hand) {
      let points = 0;
      if (card.suit === "JOKER" || card.value === 0) {
        points = 20;
      } else if (card.value === 1) {
        points = 15;
      } else if (card.value >= 11 && card.value <= 13) {
        points = 10;
      } else {
        points = card.value;
      }

      // Prefer non-jokers
      if (points > maxPoints && card.suit !== "JOKER" && card.value !== 0) {
        cardToDiscard = card;
        maxPoints = points;
      }
    }

    // If only jokers, take the first one
    if (cardToDiscard.suit === "JOKER" || cardToDiscard.value === 0) {
      for (const card of hand) {
        if (card.suit !== "JOKER" && card.value !== 0) {
          cardToDiscard = card;
          break;
        }
      }
    }

    // Process the discard move
    const result = await processMove(id, currentPlayer.id, "DISCARD", {
      cardId: cardToDiscard.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al forzar descarte del bot" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Turno del bot ${currentPlayer.name} forzado. Descartó una carta.`,
    });
  } catch (error) {
    console.error("Error skipping bot turn:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

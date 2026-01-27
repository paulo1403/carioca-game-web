import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { moveSchema, validateRequest } from "@/lib/validations";
import { checkAndProcessBotTurns, processMove } from "@/services/gameService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // 1. Validar con JOI
  const { value, error } = await validateRequest(moveSchema, body);
  if (error) {
    return NextResponse.json({ error: "Invalid move data", details: error }, { status: 400 });
  }

  const { playerId, action, payload } = value;

  try {
    // 2. Control de Autorización (Seguridad)
    // Verificamos si este jugador pertenece a un usuario autenticado
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
      select: { userId: true },
    });

    if (playerRecord?.userId) {
      const session = await auth();
      if (session?.user?.id !== playerRecord.userId) {
        return NextResponse.json(
          { error: "Not authorized to move for this player" },
          { status: 403 },
        );
      }
    }

    // 3. Procesar el movimiento
    const result = await processMove(id, playerId, action, payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Move failed" },
        { status: result.status || 400 },
      );
    }

    // 2. If the move was successful, check if it's now a Bot's turn
    // We run this in the background or await it.
    // Awaiting ensures the bot moves are committed before the next polling interval potentially.
    // However, if we want the user to get a fast "Success" response, we might not want to wait too long.
    // But since it's a card game, < 1s delay is fine.
    await checkAndProcessBotTurns(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

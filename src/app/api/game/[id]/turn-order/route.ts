import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { requesterId, order } = await request.json();

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: { orderBy: orderPlayersByTurn },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (session.status !== "WAITING") {
      return NextResponse.json({ error: "Cannot reorder during game" }, { status: 400 });
    }

    if (session.creatorId !== requesterId) {
      return NextResponse.json({ error: "Only host can reorder" }, { status: 403 });
    }

    const sessionIds = session.players.map((p) => p.id);
    const orderSet = new Set(order);
    if (order.length !== sessionIds.length) {
      return NextResponse.json({ error: "Order length mismatch" }, { status: 400 });
    }

    for (const id of sessionIds) {
      if (!orderSet.has(id)) {
        return NextResponse.json({ error: "Order contains invalid players" }, { status: 400 });
      }
    }

    const updates = order.map((playerId: string, idx: number) =>
      prisma.player.update({
        where: { id: playerId },
        data: { turnOrder: idx } as any,
      }),
    );

    await prisma.$transaction([
      ...updates,
      prisma.gameSession.update({
        where: { id },
        data: {
          lastAction: JSON.stringify({
            playerId: requesterId,
            type: "TURN_ORDER",
            description: "Orden de turnos actualizado",
            timestamp: Date.now(),
          }),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating turn order:", error);
    return NextResponse.json({ error: "Failed to update turn order" }, { status: 500 });
  }
}

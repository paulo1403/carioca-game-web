import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { requesterId } = await request.json();

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: orderPlayersByTurn,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Verify requester is host (index 0)
    if (session.players[0]?.id !== requesterId) {
      return NextResponse.json({ error: "Only host can end the game" }, { status: 403 });
    }

    await prisma.gameSession.update({
      where: { id },
      data: {
        status: "FINISHED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to end game" }, { status: 500 });
  }
}

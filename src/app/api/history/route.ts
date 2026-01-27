import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all game sessions where the user is the owner or a player
    const userGames = await prisma.gameSession.findMany({
      where: {
        OR: [{ ownerId: session.user.id }, { players: { some: { userId: session.user.id } } }],
        status: "FINISHED",
      },
      select: {
        id: true,
      },
    });

    const gameIds = userGames.map((g) => g.id);

    // Get history for those games
    const history = await prisma.gameHistory.findMany({
      where: {
        gameSessionId: { in: gameIds },
      },
      orderBy: { playedAt: "desc" },
      take: 50,
    });

    // Parse participants JSON
    const formattedHistory = history.map((h) => ({
      ...h,
      participants: JSON.parse(h.participants),
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error("[HISTORY_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

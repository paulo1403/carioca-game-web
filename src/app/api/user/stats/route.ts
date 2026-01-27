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

    // Get user with stats
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        gamesPlayed: true,
        gamesWon: true,
        totalScore: true,
        elo: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get additional stats from game sessions
    const gameSessions = await prisma.gameSession.findMany({
      where: {
        OR: [{ ownerId: session.user.id }, { players: { some: { userId: session.user.id } } }],
        status: "FINISHED",
      },
      include: {
        players: {
          where: { userId: session.user.id },
        },
      },
    });

    // Calculate win rate
    const totalGames = user.gamesPlayed;
    const winRate = totalGames > 0 ? Math.round((user.gamesWon / totalGames) * 100) : 0;

    // Calculate average score
    const avgScore = totalGames > 0 ? Math.round(user.totalScore / totalGames) : 0;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentGames = await prisma.gameHistory.findMany({
      where: {
        gameSessionId: { in: gameSessions.map((g) => g.id) },
        playedAt: { gte: sevenDaysAgo },
      },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt,
      },
      stats: {
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        winRate,
        totalScore: user.totalScore,
        avgScore,
        elo: user.elo,
        recentGamesCount: recentGames.length,
      },
    });
  } catch (error) {
    console.error("[USER_STATS_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}

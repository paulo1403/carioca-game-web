import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Get authenticated user
    const sessionUser = await auth();
    const userId = sessionUser?.user?.id;

    if (!userId) {
      // No authenticated user
      return NextResponse.json({ playerId: null }, { status: 200 });
    }

    // Find the player in this game session for this user
    const player = await prisma.player.findFirst({
      where: {
        gameSessionId: id,
        userId: userId,
      },
    });

    return NextResponse.json({ playerId: player?.id || null }, { status: 200 });
  } catch (error) {
    console.error("Error getting player id:", error);
    return NextResponse.json({ error: "Failed to get player id" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params;
  const { playerId, newName } = await request.json();

  if (!playerId || !newName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { name: newName },
    });

    // Also update history if the player has won and history exists (optional refinement)
    // For now, just updating the player in the session is enough.

    return NextResponse.json({ success: true, name: updatedPlayer.name });
  } catch (error) {
    console.error("Error updating player name:", error);
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 });
  }
}

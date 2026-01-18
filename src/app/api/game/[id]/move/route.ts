import { NextResponse } from "next/server";
import { processMove, checkAndProcessBotTurns } from "@/services/gameService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerId, action, payload } = await request.json();

  try {
    // 1. Process the Human Player's Move
    const result = await processMove(id, playerId, action, payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Move failed" },
        { status: result.status || 400 }
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

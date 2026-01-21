import { GameRoom } from "@/components/GameRoom";
import { auth } from "@/auth";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get the authenticated user's name if available
  const session = await auth();
  const playerName = session?.user?.name || "Jugador Invitado";

  return (
    <main>
      <GameRoom roomId={id} playerName={playerName} />
    </main>
  );
}

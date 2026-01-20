import { GameRoom } from "@/components/GameRoom";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // In a real app, we would fetch player session or ask for name here.
  // For now, we'll let the client side handle the random name generation or prompt.
  // Passing a default name, but GameRoom will likely need to handle a "Join" prompt if name is missing.

  return (
    <main>
      <GameRoom roomId={id} playerName={`Jugador Invitado`} />
    </main>
  );
}

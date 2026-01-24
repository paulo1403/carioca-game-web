import { prisma } from '@/lib/prisma';

/**
 * Updates user statistics after a game finishes
 * @param sessionId - The game session ID
 * @param winnerId - The ID of the winning player
 */
export async function updateUserStats(sessionId: string, winnerId: string) {
    try {
        // Get all players from this game session who have a userId
        const playerRecords = await prisma.player.findMany({
            where: {
                gameSessionId: sessionId,
                userId: { not: null }
            },
            select: {
                id: true,
                userId: true,
                score: true
            }
        });

        // Update stats for each player
        const statsUpdates = playerRecords.map(async (playerRecord) => {
            if (!playerRecord.userId) return;

            const isWinner = playerRecord.id === winnerId;

            await prisma.user.update({
                where: { id: playerRecord.userId },
                data: {
                    gamesPlayed: { increment: 1 },
                    gamesWon: isWinner ? { increment: 1 } : undefined,
                    totalScore: { increment: playerRecord.score }
                }
            });
        });

        await Promise.all(statsUpdates);
    } catch (error) {
        console.error('[STATS_UPDATE_ERROR]', error);
        // Don't throw - we don't want to fail the game completion if stats update fails
    }
}

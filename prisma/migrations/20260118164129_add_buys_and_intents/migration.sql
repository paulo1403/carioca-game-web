-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "direction" TEXT NOT NULL DEFAULT 'clockwise',
    "deck" TEXT NOT NULL,
    "discardPile" TEXT NOT NULL,
    "lastAction" TEXT,
    "pendingDiscardIntents" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSession" ("createdAt", "currentRound", "currentTurn", "deck", "direction", "discardPile", "id", "status", "updatedAt") SELECT "createdAt", "currentRound", "currentTurn", "deck", "direction", "discardPile", "id", "status", "updatedAt" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "melds" TEXT NOT NULL DEFAULT '[]',
    "boughtCards" TEXT NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" TEXT,
    "gameSessionId" TEXT NOT NULL,
    CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("difficulty", "gameSessionId", "hand", "id", "isBot", "melds", "name", "score") SELECT "difficulty", "gameSessionId", "hand", "id", "isBot", "melds", "name", "score" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

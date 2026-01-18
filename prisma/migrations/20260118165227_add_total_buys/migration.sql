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
    "totalBuys" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSession" ("createdAt", "currentRound", "currentTurn", "deck", "direction", "discardPile", "id", "lastAction", "pendingDiscardIntents", "status", "updatedAt") SELECT "createdAt", "currentRound", "currentTurn", "deck", "direction", "discardPile", "id", "lastAction", "pendingDiscardIntents", "status", "updatedAt" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

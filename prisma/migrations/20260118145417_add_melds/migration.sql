-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "melds" TEXT NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" TEXT,
    "gameSessionId" TEXT NOT NULL,
    CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("difficulty", "gameSessionId", "hand", "id", "isBot", "name", "score") SELECT "difficulty", "gameSessionId", "hand", "id", "isBot", "name", "score" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

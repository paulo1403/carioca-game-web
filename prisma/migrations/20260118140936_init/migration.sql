-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "direction" TEXT NOT NULL DEFAULT 'clockwise',
    "deck" TEXT NOT NULL,
    "discardPile" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "gameSessionId" TEXT NOT NULL,
    CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameSessionId" TEXT NOT NULL,
    "winnerId" TEXT,
    "participants" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameHistory_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameHistory_gameSessionId_key" ON "GameHistory"("gameSessionId");

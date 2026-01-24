ALTER TABLE "Player" ADD COLUMN "turnOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "gameSessionId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Player"
)
UPDATE "Player" p
SET "turnOrder" = ordered.rn
FROM ordered
WHERE p.id = ordered.id;

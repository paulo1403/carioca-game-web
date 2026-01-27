import fs from "fs";
import path from "path";
import type { GameState } from "@/types/game";

// Define the shape of our "Database"
interface DatabaseSchema {
  sessions: {
    [id: string]: {
      id: string;
      createdAt: number;
      updatedAt: number;
      gameState: GameState;
      status: "waiting" | "playing" | "finished";
    };
  };
  history: {
    id: string;
    sessionId: string;
    playedAt: number;
    winnerId?: string;
    participants: { id: string; name: string; score: number }[];
  }[];
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
  const initialData: DatabaseSchema = { sessions: {}, history: [] };
  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

export const getDB = (): DatabaseSchema => {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return { sessions: {}, history: [] };
  }
};

export const saveDB = (data: DatabaseSchema) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

export const db = {
  getSession: (id: string) => {
    const data = getDB();
    return data.sessions[id] || null;
  },
  createSession: (id: string, gameState: GameState) => {
    const data = getDB();
    data.sessions[id] = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameState,
      status: "playing",
    };
    saveDB(data);
    return data.sessions[id];
  },
  updateSession: (id: string, gameState: GameState) => {
    const data = getDB();
    if (data.sessions[id]) {
      data.sessions[id].gameState = gameState;
      data.sessions[id].updatedAt = Date.now();
      saveDB(data);
      return data.sessions[id];
    }
    return null;
  },
  endSession: (id: string, winnerId?: string) => {
    const data = getDB();
    const session = data.sessions[id];
    if (session) {
      // Archive to history
      data.history.push({
        id: `hist-${Date.now()}`,
        sessionId: id,
        playedAt: Date.now(),
        winnerId,
        participants: session.gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
        })),
      });

      // Delete from active sessions
      delete data.sessions[id];
      saveDB(data);
      return true;
    }
    return false;
  },
};

export type Suit = "HEART" | "DIAMOND" | "CLUB" | "SPADE" | "JOKER";
export type BotDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface Card {
  id: string;
  suit: Suit;
  value: number; // 0 for Joker, 1 for Ace, 11-13 for J, Q, K
  displayValue?: string; // 'A', 'J', 'Q', 'K', 'Joker'
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  melds?: Card[][]; // Groups of cards played on the table
  boughtCards: Card[]; // Bought cards not yet melded
  score: number;
  isBot?: boolean;
  difficulty?: BotDifficulty;
  buysUsed: number; // Number of buys used by this player (max 7)
  hasDrawn: boolean;
}

export interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentTurn: number; // Index of the player in players array
  currentRound: number; // 1 to 8
  direction: "clockwise" | "counter-clockwise";
  status: "WAITING" | "PLAYING" | "ROUND_ENDED" | "FINISHED";
  creatorId?: string; // ID of the player who created the game (host)
  readyForNextRound?: string[]; // Player IDs who are ready for next round
  reshuffleCount: number; // Number of times the deck has been reshuffled
  lastAction?: {
    playerId: string;
    type:
    | "DRAW_DECK"
    | "DRAW_DISCARD"
    | "DISCARD"
    | "DOWN"
    | "BUY"
    | "ADD_TO_MELD"
    | "STEAL_JOKER"
    | "READY_FOR_NEXT_ROUND"
    | "START_NEXT_ROUND";
    description: string;
    timestamp: number;
  };
}

export const ROUND_CONTRACTS = [
  {
    round: 1,
    name: "1 Grupo de 3+",
    description: "Al menos 1 grupo de 3+ cartas del mismo valor",
  },
  {
    round: 2,
    name: "2 Grupos de 3+",
    description: "Al menos 2 grupos de 3+ cartas del mismo valor",
  },
  {
    round: 3,
    name: "1 Grupo de 4+",
    description: "Al menos 1 grupo de 4+ cartas del mismo valor",
  },
  {
    round: 4,
    name: "2 Grupos de 4+",
    description: "Al menos 2 grupos de 4+ cartas del mismo valor",
  },
  {
    round: 5,
    name: "1 Grupo de 5+",
    description: "Al menos 1 grupo de 5+ cartas del mismo valor",
  },
  {
    round: 6,
    name: "2 Grupos de 5+",
    description: "Al menos 2 grupos de 5+ cartas del mismo valor",
  },
  {
    round: 7,
    name: "1 Grupo de 6+",
    description: "Al menos 1 grupo de 6+ cartas del mismo valor",
  },
  {
    round: 8,
    name: "Escalera de 7+",
    description: "Al menos 1 escalera de 7 cartas",
  },
];

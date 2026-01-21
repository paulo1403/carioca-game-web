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
  roundScores: number[]; // Points accumulated in each round
  roundBuys: number[]; // Number of buys in each round
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

export interface ContractRequirement {
  trios: number;
  trioSize: number;
  escalas: number;
  escalaSize: number;
}

export const ROUND_CONTRACTS_DATA: Record<number, ContractRequirement> = {
  1: { trios: 1, trioSize: 3, escalas: 0, escalaSize: 0 },
  2: { trios: 2, trioSize: 3, escalas: 0, escalaSize: 0 },
  3: { trios: 1, trioSize: 4, escalas: 0, escalaSize: 0 },
  4: { trios: 2, trioSize: 4, escalas: 0, escalaSize: 0 },
  5: { trios: 1, trioSize: 5, escalas: 0, escalaSize: 0 },
  6: { trios: 2, trioSize: 5, escalas: 0, escalaSize: 0 },
  7: { trios: 1, trioSize: 6, escalas: 0, escalaSize: 0 },
  8: { trios: 0, trioSize: 0, escalas: 1, escalaSize: 7 },
};

export const ROUND_CONTRACTS = [
  {
    round: 1,
    name: "1/3",
    description: "1 grupo de 3+ cartas del mismo valor",
  },
  {
    round: 2,
    name: "2/3",
    description: "2 grupos de 3+ cartas del mismo valor",
  },
  {
    round: 3,
    name: "1/4",
    description: "1 grupo de 4+ cartas del mismo valor",
  },
  {
    round: 4,
    name: "2/4",
    description: "2 grupos de 4+ cartas del mismo valor",
  },
  {
    round: 5,
    name: "1/5",
    description: "1 grupo de 5+ cartas del mismo valor",
  },
  {
    round: 6,
    name: "2/5",
    description: "2 grupos de 5+ cartas del mismo valor",
  },
  {
    round: 7,
    name: "1/6",
    description: "1 grupo de 6+ cartas del mismo valor",
  },
  {
    round: 8,
    name: "Escalera de 7",
    description: "1 escalera de 7 cartas del mismo palo",
  },
];

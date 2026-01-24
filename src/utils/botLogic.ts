import {
  Card,
  GameState,
  Player,
  BotDifficulty,
  ROUND_CONTRACTS_DATA,
} from "@/types/game";
import {
  validateContract,
  validateAdditionalDown,
  canAddToMeld,
  canStealJoker,
  getCardPoints,
  calculateHandPoints,
  isTrio,
  isEscala,
  isDifferentSuitGroup,
} from "@/utils/rules";
import { MAX_BUYS } from "@/utils/buys";

/**
 * Represents a move the bot wants to make
 */
interface BotMove {
  action:
  | "DRAW_DECK"
  | "DRAW_DISCARD"
  | "DOWN"
  | "ADD_TO_MELD"
  | "STEAL_JOKER"
  | "DISCARD";
  payload?: Record<string, unknown>;
}

/**
 * Represents a group of cards found by analysis
 */
interface CardGroup {
  cards: Card[];
  type: "TRIO" | "ESCALA" | "DIFFERENT_SUIT";
}

const isJoker = (c: Card) => c.suit === "JOKER" || c.value === 0;

/**
 * Calculate the next move for a bot player
 */
export const calculateBotMove = (
  gameState: GameState,
  botId: string,
  difficulty: BotDifficulty = "MEDIUM",
): BotMove | null => {
  const botIndex = gameState.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const bot = gameState.players[botIndex];
  if (gameState.currentTurn !== botIndex) return null;

  const hasDrawn = bot.hasDrawn;

  if (!hasDrawn) {
    return decideDraw(gameState, bot, difficulty);
  } else {
    // Priority 1: Down initial contract
    if (!hasPlayerMelded(bot)) {
      const downMove = findDownMove(gameState, bot, difficulty);
      if (downMove) return downMove;
    }

    // Priority 2: Steal joker
    if (difficulty !== "EASY") {
      const stealMove = findStealJokerMove(gameState, bot, difficulty);
      if (stealMove) return stealMove;
    }

    // Priority 3: Add to existing melds or additional downs
    if (hasPlayerMelded(bot)) {
      const addMove = findAddToMeldMove(gameState, bot);
      if (addMove) return addMove;

      const additionalDown = findAdditionalDownMove(gameState, bot, difficulty);
      if (additionalDown) return additionalDown;
    }

    return decideDiscard(gameState, bot, difficulty);
  }
};

const hasPlayerMelded = (player: Player): boolean => {
  return player.melds !== undefined && player.melds.length > 0;
};

const decideDraw = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty,
): BotMove => {
  const discardPile = gameState.discardPile;
  const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  if (!topDiscard || bot.buysUsed >= MAX_BUYS) {
    return { action: "DRAW_DECK" };
  }

  const isUseful = evaluateCardUsefulness(topDiscard, bot.hand, gameState.currentRound);

  if (difficulty === "EASY") {
    return { action: isUseful && Math.random() < 0.1 ? "DRAW_DISCARD" : "DRAW_DECK" };
  }

  if (difficulty === "MEDIUM") {
    return { action: isUseful && Math.random() < 0.5 ? "DRAW_DISCARD" : "DRAW_DECK" };
  }

  // HARD: Aggressive but not suicidal. If we already have 20+ cards, stop buying unless it's a Joker.
  const isJokerCard = isJoker(topDiscard);
  if (isJokerCard) return { action: "DRAW_DISCARD" };

  if (bot.hand.length > 18 && !isUseful) return { action: "DRAW_DECK" };

  return { action: isUseful || Math.random() < 0.3 ? "DRAW_DISCARD" : "DRAW_DECK" };
};

const decideDiscard = (
  gameState: GameState,
  bot: Player,
  _difficulty: BotDifficulty,
): BotMove => {
  const hand = bot.hand;
  if (hand.length === 0) return { action: "DISCARD", payload: { cardId: "" } };

  // Prioritize discarding cards that are NOT part of any group
  const { trios, escalas } = findAllPotentialGroups(hand, gameState.currentRound);
  const usefulIds = new Set<string>();
  [...trios, ...escalas].forEach(g => g.cards.forEach(c => usefulIds.add(c.id)));

  // Cards that can be added to table are also useful
  gameState.players.forEach(p => {
    p.melds?.forEach(meld => {
      hand.forEach(card => {
        if (canAddToMeld(card, meld)) usefulIds.add(card.id);
      });
    });
  });

  const candidates = hand.filter(c => !usefulIds.has(c.id) && !isJoker(c));
  if (candidates.length > 0) {
    // Discard highest points among non-useful
    candidates.sort((a, b) => getCardPoints(b) - getCardPoints(a));
    return { action: "DISCARD", payload: { cardId: candidates[0].id } };
  }

  // Fallback: Discard highest points non-joker
  const nonJokers = hand.filter(c => !isJoker(c));
  if (nonJokers.length > 0) {
    nonJokers.sort((a, b) => getCardPoints(b) - getCardPoints(a));
    return { action: "DISCARD", payload: { cardId: nonJokers[0].id } };
  }

  return { action: "DISCARD", payload: { cardId: hand[0].id } };
};

const findDownMove = (
  gameState: GameState,
  bot: Player,
  _difficulty: BotDifficulty,
): BotMove | null => {
  const round = gameState.currentRound;
  const reqs = ROUND_CONTRACTS_DATA[round];
  if (!reqs) return null;

  const { trios, escalas } = findAllPotentialGroups(bot.hand, round);

  if (trios.length >= reqs.differentSuitGroups && escalas.length >= reqs.escalas) {
    const groups = [
      ...trios.slice(0, reqs.differentSuitGroups).map(g => g.cards),
      ...escalas.slice(0, reqs.escalas).map(g => g.cards)
    ];
    const validation = validateContract(groups, round);
    if (validation.valid) {
      return { action: "DOWN", payload: { groups } };
    }
  }

  return null;
};

const findAddToMeldMove = (gameState: GameState, bot: Player): BotMove | null => {
  for (const player of gameState.players) {
    if (!player.melds) continue;
    for (let i = 0; i < player.melds.length; i++) {
      for (const card of bot.hand) {
        if (canAddToMeld(card, player.melds[i])) {
          return {
            action: "ADD_TO_MELD",
            payload: { cardId: card.id, targetPlayerId: player.id, meldIndex: i }
          };
        }
      }
    }
  }
  return null;
};

const findAdditionalDownMove = (gameState: GameState, bot: Player, _difficulty: BotDifficulty): BotMove | null => {
  // Try to put down any remaining trios or escalas of size 3+
  const hand = bot.hand;
  const { trios, escalas } = findAllPotentialGroups(hand, -1); // -1 means any round/generic

  // We only put them down if they are 3+ and we have cards left for discard
  const all = [...trios, ...escalas];
  for (const g of all) {
    if (g.cards.length >= 3 && hand.length - g.cards.length >= 1) {
      const validation = validateAdditionalDown([g.cards]);
      if (validation.valid) {
        return { action: "DOWN", payload: { groups: [g.cards] } };
      }
    }
  }
  return null;
};

const findStealJokerMove = (gameState: GameState, bot: Player, _difficulty: BotDifficulty): BotMove | null => {
  for (const player of gameState.players) {
    if (!player.melds) continue;
    for (let i = 0; i < player.melds.length; i++) {
      const meld = player.melds[i];
      if (!meld.some(isJoker)) continue;
      for (const card of bot.hand) {
        if (canStealJoker(card, meld, bot.hand)) {
          return {
            action: "STEAL_JOKER",
            payload: { cardId: card.id, targetPlayerId: player.id, meldIndex: i }
          };
        }
      }
    }
  }
  return null;
}

// ============ UTILS ============

const findAllPotentialGroups = (hand: Card[], round: number): { trios: CardGroup[], escalas: CardGroup[] } => {
  const nonJokers = hand.filter(c => !isJoker(c));
  const jokers = hand.filter(isJoker);
  // Default values for generic search (-1)
  const reqs = round !== -1 ? ROUND_CONTRACTS_DATA[round] : { differentSuitGroups: 1, differentSuitSize: 3, escalas: 1, escalaSize: 3 };

  const foundTrios: CardGroup[] = [];
  const foundEscalas: CardGroup[] = [];

  // Trios: same value (suits may repeat), jokers allowed
  if (reqs.differentSuitSize >= 3) {
    const byValue = new Map<number, Card[]>();
    nonJokers.forEach(c => {
      const list = byValue.get(c.value) ?? [];
      list.push(c);
      byValue.set(c.value, list);
    });

    for (const [val, cards] of byValue) {
      const naturalCards = cards as Card[]; // same value
      const naturalCount = naturalCards.length;

      // isTrio compatibility: allow if at least 2 natural cards (unless all jokers)
      const minNaturalRequired = 2;

      if (naturalCount === 0) {
        // all jokers group (rare) - allow if jokers can satisfy size
        if (jokers.length >= reqs.differentSuitSize) {
          foundTrios.push({ cards: jokers.slice(0, reqs.differentSuitSize), type: "TRIO" });
        }
        continue;
      }

      if (naturalCount >= reqs.differentSuitSize) {
        foundTrios.push({ cards: naturalCards.slice(0, reqs.differentSuitSize), type: "TRIO" });
      } else if (naturalCount + jokers.length >= reqs.differentSuitSize && naturalCount >= minNaturalRequired) {
        const neededJokers = reqs.differentSuitSize - naturalCount;
        foundTrios.push({ cards: [...naturalCards, ...jokers.slice(0, neededJokers)], type: "TRIO" });
      }
    }
  }

  // Escalas
  if (reqs.escalaSize >= 3) {
    const bySuit = new Map<string, Card[]>();
    nonJokers.forEach(c => {
      const list = bySuit.get(c.suit) ?? [];
      list.push(c);
      bySuit.set(c.suit, list);
    });

    for (const [suit, cards] of bySuit) {
      for (let start = 1; start <= 13; start++) {
        const len = reqs.escalaSize;
        const window = Array.from({ length: len }, (_, i) => ((start + i - 1) % 13) + 1);
        const cardsInHand = cards.filter(c => window.includes(c.value));

        const naturalCount = cardsInHand.length;
        // Rule: Natural cards must be >= Jokers
        const minNaturalNeeded = Math.ceil(len / 2);

        if (naturalCount >= minNaturalNeeded && naturalCount + jokers.length >= len) {
          const resultGroup = [...cardsInHand];
          const needed = len - resultGroup.length;
          foundEscalas.push({ cards: [...resultGroup, ...jokers.slice(0, needed)], type: "ESCALA" });
        }
      }
    }
  }

  return { trios: foundTrios, escalas: foundEscalas };
};

const evaluateCardUsefulness = (card: Card, hand: Card[], round: number): boolean => {
  if (isJoker(card)) return true;

  // Fast check for Trios (matching values)
  if (hand.some(c => c.value === card.value && !isJoker(c))) return true;

  // Fast check for Escalas (neighboring cards)
  const reqs = round !== -1 ? ROUND_CONTRACTS_DATA[round] : { differentSuitGroups: 1, differentSuitSize: 3, escalas: 1, escalaSize: 3 };
  if (reqs && reqs.escalaSize > 0) {
    const neighbors = hand.filter(c =>
      c.suit === card.suit &&
      !isJoker(c) &&
      (Math.abs(c.value - card.value) <= 2 || (card.value === 1 && c.value >= 12) || (card.value >= 12 && c.value === 1))
    );
    if (neighbors.length > 0) return true;
  }

  return false;
};

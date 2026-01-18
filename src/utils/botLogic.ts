import {
  Card,
  GameState,
  Player,
  ROUND_CONTRACTS,
  BotDifficulty,
} from "@/types/game";
import {
  validateContract,
  validateAdditionalDown,
  canAddToMeld,
  canStealJoker,
  isTrio,
  isEscala,
  getCardPoints,
  calculateHandPoints,
} from "@/utils/rules";

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
  payload?: Record<string, any>;
}

/**
 * Represents a group of cards found by analysis
 */
interface CardGroup {
  cards: Card[];
  type: "TRIO" | "ESCALA";
}

/**
 * Calculate the next move for a bot player
 * @param gameState Current game state
 * @param botId The ID of the bot player
 * @param difficulty Bot difficulty level (EASY, MEDIUM, HARD)
 * @returns The next move to make, or null if no move can be decided
 */
export const calculateBotMove = (
  gameState: GameState,
  botId: string,
  difficulty: BotDifficulty = "MEDIUM"
): BotMove | null => {
  // Validate bot exists and it's their turn
  const botIndex = gameState.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) {
    console.warn(`[Bot] Bot ${botId} not found in game state`);
    return null;
  }

  const bot = gameState.players[botIndex];

  if (gameState.currentTurn !== botIndex) {
    console.warn(
      `[Bot] Not ${bot.name}'s turn. Current turn: ${gameState.currentTurn}`
    );
    return null;
  }

  // Determine if bot has drawn this turn
  const hasDrawn = checkIfBotHasDrawn(gameState, botId);

  if (!hasDrawn) {
    // PHASE 1: DRAW
    return decideDraw(gameState, bot, difficulty);
  } else {
    // PHASE 2: ACTION & DISCARD
    // Try to perform beneficial actions before discarding

    // Priority 1: HARD bots should check if they're VERY close to losing - emergency down
    if (difficulty === "HARD" && !hasPlayerMelded(bot)) {
      const competitiveAnalysis = analyzeCompetitivePosition(gameState, bot.id);
      if (competitiveAnalysis.hasLeader && competitiveAnalysis.leaderAnalysis) {
        const handPoints = calculateHandPoints(bot.hand);
        const leaderHandPoints = calculateHandPoints(
          competitiveAnalysis.leaderAnalysis.hand
        );

        // If we have way too many points in hand, try emergency down
        if (handPoints > 100 && !hasPlayerMelded(bot)) {
          const downMove = findDownMove(gameState, bot, "HARD");
          if (downMove) {
            console.log(
              `[Bot] ${bot.name} EMERGENCY DOWN - too many points in hand!`
            );
            return downMove;
          }
        }
      }
    }

    // Priority 2: Steal joker (if difficulty warrants it)
    if (difficulty !== "EASY") {
      const stealMove = findStealJokerMove(gameState, bot, difficulty);
      if (stealMove) {
        console.log(`[Bot] ${bot.name} stealing joker`);
        return stealMove;
      }
    }

    // Priority 3: Down initial contract (if haven't melded yet)
    if (!hasPlayerMelded(bot)) {
      const downMove = findDownMove(gameState, bot, difficulty);
      if (downMove) {
        console.log(`[Bot] ${bot.name} going down with initial contract`);
        return downMove;
      }
    }
    // Priority 3: Add to existing melds or put down additional groups
    else {
      // Try adding to existing melds first
      const addMove = findAddToMeldMove(gameState, bot);
      if (addMove) {
        console.log(`[Bot] ${bot.name} adding to meld`);
        return addMove;
      }

      // Try additional down (new groups)
      const additionalDown = findAdditionalDownMove(gameState, bot, difficulty);
      if (additionalDown) {
        console.log(`[Bot] ${bot.name} putting down additional groups`);
        return additionalDown;
      }
    }

    // Priority 4: Discard
    console.log(`[Bot] ${bot.name} discarding`);
    return decideDiscard(gameState, bot, difficulty);
  }
};

/**
 * Check if the bot has drawn a card this turn
 */
const checkIfBotHasDrawn = (gameState: GameState, botId: string): boolean => {
  const lastAction = gameState.lastAction;
  if (!lastAction) return false;

  return (
    lastAction.playerId === botId &&
    (lastAction.type === "DRAW_DECK" ||
      lastAction.type === "DRAW_DISCARD" ||
      lastAction.type === "BUY")
  );
};

/**
 * Check if a player has already melded (gone down)
 */
const hasPlayerMelded = (player: Player): boolean => {
  return player.melds !== undefined && player.melds.length > 0;
};

/**
 * Decide whether to draw from deck or buy from discard pile
 */
const decideDraw = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty
): BotMove => {
  const discardPile = gameState.discardPile;
  const topDiscard =
    discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  // If no discard pile or already used max buys, draw deck
  if (!topDiscard || bot.buysUsed >= 7) {
    return { action: "DRAW_DECK" };
  }

  // Analyze competitive situation
  const competitiveAnalysis = analyzeCompetitivePosition(gameState, bot.id);

  // EASY difficulty: Play dumb - mostly draw deck unless card is very useful
  if (difficulty === "EASY") {
    // Only buy 5% of the time with good cards
    const isExcellent =
      topDiscard.suit === "JOKER" ||
      topDiscard.value === 0 ||
      countMatchingValues(bot.hand, topDiscard.value) >= 2;

    const shouldBuy = isExcellent && Math.random() < 0.05;
    return {
      action: shouldBuy ? "DRAW_DISCARD" : "DRAW_DECK",
    };
  }

  // MEDIUM difficulty: Balanced approach - smart buying
  if (difficulty === "MEDIUM") {
    const isUseful = evaluateCardUsefulness(
      topDiscard,
      bot.hand,
      gameState.currentRound
    );

    if (isUseful) {
      const handQuality = evaluateHandQuality(bot.hand, gameState.currentRound);
      const shouldBuy = handQuality < 0.5 || Math.random() < 0.4;

      // Also consider blocking leader
      if (
        !shouldBuy &&
        competitiveAnalysis.hasLeader &&
        countMatchingValues(
          competitiveAnalysis.leaderAnalysis?.hand || [],
          topDiscard.value
        ) > 0
      ) {
        return { action: "DRAW_DISCARD" };
      }

      return {
        action: shouldBuy ? "DRAW_DISCARD" : "DRAW_DECK",
      };
    }

    return { action: "DRAW_DECK" };
  }

  // HARD difficulty: VERY aggressive buying + strategic blocking
  const isJoker = topDiscard.suit === "JOKER" || topDiscard.value === 0;
  const isUseful = evaluateCardUsefulness(
    topDiscard,
    bot.hand,
    gameState.currentRound
  );

  // JOKERS: ALWAYS BUY if possible (invaluable for any strategy)
  if (isJoker) {
    console.log(`[Bot] HARD difficulty: Buying joker from discard`);
    return { action: "DRAW_DISCARD" };
  }

  // Other useful cards: Buy aggressively (80% chance)
  if (isUseful) {
    const handQuality = evaluateHandQuality(bot.hand, gameState.currentRound);
    const shouldBuy = handQuality < 0.7 || Math.random() < 0.8;
    if (shouldBuy) {
      console.log(`[Bot] HARD difficulty: Buying useful card from discard`);
      return { action: "DRAW_DISCARD" };
    }
  }

  // Strategic blocking: Block leader or strong opponents
  if (competitiveAnalysis.hasLeader && competitiveAnalysis.leaderAnalysis) {
    const leaderHasMatching =
      countMatchingValues(
        competitiveAnalysis.leaderAnalysis.hand,
        topDiscard.value
      ) > 0;

    if (leaderHasMatching) {
      // EXTREMELY aggressive blocking of leader (90% chance for HARD)
      if (Math.random() < 0.9) {
        console.log(
          `[Bot] HARD difficulty: BLOCKING LEADER with card ${topDiscard.value}`
        );
        return { action: "DRAW_DISCARD" };
      }
    }

    // Also block other close competitors
    const closeCompetitors = gameState.players.filter((p) => {
      if (p.id === bot.id) return false;
      const opponentScore = (p.score || 0) + calculateHandPoints(p.hand);
      const botScore = (bot.score || 0) + calculateHandPoints(bot.hand);
      return opponentScore <= botScore + 50; // Within 50 points
    }).length;

    if (closeCompetitors > 0 && Math.random() < 0.7) {
      console.log(`[Bot] HARD difficulty: Blocking close competitor`);
      return { action: "DRAW_DISCARD" };
    }
  }

  // Defensive buying: Don't leave good cards for others
  const opponentCards = countMatchingValues(bot.hand, topDiscard.value);
  if (opponentCards === 0 && Math.random() < 0.6) {
    console.log(`[Bot] HARD difficulty: Defensive buy to deny opponent`);
    return { action: "DRAW_DISCARD" };
  }

  return { action: "DRAW_DECK" };
};

/**
 * Decide which card to discard
 */
const decideDiscard = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty
): BotMove => {
  const hand = [...bot.hand];

  if (hand.length === 0) {
    console.error(`[Bot] ${bot.name} has no cards to discard!`);
    return { action: "DISCARD", payload: { cardId: "" } };
  }

  // EASY: Discard randomly (dumb strategy)
  if (difficulty === "EASY") {
    const randomCard = hand[Math.floor(Math.random() * hand.length)];
    return { action: "DISCARD", payload: { cardId: randomCard.id } };
  }

  // MEDIUM & HARD: Smart discard strategy
  // NEVER DISCARD JOKERS - they are invaluable
  // Prioritize keeping: cards part of potential groups, then strategic low-value cards

  // Find cards that are part of potential groups
  const cardsInGroups = new Set<string>();

  // Check for trios (3+ matching values)
  const byValue: Record<number, Card[]> = {};
  hand.forEach((c) => {
    if (c.suit !== "JOKER" && c.value !== 0) {
      if (!byValue[c.value]) byValue[c.value] = [];
      byValue[c.value].push(c);
    }
  });

  for (const value in byValue) {
    if (byValue[value].length >= 2) {
      // At least pair potential
      byValue[value].forEach((c) => cardsInGroups.add(c.id));
    }
  }

  // Check for escalas
  const bySuit: Record<string, Card[]> = {};
  hand.forEach((c) => {
    if (c.suit !== "JOKER" && c.value !== 0) {
      if (!bySuit[c.suit]) bySuit[c.suit] = [];
      bySuit[c.suit].push(c);
    }
  });

  for (const suit in bySuit) {
    const suitCards = bySuit[suit].sort((a, b) => a.value - b.value);
    for (let i = 0; i < suitCards.length; i++) {
      for (let len = 2; len <= 3; len++) {
        const potential = suitCards.slice(i, i + len);
        if (potential.length >= 2) {
          const values = potential.map((c) => c.value);
          let canForm = true;
          for (let j = 0; j < values.length - 1; j++) {
            if (values[j + 1] - values[j] > 2) {
              canForm = false;
              break;
            }
          }
          if (canForm) {
            potential.forEach((c) => cardsInGroups.add(c.id));
          }
        }
      }
    }
  }

  // Candidates for discard: cards NOT in groups, NOT jokers
  const discardCandidates = hand.filter(
    (c) => !cardsInGroups.has(c.id) && c.suit !== "JOKER" && c.value !== 0
  );

  if (discardCandidates.length > 0) {
    // For HARD: Be VERY strategic about discards
    if (difficulty === "HARD") {
      const competitiveAnalysis = analyzeCompetitivePosition(gameState, bot.id);

      // STRATEGY 1: Discard cards that block opponents the LEAST
      // Calculate "popularity" of each candidate (how many opponents want it)
      const cardPopularity: Record<string, number> = {};

      for (const card of discardCandidates) {
        let popularity = 0;

        // Check how many opponents have matching values
        for (const opponent of gameState.players) {
          if (opponent.id === bot.id || !opponent.hand) continue;

          const matchingCount = countMatchingValues(opponent.hand, card.value);
          popularity += matchingCount;
        }

        cardPopularity[card.id] = popularity;
      }

      // Sort candidates by popularity (ascending) - discard least wanted cards
      discardCandidates.sort(
        (a, b) => (cardPopularity[a.id] || 0) - (cardPopularity[b.id] || 0)
      );

      // Among least popular cards, prefer low-value cards
      const leastPopularCards = discardCandidates.filter(
        (c) => cardPopularity[c.id] === cardPopularity[discardCandidates[0].id]
      );

      leastPopularCards.sort((a, b) => getCardPoints(a) - getCardPoints(b));

      return {
        action: "DISCARD",
        payload: { cardId: leastPopularCards[0].id },
      };
    }

    // MEDIUM: Discard highest point card from candidates, prefer unpopular cards
    discardCandidates.sort((a, b) => getCardPoints(b) - getCardPoints(a));
    return { action: "DISCARD", payload: { cardId: discardCandidates[0].id } };
  }

  // Fallback: discard lowest value non-joker (last resort before jokers)
  const nonJokers = hand.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  if (nonJokers.length > 0) {
    nonJokers.sort((a, b) => getCardPoints(a) - getCardPoints(b));
    return { action: "DISCARD", payload: { cardId: nonJokers[0].id } };
  }

  // EMERGENCY ONLY: If forced to discard a joker (hand full and can't do anything else)
  // This should almost never happen in normal gameplay
  console.warn(
    `[Bot] ${bot.name} forced to discard a joker - emergency situation!`
  );
  return { action: "DISCARD", payload: { cardId: hand[0].id } };
};

/**
 * Find if a down move is possible for the initial contract
 */
const findDownMove = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty
): BotMove | null => {
  const round = gameState.currentRound;
  const hand = bot.hand;

  // Get requirements for this round
  const requirements = getRoundRequirements(round);
  if (!requirements) return null;

  // Find possible groups that match requirements
  const possibleGroups = findGroupCombinations(hand, round, difficulty);

  if (possibleGroups.length === 0) return null;

  // EASY difficulty: Be conservative - only down if perfect match
  if (difficulty === "EASY") {
    // Only down if we have exactly matching groups (not trying harder)
    const strictGroups = possibleGroups.filter((g) => {
      // Must be exact trio (3) or exact escala (4+)
      if (g.type === "TRIO") return g.cards.length === 3;
      return g.cards.length >= 4;
    });

    if (strictGroups.length === 0) return null;

    const groupCards = strictGroups.map((g) => g.cards);
    const validation = validateContract(groupCards, round);

    if (!validation.valid) {
      return null;
    }

    return {
      action: "DOWN",
      payload: { groups: groupCards },
    };
  }

  // MEDIUM/HARD: Validate against contract
  const groupCards = possibleGroups.map((g) => g.cards);
  const validation = validateContract(groupCards, round);

  if (!validation.valid) {
    return null;
  }

  // For HARD: be aggressive - if close, try it
  if (difficulty === "HARD") {
    // Check competitive position - if leader is about to win, go down ASAP
    const competitiveAnalysis = analyzeCompetitivePosition(gameState, bot.id);

    if (competitiveAnalysis.hasLeader && competitiveAnalysis.leaderAnalysis) {
      if (competitiveAnalysis.hasLeader) {
        console.log(
          `[Bot] HARD difficulty: Going down aggressively to pressure leader`
        );
        return {
          action: "DOWN",
          payload: { groups: groupCards },
        };
      }
    }

    // Try to down as soon as possible (don't wait for perfect hand)
    if (!hasPlayerMelded(bot) && groupCards.length > 0) {
      console.log(`[Bot] HARD difficulty going down aggressively`);
      return {
        action: "DOWN",
        payload: { groups: groupCards },
      };
    }
  }

  return {
    action: "DOWN",
    payload: { groups: groupCards },
  };
};

/**
 * Find if we can add a card to an existing meld
 */
const findAddToMeldMove = (
  gameState: GameState,
  bot: Player
): BotMove | null => {
  // Look through all melds on the table
  // Priority: Own melds > opponent melds that would help us finish > random additions

  const ownMelds: Array<{
    meldIndex: number;
    cards: Card[];
    player: Player;
  }> = [];
  const otherMelds: Array<{
    meldIndex: number;
    cards: Card[];
    player: Player;
  }> = [];

  // Collect all possible melds
  for (const player of gameState.players) {
    if (!player.melds || player.melds.length === 0) continue;

    for (let meldIndex = 0; meldIndex < player.melds.length; meldIndex++) {
      const meld = player.melds[meldIndex];
      if (player.id === bot.id) {
        ownMelds.push({ meldIndex, cards: meld, player });
      } else {
        otherMelds.push({ meldIndex, cards: meld, player });
      }
    }
  }

  // Try to find a matching card for OWN melds first (accumulate points)
  for (const { meldIndex, cards, player } of ownMelds) {
    for (const card of bot.hand) {
      if (canAddToMeld(card, cards)) {
        return {
          action: "ADD_TO_MELD",
          payload: {
            cardId: card.id,
            targetPlayerId: player.id,
            meldIndex: meldIndex,
          },
        };
      }
    }
  }

  // Then try OTHER melds (but be strategic - only if we need space in hand)
  const handSpace = 12 - bot.hand.length; // Assuming max hand size is 12
  if (handSpace <= 2) {
    // Need to free up space
    for (const { meldIndex, cards, player } of otherMelds) {
      for (const card of bot.hand) {
        if (canAddToMeld(card, cards)) {
          return {
            action: "ADD_TO_MELD",
            payload: {
              cardId: card.id,
              targetPlayerId: player.id,
              meldIndex: meldIndex,
            },
          };
        }
      }
    }
  }

  return null;
};

/**
 * Find additional groups the bot can put down (after initial down)
 */
const findAdditionalDownMove = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty
): BotMove | null => {
  const hand = bot.hand;

  // Find trios or escalas in hand
  const possibleGroups = findGroupCombinations(hand, -1, difficulty); // -1 means any valid group

  if (possibleGroups.length > 0) {
    const groupCards = [possibleGroups[0].cards];

    // Validate with additional down rules
    const validation = validateAdditionalDown(groupCards);
    if (validation.valid) {
      return {
        action: "DOWN",
        payload: { groups: groupCards },
      };
    }
  }

  return null;
};

/**
 * Find a move to steal a joker
 */
const findStealJokerMove = (
  gameState: GameState,
  bot: Player,
  difficulty: BotDifficulty
): BotMove | null => {
  // Look through all melds on the table
  // For HARD: Prioritize stealing from the leader or strong opponents
  const players = gameState.players;

  let targetPlayers = players;
  if (difficulty === "HARD") {
    const competitiveAnalysis = analyzeCompetitivePosition(gameState, bot.id);
    if (competitiveAnalysis.leaderAnalysis) {
      // Prioritize stealing from leader or high-score players
      targetPlayers = players.sort((a, b) => {
        const scoreA = (a.score || 0) + calculateHandPoints(a.hand);
        const scoreB = (b.score || 0) + calculateHandPoints(b.hand);
        return scoreB - scoreA; // Leader/high score first
      });
    }
  }

  for (const player of targetPlayers) {
    if (!player.melds || player.melds.length === 0) continue;

    for (let meldIndex = 0; meldIndex < player.melds.length; meldIndex++) {
      const meld = player.melds[meldIndex];

      // Check if meld has a joker
      if (!meld.some((c) => c.suit === "JOKER" || c.value === 0)) continue;

      // Try to find BEST card in hand that can steal it
      const stealableCandidates = bot.hand.filter((card) =>
        canStealJoker(card, meld, bot.hand)
      );

      if (stealableCandidates.length === 0) continue;

      // HARD: Always steal jokers - they're too valuable
      if (difficulty === "HARD") {
        // Pick the LOWEST point card to minimize loss (best trade)
        const bestCard = stealableCandidates.reduce((best, current) =>
          getCardPoints(current) < getCardPoints(best) ? current : best
        );

        return {
          action: "STEAL_JOKER",
          payload: {
            cardId: bestCard.id,
            targetPlayerId: player.id,
            meldIndex: meldIndex,
          },
        };
      }

      // MEDIUM: Only steal if beneficial
      for (const card of stealableCandidates) {
        const cardPoints = getCardPoints(card);
        const meldValue = meld.reduce((sum, c) => sum + getCardPoints(c), 0);

        if (meldValue > cardPoints * 2) {
          // Good trade
          return {
            action: "STEAL_JOKER",
            payload: {
              cardId: card.id,
              targetPlayerId: player.id,
              meldIndex: meldIndex,
            },
          };
        }
      }
    }
  }

  return null;
};

// ============ HELPER FUNCTIONS ============

/**
 * Get round requirements (trio count, escala count, sizes)
 */
const getRoundRequirements = (
  round: number
): {
  trios: number;
  escalas: number;
  trioSize: number;
  escalaSize: number;
} | null => {
  const requirements: Record<
    number,
    { trios: number; escalas: number; trioSize: number; escalaSize: number }
  > = {
    1: { trios: 1, escalas: 0, trioSize: 3, escalaSize: 0 },
    2: { trios: 2, escalas: 0, trioSize: 3, escalaSize: 0 },
    3: { trios: 0, escalas: 1, trioSize: 0, escalaSize: 4 },
    4: { trios: 0, escalas: 2, trioSize: 0, escalaSize: 4 },
    5: { trios: 1, escalas: 0, trioSize: 5, escalaSize: 0 },
    6: { trios: 2, escalas: 0, trioSize: 5, escalaSize: 0 },
    7: { trios: 0, escalas: 1, trioSize: 0, escalaSize: 6 },
    8: { trios: 0, escalas: 1, trioSize: 0, escalaSize: 7 },
  };
  return requirements[round] || null;
};

/**
 * Evaluate if a single card is useful for the current round
 */
const evaluateCardUsefulness = (
  card: Card,
  hand: Card[],
  round: number
): boolean => {
  // Jokers are always useful
  if (card.suit === "JOKER" || card.value === 0) return true;

  // Check for matching values (trio potential)
  const matchingCount = hand.filter(
    (c) => c.value === card.value && c.suit !== "JOKER" && c.value !== 0
  ).length;

  if (matchingCount >= 1) return true;

  // Check for sequence potential (escala)
  if (canFormSequence(hand, card)) return true;

  return false;
};

/**
 * Evaluate overall quality of hand (0-1, higher is better)
 */
const evaluateHandQuality = (hand: Card[], round: number): number => {
  const trios = findTrios(hand);
  const escalas = findEscalas(hand);
  const jokers = hand.filter((c) => c.suit === "JOKER" || c.value === 0).length;
  const totalCards = hand.length;
  const pointsInHand = calculateHandPoints(hand);

  // Score individual components - weighted heavily toward groups
  const trioScore = trios.length * 0.4;
  const escalaScore = escalas.length * 0.5;
  const jokerScore = jokers * 0.2;

  // Penalty for too many points in hand (liability)
  const pointsPenalty = Math.min(pointsInHand / 150, 0.5);

  // Bonus for full hand
  const sizeBonus = Math.min(totalCards / 12, 1) * 0.15;

  const total =
    trioScore + escalaScore + jokerScore + sizeBonus - pointsPenalty;

  // Normalize to 0-1
  const normalized = Math.max(0, Math.min(total, 1));

  return normalized;
};

/**
 * Check if a card can form a sequence with others in hand
 */
const canFormSequence = (hand: Card[], targetCard: Card): boolean => {
  // Group by suit
  const bySuit: Record<string, Card[]> = {};
  hand.forEach((c) => {
    if (c.suit !== "JOKER" && c.value !== 0) {
      if (!bySuit[c.suit]) bySuit[c.suit] = [];
      bySuit[c.suit].push(c);
    }
  });

  // Check if target card's suit has neighbors
  if (targetCard.suit !== "JOKER" && targetCard.value !== 0) {
    const sameSuit = bySuit[targetCard.suit] || [];
    const values = sameSuit.map((c) => c.value);

    // Check for adjacent values
    return (
      values.includes(targetCard.value - 1) ||
      values.includes(targetCard.value + 1)
    );
  }

  return false;
};

/**
 * Count how many cards of a given value exist in hand
 */
const countMatchingValues = (hand: Card[], value: number): number => {
  return hand.filter(
    (c) => c.value === value && c.suit !== "JOKER" && c.value !== 0
  ).length;
};

/**
 * Find all possible trios in hand
 */
const findTrios = (hand: Card[]): CardGroup[] => {
  const groups: CardGroup[] = [];
  const usedIds = new Set<string>();

  // Group by value
  const byValue: Record<number, Card[]> = {};
  hand.forEach((c) => {
    if (c.suit === "JOKER" || c.value === 0) return;
    if (!byValue[c.value]) byValue[c.value] = [];
    byValue[c.value].push(c);
  });

  // Find natural trios
  for (const value in byValue) {
    const cards = byValue[value];
    if (cards.length >= 3) {
      const triCards = cards.slice(0, 3);
      groups.push({ cards: triCards, type: "TRIO" });
      triCards.forEach((c) => usedIds.add(c.id));
    }
  }

  return groups;
};

/**
 * Find all possible escalas in hand
 */
const findEscalas = (hand: Card[]): CardGroup[] => {
  const groups: CardGroup[] = [];
  const usedIds = new Set<string>();

  // Group by suit
  const bySuit: Record<string, Card[]> = {};
  hand.forEach((c) => {
    if (c.suit === "JOKER" || c.value === 0) return;
    if (!bySuit[c.suit]) bySuit[c.suit] = [];
    bySuit[c.suit].push(c);
  });

  // Find escalas for each suit
  for (const suit in bySuit) {
    const cards = bySuit[suit].sort((a, b) => a.value - b.value);

    // Try to find sequences of 4+
    for (let i = 0; i < cards.length; i++) {
      for (let len = 4; len <= cards.length - i; len++) {
        const sequence = cards.slice(i, i + len);
        if (isSequenceValid(sequence)) {
          groups.push({ cards: sequence, type: "ESCALA" });
        }
      }
    }
  }

  return groups;
};

/**
 * Check if a sequence of cards forms a valid escala
 */
const isSequenceValid = (cards: Card[]): boolean => {
  if (cards.length < 4) return false;

  const values = cards.map((c) => c.value).sort((a, b) => a - b);

  // Check for gaps
  let gaps = 0;
  for (let i = 0; i < values.length - 1; i++) {
    gaps += values[i + 1] - values[i] - 1;
  }

  return gaps === 0; // No gaps without jokers
};

/**
 * Find valid group combinations based on difficulty and round
 */
const findGroupCombinations = (
  hand: Card[],
  round: number,
  difficulty: BotDifficulty
): CardGroup[] => {
  if (round === -1) {
    // Any valid group for additional down
    const trios = findTrios(hand);
    const escalas = findEscalas(hand);
    return [...trios, ...escalas];
  }

  // For specific rounds, prefer appropriate group types
  const requirements = getRoundRequirements(round);
  if (!requirements) return [];

  let groups: CardGroup[] = [];

  // EASY: Only find perfect groups
  if (difficulty === "EASY") {
    if (requirements.escalas > 0) {
      groups = findEscalas(hand).filter((g) => g.cards.length >= 4);
    } else {
      groups = findTrios(hand).filter((g) => g.cards.length === 3);
    }
    return groups;
  }

  // MEDIUM: Find standard groups
  if (requirements.escalas > 0) {
    groups = findEscalas(hand).filter((g) => g.cards.length >= 4);
  } else {
    groups = findTrios(hand).filter((g) => g.cards.length >= 3);
  }

  // HARD: Be more aggressive - find larger groups to get bonus points
  if (difficulty === "HARD") {
    // Prefer larger groups (5+ instead of 3)
    const largeGroups = groups.filter((g) => g.cards.length >= 5);
    if (largeGroups.length > 0) {
      return largeGroups;
    }

    // Also look for combinations of trios and escalas for required contracts
    if (requirements.trios > 1) {
      const trios = findTrios(hand).filter((g) => g.cards.length >= 3);
      if (trios.length >= requirements.trios) {
        return trios.slice(0, requirements.trios);
      }
    }

    if (requirements.escalas > 1) {
      const escalas = findEscalas(hand).filter((g) => g.cards.length >= 4);
      if (escalas.length >= requirements.escalas) {
        return escalas.slice(0, requirements.escalas);
      }
    }
  }

  return groups;
};

/**
 * Analyze the competitive position in the game
 * Returns information about leaders, threats, and strategic opportunities
 */
interface CompetitiveAnalysis {
  hasLeader: boolean;
  leaderAnalysis?: {
    playerId: string;
    name: string;
    hand: Card[];
    melds: Card[][];
    totalScore: number;
    pointsInHand: number;
  };
}

const analyzeCompetitivePosition = (
  gameState: GameState,
  botId: string
): CompetitiveAnalysis => {
  const players = gameState.players;

  // Calculate score for each player (including points in hand)
  const playerScores = players.map((p) => ({
    playerId: p.id,
    name: p.name,
    hand: p.hand,
    melds: p.melds || [],
    totalScore: (p.score || 0) + calculateHandPoints(p.hand),
    pointsInHand: calculateHandPoints(p.hand),
  }));

  // Sort by score (ascending) - lower scores are better in Carioca
  playerScores.sort((a, b) => a.totalScore - b.totalScore);

  const leader = playerScores[0];

  return {
    hasLeader:
      leader.totalScore <
      (playerScores[1]?.totalScore ?? leader.totalScore) - 20,
    leaderAnalysis: leader,
  };
};

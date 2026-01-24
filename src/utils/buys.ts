export const MAX_BUYS = 7;

export const getRemainingBuys = (buysUsed: number) =>
  Math.max(0, MAX_BUYS - (buysUsed || 0));

export const getBuyPenalty = (buysUsed: number) =>
  getRemainingBuys(buysUsed) > 0 ? 10 : 0;

export const applyRemainingBuysPenalty = (score: number, buysUsed: number) =>
  score - getBuyPenalty(buysUsed);

export const getBuyExtrasCount = (isCurrentPlayer: boolean) =>
  isCurrentPlayer ? 3 : 2;

export const getBuyTotalCards = (isCurrentPlayer: boolean) =>
  1 + getBuyExtrasCount(isCurrentPlayer);

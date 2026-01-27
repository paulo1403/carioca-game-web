import type { Card } from "@/types/game";

export type MoveDirection = "left" | "right" | "start" | "end";

export const normalizeOrder = (ids: string[], order: string[]) => {
  const idSet = new Set(ids);
  const filtered = order.filter((id) => idSet.has(id));
  const missing = ids.filter((id) => !filtered.includes(id));
  return [...filtered, ...missing];
};

export const moveId = (order: string[], id: string, direction: MoveDirection) => {
  const index = order.indexOf(id);
  if (index === -1) return order;
  const next = [...order];
  next.splice(index, 1);

  const targetIndex = (() => {
    if (direction === "start") return 0;
    if (direction === "end") return next.length;
    if (direction === "left") return Math.max(0, index - 1);
    return Math.min(next.length, index + 1);
  })();

  next.splice(targetIndex, 0, id);
  return next;
};

export const applyOrder = (cards: Card[], order: string[]) => {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const ids = cards.map((c) => c.id);
  const normalized = normalizeOrder(ids, order);
  return normalized.map((id) => byId.get(id)).filter(Boolean) as Card[];
};

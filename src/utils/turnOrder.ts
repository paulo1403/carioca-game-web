export type TurnOrderDirection = "up" | "down";

export const moveTurnOrder = (order: string[], id: string, direction: TurnOrderDirection) => {
  const index = order.indexOf(id);
  if (index === -1) return order;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

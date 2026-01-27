import type { Card } from "@/types/game";
import { applyOrder, moveId, normalizeOrder } from "@/utils/handOrder";

describe("handOrder utilities", () => {
  const cards: Card[] = [
    { id: "a", suit: "HEART", value: 2 },
    { id: "b", suit: "CLUB", value: 3 },
    { id: "c", suit: "SPADE", value: 4 },
  ];

  test("normalizeOrder preserves order and appends missing", () => {
    const result = normalizeOrder(["a", "b", "c"], ["b"]);
    expect(result).toEqual(["b", "a", "c"]);
  });

  test("moveId reorders by direction", () => {
    expect(moveId(["a", "b", "c"], "b", "left")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "right")).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b", "c"], "b", "start")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "end")).toEqual(["a", "c", "b"]);
  });

  test("applyOrder sorts cards by provided order", () => {
    const ordered = applyOrder(cards, ["c", "a", "b"]);
    expect(ordered.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});

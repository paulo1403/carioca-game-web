import { moveTurnOrder } from "@/utils/turnOrder";

describe("turnOrder utilities", () => {
  test("moves player up and down", () => {
    const order = ["a", "b", "c"];
    expect(moveTurnOrder(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveTurnOrder(order, "b", "down")).toEqual(["a", "c", "b"]);
  });

  test("returns same order when move is invalid", () => {
    const order = ["a", "b", "c"];
    expect(moveTurnOrder(order, "a", "up")).toBe(order);
    expect(moveTurnOrder(order, "c", "down")).toBe(order);
    expect(moveTurnOrder(order, "x", "up")).toBe(order);
  });
});

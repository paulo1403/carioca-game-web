import type { Card } from "@/types/game";
import { canAddToMeld, canStealJoker, isEscala, isTrio, validateContract } from "@/utils/rules";

describe("Carioca Rule Validation: Failure Cases", () => {
  const createCard = (suit: string, value: number, id: string): Card => ({
    id,
    suit: suit as any,
    value,
    displayValue: String(value),
  });

  describe("isTrio Failure Cases", () => {
    test("Should reject group with mixed values", () => {
      const group = [
        createCard("SPADE", 2, "1"),
        createCard("SPADE", 3, "2"),
        createCard("CLUB", 4, "3"),
      ];
      // Values differ
      expect(isTrio(group, 3)).toBe(false);
    });

    test("Should reject group too short", () => {
      const group = [createCard("SPADE", 10, "1"), createCard("HEART", 11, "2")];
      expect(isTrio(group, 3)).toBe(false);
    });
  });

  describe("isEscala Failure Cases", () => {
    test("Should reject escala with mixed suits", () => {
      const group = [
        createCard("SPADE", 4, "1"),
        createCard("HEART", 5, "2"), // Different suit
        createCard("SPADE", 6, "3"),
        createCard("SPADE", 7, "4"),
      ];
      expect(isEscala(group)).toBe(false);
    });

    test("Should reject escala with gaps and no Jokers", () => {
      const group = [
        createCard("CLUB", 4, "1"),
        createCard("CLUB", 5, "2"),
        createCard("CLUB", 7, "3"), // Gap at 6
        createCard("CLUB", 8, "4"),
      ];
      expect(isEscala(group)).toBe(false);
    });

    test("Should accept circular escala (K-A-2-3)", () => {
      const group = [
        createCard("DIAMOND", 13, "1"), // K
        createCard("DIAMOND", 1, "2"), // A
        createCard("DIAMOND", 2, "3"), // 2
        createCard("DIAMOND", 3, "4"),
      ];
      expect(isEscala(group, 4)).toBe(true);
    });
  });

  describe("validateContract Failure Cases", () => {
    test("Round 1 (1/3): Should reject if lowering 2 groups (Only exactly contract allowed)", () => {
      const g1 = [
        createCard("SPADE", 2, "s2"),
        createCard("HEART", 3, "h2"),
        createCard("CLUB", 4, "c2"),
      ];
      const g2 = [
        createCard("DIAMOND", 5, "d5"),
        createCard("HEART", 5, "h5"),
        createCard("CLUB", 5, "c5"),
      ];

      const result = validateContract([g1, g2], 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Solo puedes bajar exactamente");
    });

    test("Round 3 (1/4): Should reject if group only has 3 cards", () => {
      const groupOf3 = [
        createCard("SPADE", 2, "s2"),
        createCard("HEART", 3, "h3"),
        createCard("CLUB", 4, "c4"),
      ];

      const result = validateContract([groupOf3], 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("grupo(s) de 4+ cartas del mismo valor");
    });
  });

  describe("canAddToMeld Failure Cases", () => {
    test("Should reject adding a duplicate suit to a different-suit group", () => {
      const group = [
        createCard("SPADE", 10, "1"),
        createCard("HEART", 11, "2"),
        createCard("CLUB", 12, "3"),
      ];
      const invalidCard = createCard("SPADE", 1, "4"); // Suit already exists
      expect(canAddToMeld(invalidCard, group)).toBe(false);
    });
  });
});

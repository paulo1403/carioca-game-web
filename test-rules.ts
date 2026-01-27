import type { Card } from "./src/types/game";
import { isEscala, isTrio, validateContract } from "./src/utils/rules";

const card = (suit: string, value: number): Card => ({
  id: `${suit}-${value}`,
  suit: suit as any,
  value,
});

const invalidGroup = [card("SPADE", 8), card("DIAMOND", 7), card("CLUB", 5)];

const validTrio = [card("SPADE", 2), card("CLUB", 2), card("HEART", 2)];

console.log("Is [8, 7, 5] a Trio?", isTrio(invalidGroup, 3));
console.log("Is [8, 7, 5] an Escala?", isEscala(invalidGroup, 3));

const result = validateContract([invalidGroup, validTrio], 1);
console.log("Validation Result for Round 1:", result);

import type { Card, Suit } from "@/types/game";

const SUITS: Suit[] = ["HEART", "DIAMOND", "CLUB", "SPADE"];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  const numberOfDecks = 2;

  for (let i = 0; i < numberOfDecks; i++) {
    // Standard cards
    SUITS.forEach((suit) => {
      for (let value = 1; value <= 13; value++) {
        let displayValue = String(value);
        if (value === 1) displayValue = "A";
        if (value === 11) displayValue = "J";
        if (value === 12) displayValue = "Q";
        if (value === 13) displayValue = "K";

        deck.push({
          id: `${suit.charAt(0)}${value}-${i}`, // e.g., H1-0, D12-1
          suit,
          value,
          displayValue,
        });
      }
    });

    // Jokers (2 per deck)
    for (let j = 0; j < 2; j++) {
      deck.push({
        id: `JOKER-${i}-${j}`,
        suit: "JOKER",
        value: 0,
        displayValue: "Joker",
      });
    }
  }

  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

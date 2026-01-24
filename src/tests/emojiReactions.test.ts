import { EMOJI_REACTIONS, isEmojiReaction } from "@/utils/emojiReactions";

describe("emoji reactions", () => {
  test("validates allowed emojis", () => {
    expect(isEmojiReaction(EMOJI_REACTIONS[0])).toBe(true);
    expect(isEmojiReaction("😅")).toBe(false);
  });
});

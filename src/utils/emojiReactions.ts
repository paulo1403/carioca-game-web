export const EMOJI_REACTIONS = ["😀", "😎", "🔥", "👏", "😱", "💥", "🎉", "🤝"] as const;
export type EmojiReaction = (typeof EMOJI_REACTIONS)[number];

export const EMOJI_COOLDOWN_MS = 6000;
export const EMOJI_DISPLAY_MS = 3500;

export const isEmojiReaction = (value: string): value is EmojiReaction =>
  (EMOJI_REACTIONS as readonly string[]).includes(value);

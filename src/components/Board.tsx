"use client";

import React, { useState, useMemo } from "react";
import { Card, GameState } from "@/types/game";
import { cn } from "@/lib/utils";

// Hooks
import { useGameState } from "@/hooks/useGameState";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDownMode } from "@/hooks/useDownMode";
import { useAddableCards } from "@/hooks/useAddableCards";
import { useStealableJokers } from "@/hooks/useStealableJokers";
import { useDiscardHint } from "@/hooks/useDiscardHint";
import { useHandManagement, SortMode } from "@/hooks/useHandManagement";
import { MoveDirection } from "@/utils/handOrder";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useDownValidation } from "@/hooks/useDownValidation";

// Components
import { PlayerBadge } from "./PlayerBadge";
import { MeldGroup } from "./MeldGroup";
import { DeckArea } from "./DeckArea";
import { ActionBar } from "./ActionBar";
import { HandArea } from "./HandArea";
import { DownModeControls } from "./DownModeControls";
import { BuyConfirmDialog } from "./BuyConfirmDialog";
import { HandAssistant } from "./HandAssistant";
import { GameHeader } from "./GameHeader";

// Utils
import { canStealJoker, canAddToMeld } from "@/utils/rules";
import { findBestCardMove } from "@/utils/cardMoveHelper";
import { findPotentialContractGroups, findAllValidGroups } from "@/utils/handAnalyzer";
import { ROUND_CONTRACTS_DATA } from "@/types/game";
import { EMOJI_COOLDOWN_MS, EMOJI_REACTIONS, EMOJI_DISPLAY_MS, isEmojiReaction } from "@/utils/emojiReactions";
import { MAX_BUYS } from "@/utils/buys";

// Types and interfaces
interface BoardProps {
  gameState: GameState;
  myPlayerId: string;
  roomId?: string;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  isDrawing?: boolean;
  isBuying?: boolean;
  onDiscard: (cardId: string) => void;
  onDown: (groups: Card[][]) => void;
  onAddToMeld: (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => void;
  onStealJoker: (
    cardId: string,
    targetPlayerId: string,
    meldIndex: number,
  ) => void;
  onEndGame?: () => void;
  onUpdateName: (newName: string) => void;
  hasDrawn: boolean;
  buyIntents?: Record<string, number>;
  onBuyIntent?: () => void;
  emojiReactions?: Record<string, { emoji: string; timestamp: number }>;
  onEmojiReaction?: (emoji: string) => void;
}

export const Board: React.FC<BoardProps> = ({
  gameState,
  myPlayerId,
  roomId,
  onDrawDeck,
  onDrawDiscard,
  isDrawing = false,
  isBuying = false,
  onDiscard,
  onDown,
  onAddToMeld,
  onStealJoker,
  onEndGame,
  onUpdateName,
  hasDrawn,
  buyIntents = {},
  onBuyIntent,
  emojiReactions = {},
  onEmojiReaction,
}) => {
  // Game state
  const { myPlayer, otherPlayers, isMyTurn, myHandPoints, haveMelded } =
    useGameState(gameState, myPlayerId);

  // UI state
  const { isMobile } = useIsMobile();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showBuyConfirmDialog, setShowBuyConfirmDialog] = useState(false);

  // Down mode
  const {
    isDownMode,
    tempGroup,
    groupsToMeld,
    toggleDownMode,
    toggleCardInTempGroup,
    setGroupsToMeld,
    setTempGroup,
    resetDownMode,
  } = useDownMode();

  // Hand management
  const storageKey = roomId ? `${roomId}:${myPlayerId}` : myPlayerId;

  const { sortMode, setSortMode, sortedHand, canDownCheck, moveManualCard } = useHandManagement(
    myPlayer?.hand ?? [],
    gameState.currentRound,
    haveMelded ?? false,
    myPlayer?.boughtCards ?? [],
    storageKey,
  );

  // Addable cards
  const addableCards = useAddableCards(
    isMyTurn,
    hasDrawn,
    isDownMode,
    myPlayer,
    otherPlayers,
    haveMelded ?? false,
  );

  // Stealable jokers
  const stealableJokers = useStealableJokers(
    gameState,
    myPlayer,
    isMyTurn,
    isDownMode,
  );

  // Discard hint + reason
  const { suggestedDiscardCardId, isDiscardUseful, discardReason } = useDiscardHint(
    myPlayer,
    isMyTurn,
    hasDrawn,
    isDownMode,
    gameState,
  );

  // Group candidates (cards that are part of potential or valid groups)
  const groupCandidateIds = React.useMemo(() => {
    const set = new Set<string>();
    if (!myPlayer) return set;
    if (haveMelded) {
      const { trios, escalas } = findAllValidGroups(myPlayer.hand);
      [...trios, ...escalas].forEach(g => g.forEach(c => set.add(c.id)));
    } else {
      const { trios, escalas } = findPotentialContractGroups(myPlayer.hand, gameState.currentRound);

      // Only highlight if overall contract requirement can be met.
      const reqs = ROUND_CONTRACTS_DATA[gameState.currentRound] || { differentSuitGroups: 0, escalas: 0 };
      const hasEnoughTrios = trios.length >= (reqs.differentSuitGroups || 0);
      const hasEnoughEscalas = escalas.length >= (reqs.escalas || 0);

      if (hasEnoughTrios && hasEnoughEscalas) {
        // Only include the exact groups needed for the contract to avoid over-highlighting.
        [...trios.slice(0, reqs.differentSuitGroups), ...escalas.slice(0, reqs.escalas)].forEach(g => g.forEach(c => set.add(c.id)));
      }
    }
    return set;
  }, [myPlayer, haveMelded, gameState.currentRound]);

  // Additional groups for players who've melded (quick suggestions)
  const additionalGroups = React.useMemo(() => {
    if (!myPlayer || !haveMelded) return [] as Card[][];
    const { trios, escalas } = findAllValidGroups(myPlayer.hand);
    return [...trios, ...escalas];
  }, [myPlayer, haveMelded]);

  // Sounds
  const {
    playSelect,
    playDrop,
    playShuffle,
    playSuccess,
    playError,
    playYourTurn,
    playClick,
    volume,
    decreaseVolume,
    increaseVolume,
    toggleMute,
    isMuted,
  } = useGameSounds();

  const [sortFeedback, setSortFeedback] = useState<string | null>(null);
  const [buyIntentCooldownUntil, setBuyIntentCooldownUntil] = useState(0);
  const [emojiCooldownUntil, setEmojiCooldownUntil] = useState(0);
  const [panelOpen, setPanelOpen] = useState(!isMobile);
  const [panelTab, setPanelTab] = useState<"actions" | "emoji">("actions");
  const [showAssistant, setShowAssistant] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    playClick();
    setSortFeedback("Orden aplicado");
    setTimeout(() => setSortFeedback(null), 1200);
  };

  const handleMoveSelectedCard = (direction: MoveDirection) => {
    if (!selectedCardId) return;
    moveManualCard(selectedCardId, direction);
    playClick();
    setSortFeedback("Orden personalizado");
    setTimeout(() => setSortFeedback(null), 1200);
  };

  const canBuyIntent =
    !!onBuyIntent &&
    !isMyTurn &&
    !hasDrawn &&
    !isDownMode &&
    gameState.status === "PLAYING" &&
    gameState.discardPile.length > 0 &&
    Date.now() > buyIntentCooldownUntil;

  const handleBuyIntent = () => {
    if (!canBuyIntent) return;
    onBuyIntent?.();
    setBuyIntentCooldownUntil(Date.now() + 10000);
  };

  const canEmojiReact =
    !!onEmojiReaction &&
    gameState.status === "PLAYING" &&
    Date.now() > emojiCooldownUntil;

  const handleEmojiReaction = (emoji: string) => {
    if (!canEmojiReact || !isEmojiReaction(emoji)) return;
    onEmojiReaction?.(emoji);
    setEmojiCooldownUntil(Date.now() + EMOJI_COOLDOWN_MS);
  };

  const getAddTargets = React.useCallback(
    (cardId: string) => {
      const card = myPlayer?.hand.find((c) => c.id === cardId);
      if (!card) return [] as { playerId: string; playerName: string; meldIndex: number }[];

      const targets: { playerId: string; playerName: string; meldIndex: number }[] = [];
      gameState.players.forEach((player) => {
        (player.melds || []).forEach((meld, meldIndex) => {
          if (canAddToMeld(card, meld)) {
            targets.push({
              playerId: player.id,
              playerName: player.name,
              meldIndex,
            });
          }
        });
      });
      return targets;
    },
    [gameState.players, myPlayer?.hand],
  );

  const hasBuyIntent = (playerId?: string) => {
    if (!playerId) return false;
    return Boolean(buyIntents[playerId]);
  };

  const getEmojiReaction = (playerId?: string) => {
    if (!playerId) return undefined;
    const data = emojiReactions[playerId];
    if (!data) return undefined;
    return data.emoji;
  };

  const myEmojiReaction = getEmojiReaction(myPlayerId);

  const wasMyTurnRef = React.useRef(false);

  // Highlight turn for human
  React.useEffect(() => {
    const isPlaying = gameState.status === "PLAYING";
    if (isPlaying && isMyTurn && !wasMyTurnRef.current) {
      playYourTurn();
    }
    wasMyTurnRef.current = isPlaying && isMyTurn;
  }, [isMyTurn, gameState.status, playYourTurn]);

  React.useEffect(() => {
    setPanelOpen(!isMobile);
  }, [isMobile]);

  React.useEffect(() => {
    if (
      panelTab !== "actions" &&
      stealableJokers.length > 0 &&
      isMyTurn &&
      hasDrawn &&
      !isDownMode
    ) {
      setPanelTab("actions");
    }
  }, [panelTab, stealableJokers.length, isMyTurn, hasDrawn, isDownMode]);

  // Player layout (responsive for mobile and desktop)
  const layout = useMemo(() => {
    const all = gameState.players;
    const count = all.length;
    const myIndex = all.findIndex((p) => p.id === myPlayerId);
    const otherPlayers = all.filter((p) => p.id !== myPlayerId);

    // Helper to get player at relative offset
    const getP = (offset: number) => all[(myIndex + offset) % count];

    // Mobile layout - stack players differently for better space usage
    if (isMobile) {
      if (count <= 3) {
        return { others: otherPlayers.slice(0, 2) };
      }
      // For 4+ players on mobile, use a grid layout
      return { others: otherPlayers };
    }

    // Desktop layout - original circular layout
    if (count === 2) {
      return { top: getP(1) };
    }
    if (count === 3) {
      return { left: getP(1), right: getP(2) };
    }
    if (count === 4) {
      return {
        left: getP(1),
        top: getP(2),
        right: getP(3),
      };
    }
    if (count === 5) {
      return {
        left: getP(1),
        topLeft: getP(2),
        topRight: getP(3),
        right: getP(4),
      };
    }

    return {};
  }, [gameState.players, myPlayerId, isMobile]);

  // Handlers
  const handleCardClick = (cardId: string) => {
    if (isDownMode) {
      const card = myPlayer?.hand.find((c) => c.id === cardId);
      if (!card) return;

      if (groupsToMeld.some((g) => g.some((c) => c.id === cardId))) return;

      toggleCardInTempGroup(card);
      playSelect();
    } else {
      if (selectedCardId === cardId) {
        setSelectedCardId(null);
        playSelect();
      } else {
        setSelectedCardId(cardId);
        playSelect();
      }
    }
  };

  const handleDiscardPileClick = () => {
    if (isDownMode) return;

    // Priority: If current player has drawn AND has a card selected -> DISCARD that card
    if (isMyTurn && hasDrawn && selectedCardId) {
      onDiscard(selectedCardId);
      playDrop();
      setSelectedCardId(null);
      return;
    }

    // Otherwise: Allow anyone to BUY (others, or current player before drawing)
    const turnPlayer = gameState.players[gameState.currentTurn];
    const isBuyWindowClosed = turnPlayer?.hasDrawn;

    if (gameState.discardPile.length === 0 || isBuyWindowClosed) {
      if (isBuyWindowClosed) {
        // Optional: show a mini-toast or feedback that buy is closed
      }
      return;
    }

    if (myPlayer && (myPlayer.buysUsed ?? 0) >= MAX_BUYS) {
      playError();
      return;
    }
    setShowBuyConfirmDialog(true);
  };

  const handleAddGroup = () => {
    if (tempGroup.length < 3) {
      playError();
      return;
    }
    setGroupsToMeld((prev) => [...prev, [...tempGroup]]);
    setTempGroup([]);
    playSuccess();
  };

  const { validateDown } = useDownValidation();
  const [downError, setDownError] = useState<string | null>(null);
  const [downWarning, setDownWarning] = useState<string | null>(null);

  const handleConfirmDown = () => {
    if (groupsToMeld.length === 0) return;

    const totalCardsToMeld = groupsToMeld.reduce(
      (sum, group) => sum + group.length,
      0,
    );
    const cardsInHand = myPlayer?.hand.length || 0;
    const alreadyMelded = (myPlayer?.melds?.length ?? 0) > 0;

    // Validate using the new hook
    const validation = validateDown(
      groupsToMeld,
      gameState.currentRound,
      alreadyMelded,
      cardsInHand,
      totalCardsToMeld,
    );

    if (!validation.isValid) {
      setDownError(validation.error || "Error al bajar");
      playError();
      return;
    }

    setDownError(null);
    setDownWarning(validation.handWarning || null);
    onDown(groupsToMeld);
    resetDownMode();
    playSuccess();
  };

  const handleMeldClick = (targetPlayerId: string, meldIndex: number) => {
    if (!isMyTurn || !hasDrawn || !selectedCardId || isDownMode) return;

    const card = myPlayer?.hand.find((c) => c.id === selectedCardId);
    if (!card) return;

    const player = gameState.players.find((p) => p.id === targetPlayerId);
    if (!player || !player.melds) return;

    const meld = player.melds[meldIndex];
    if (canAddToMeld(card, meld)) {
      onAddToMeld(selectedCardId, targetPlayerId, meldIndex);
      setSelectedCardId(null);
      playSuccess();
    } else {
      playError();
    }
  };

  const selectedAddTargets = React.useMemo(() => {
    if (!selectedCardId || !addableCards.includes(selectedCardId)) return [];
    return getAddTargets(selectedCardId);
  }, [selectedCardId, addableCards, getAddTargets]);

  const handleStealJoker = (index: number) => {
    if (index < 0 || index >= stealableJokers.length) return;

    const sj = stealableJokers[index];
    const stealingCard = myPlayer?.hand.find((card) =>
      canStealJoker(
        card,
        gameState.players.find((p) => p.id === sj.playerId)?.melds?.[
        sj.meldIndex
        ] || [],
        myPlayer.hand,
      ),
    );

    if (stealingCard) {
      onStealJoker(stealingCard.id, sj.playerId, sj.meldIndex);
      playSuccess();
    }
  };

  return (
    <div
      className="min-h-screen felt-table p-2 md:p-4 flex flex-col gap-3 overflow-y-auto select-none"
      style={{ paddingBottom: "safe-area-inset-bottom" }}
    >
      <GameHeader
        gameState={gameState}
        myPlayerId={myPlayerId}
        roomId={roomId}
        onEndGame={onEndGame}
      />
      <div className="h-10 md:h-12"></div> {/* Spacer for fixed header */}
      <div className="flex justify-center mb-2">
        <div
          className={cn(
            "px-3 py-1 rounded-full text-xs md:text-sm font-semibold bg-slate-900/50 text-slate-100 border border-slate-700/60 shadow-sm",
            isMyTurn ? "ring-1 ring-amber-300/70 bg-emerald-500/20" : "",
          )}
        >
          {isMyTurn ? "Tu turno" : "Turno"} · R{gameState.currentRound}
          {isDownMode && " · Bajada"}
          {!isDownMode && isMyTurn && !hasDrawn && " · Roba"}
          {!isDownMode && isMyTurn && hasDrawn && !selectedCardId && " · Descarta"}
        </div>
      </div>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 pb-6">
        <section className="rounded-2xl bg-slate-950/40 border border-slate-800/60 p-3 md:p-4 shadow-lg">
          {/* Players Area - Responsive Layout */}
          {isMobile ? (
            <div className="w-full max-w-sm mx-auto mb-4">
              {layout.others && layout.others.length > 0 && (
                <div className="grid grid-cols-2 gap-2 place-items-center">
                  {layout.others.slice(0, 4).map((player) => (
                    <div key={player.id} className="w-full">
                      <PlayerBadge
                        player={player}
                        isOwnPlayer={false}
                        isCurrentTurn={
                          gameState.currentTurn ===
                          gameState.players.findIndex((p) => p.id === player.id)
                        }
                        buyIntentActive={hasBuyIntent(player.id)}
                        reactionEmoji={getEmojiReaction(player.id)}
                        handPoints={0}
                        expandedPlayerId={expandedPlayerId}
                        onExpandToggle={setExpandedPlayerId}
                        gameStatus={gameState.status}
                        onUpdateName={onUpdateName}
                        onMeldClick={handleMeldClick}
                        className="w-full transform-none text-center"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-around items-start w-full max-w-3xl mx-auto min-h-15">
              {layout.topLeft && (
                <PlayerBadge
                  key={layout.topLeft.id}
                  player={layout.topLeft}
                  isOwnPlayer={layout.topLeft.id === myPlayerId}
                  isCurrentTurn={
                    gameState.currentTurn ===
                    gameState.players.findIndex((p) => p.id === layout.topLeft?.id)
                  }
                  buyIntentActive={hasBuyIntent(layout.topLeft.id)}
                  reactionEmoji={getEmojiReaction(layout.topLeft.id)}
                  handPoints={layout.topLeft.id === myPlayerId ? myHandPoints : 0}
                  expandedPlayerId={expandedPlayerId}
                  onExpandToggle={setExpandedPlayerId}
                  gameStatus={gameState.status}
                  onUpdateName={onUpdateName}
                  onMeldClick={handleMeldClick}
                />
              )}

              {layout.top && (
                <PlayerBadge
                  key={layout.top.id}
                  player={layout.top}
                  isOwnPlayer={layout.top.id === myPlayerId}
                  isCurrentTurn={
                    gameState.currentTurn ===
                    gameState.players.findIndex((p) => p.id === layout.top?.id)
                  }
                  buyIntentActive={hasBuyIntent(layout.top.id)}
                  reactionEmoji={getEmojiReaction(layout.top.id)}
                  handPoints={layout.top.id === myPlayerId ? myHandPoints : 0}
                  expandedPlayerId={expandedPlayerId}
                  onExpandToggle={setExpandedPlayerId}
                  gameStatus={gameState.status}
                  onUpdateName={onUpdateName}
                  onMeldClick={handleMeldClick}
                />
              )}

              {layout.topRight && (
                <PlayerBadge
                  key={layout.topRight.id}
                  player={layout.topRight}
                  isOwnPlayer={layout.topRight.id === myPlayerId}
                  isCurrentTurn={
                    gameState.currentTurn ===
                    gameState.players.findIndex((p) => p.id === layout.topRight?.id)
                  }
                  buyIntentActive={hasBuyIntent(layout.topRight.id)}
                  reactionEmoji={getEmojiReaction(layout.topRight.id)}
                  handPoints={layout.topRight.id === myPlayerId ? myHandPoints : 0}
                  expandedPlayerId={expandedPlayerId}
                  onExpandToggle={setExpandedPlayerId}
                  gameStatus={gameState.status}
                  onUpdateName={onUpdateName}
                  onMeldClick={handleMeldClick}
                />
              )}
            </div>
          )}

          {/* Middle Area */}
          <div className="flex items-center justify-between gap-2 md:gap-6 w-full mt-2">
            {!isMobile && (
              <div className="flex items-center justify-center w-24 md:w-32">
                {layout.left && (
                  <PlayerBadge
                    player={layout.left}
                    className="-rotate-90 origin-center transform translate-x-4"
                    isOwnPlayer={layout.left.id === myPlayerId}
                    isCurrentTurn={
                      gameState.currentTurn ===
                      gameState.players.findIndex((p) => p.id === layout.left?.id)
                    }
                    buyIntentActive={hasBuyIntent(layout.left.id)}
                    reactionEmoji={getEmojiReaction(layout.left.id)}
                    handPoints={layout.left.id === myPlayerId ? myHandPoints : 0}
                    expandedPlayerId={expandedPlayerId}
                    onExpandToggle={setExpandedPlayerId}
                    gameStatus={gameState.status}
                    onUpdateName={onUpdateName}
                  />
                )}
              </div>
            )}

            <DeckArea
              isMyTurn={isMyTurn}
              hasDrawn={hasDrawn}
              isDownMode={isDownMode}
              gameState={gameState}
              myPlayer={myPlayer}
              onDrawDeck={onDrawDeck}
              onDrawDiscard={onDrawDiscard}
              isDrawing={isDrawing}
              isBuying={isBuying}
              handleDiscardPileClick={handleDiscardPileClick}
              setShowBuyConfirmDialog={setShowBuyConfirmDialog}
              isDiscardUseful={isDiscardUseful}
              discardReason={discardReason}
              playShuffle={playShuffle}
              selectedCardId={selectedCardId}
            />

            {!isMobile && (
              <div className="flex items-center justify-center w-24 md:w-32">
                {layout.right && (
                  <PlayerBadge
                    player={layout.right}
                    className="rotate-90 origin-center transform -translate-x-4"
                    isOwnPlayer={layout.right.id === myPlayerId}
                    isCurrentTurn={
                      gameState.currentTurn ===
                      gameState.players.findIndex((p) => p.id === layout.right?.id)
                    }
                    buyIntentActive={hasBuyIntent(layout.right.id)}
                    reactionEmoji={getEmojiReaction(layout.right.id)}
                    handPoints={layout.right.id === myPlayerId ? myHandPoints : 0}
                    expandedPlayerId={expandedPlayerId}
                    onExpandToggle={setExpandedPlayerId}
                    gameStatus={gameState.status}
                    onUpdateName={onUpdateName}
                  />
                )}
              </div>
            )}
          </div>
        </section>

        <section
          className="rounded-2xl bg-slate-950/60 border border-slate-700/50 p-3 md:p-4 shadow-xl backdrop-blur-sm sticky bottom-0 z-30"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "text-white font-semibold text-sm md:text-base bg-slate-900/60 px-3 py-1 md:px-4 rounded-full transition-all text-center max-w-[90vw] truncate border border-slate-700/60",
                    isMyTurn ? "ring-1 ring-amber-300/70 bg-emerald-600/30" : "",
                  )}
                >
                  {isMyTurn ? "Tu turno" : "Turno"} · {myPlayer?.name} · R{gameState.currentRound}
                  {isDownMode && " · Bajada"}
                  {!isDownMode && isMyTurn && !hasDrawn && " · Roba"}
                  {!isDownMode && isMyTurn && hasDrawn && !selectedCardId && " · Descarta"}
                </div>
                {myEmojiReaction && (
                  <div className="relative">
                    <div className="text-2xl drop-shadow-lg animate-bounce bg-slate-50 text-slate-900 px-2 py-1 rounded-full border border-slate-300 shadow-sm">
                      {myEmojiReaction}
                    </div>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-300 rotate-45" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sortFeedback && (
                  <span className="text-[10px] md:text-xs font-semibold px-3 py-1 rounded-full bg-blue-900/40 text-blue-200 border border-blue-500/30">
                    {sortFeedback}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPanelOpen((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border bg-slate-900/60 text-slate-200 border-slate-700/60 hover:bg-slate-800/70"
                >
                  {panelOpen ? "Ocultar" : "Panel"}
                </button>
                <button
                  type="button"
                  onClick={() => setSecondaryOpen((prev) => !prev)}
                  className="px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border bg-slate-900/60 text-slate-200 border-slate-700/60 hover:bg-slate-800/70"
                >
                  {secondaryOpen ? "Menos" : "Más"}
                </button>
              </div>
            </div>

            {panelOpen && panelTab === "actions" && !isDownMode && (
              <ActionBar
                stealableJokers={stealableJokers}
                isMyTurn={isMyTurn}
                hasDrawn={hasDrawn}
                isDownMode={isDownMode}
                canDown={canDownCheck.canDown}
                hasMelds={haveMelded ?? false}
                onToggleDownMode={toggleDownMode}
                onStealJoker={handleStealJoker}
                processing={isDrawing || isBuying}
                onBuyIntent={handleBuyIntent}
                canBuyIntent={canBuyIntent}
              />
            )}

            {secondaryOpen && panelTab === "emoji" && onEmojiReaction && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiReaction(emoji)}
                    disabled={!canEmojiReact}
                    className={cn(
                      "text-xl md:text-2xl px-3 py-1.5 rounded-full border transition-all",
                      canEmojiReact
                        ? "bg-slate-900/60 border-slate-600 hover:bg-slate-700/70"
                        : "bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {secondaryOpen && showAssistant && (
              <HandAssistant
                hand={myPlayer?.hand ?? []}
                topDiscard={
                  gameState.discardPile.length > 0
                    ? gameState.discardPile[gameState.discardPile.length - 1]
                    : undefined
                }
                currentRound={gameState.currentRound}
                sortMode={sortMode}
                onToggleAutoSort={() => {
                  handleSortModeChange(sortMode === "auto" ? "suit" : "auto");
                }}
                canInteract={isMyTurn && hasDrawn && !isDownMode && !!myPlayer}
                onPrefillDownMode={(cards) => {
                  if (!myPlayer || !isMyTurn || !hasDrawn) return;
                  if (!isDownMode) toggleDownMode();
                  setSelectedCardId(null);
                  setTempGroup(cards);
                  playSelect();
                }}
                allMelds={gameState.players.flatMap((p) => p.melds || [])}
                additionalGroups={additionalGroups}
                onAddToMeld={(cardId) => {
                  if (!myPlayer) return;
                  const card = myPlayer.hand.find((c) => c.id === cardId);
                  if (card) {
                    const bestMove = findBestCardMove(card, myPlayer, otherPlayers);
                    if (bestMove) {
                      onAddToMeld(cardId, bestMove.targetPlayerId, bestMove.meldIndex);
                      playSuccess();
                    }
                  }
                }}
                haveMelded={haveMelded}
                canAutoDown={
                  !!myPlayer &&
                  canDownCheck.canDown &&
                  myPlayer.hand.length - canDownCheck.groups.flat().length > 0
                }
                onAutoDown={() => {
                  if (!myPlayer || !isMyTurn || !hasDrawn) return;
                  if (!isDownMode) toggleDownMode();
                  setSelectedCardId(null);
                  setGroupsToMeld(canDownCheck.groups);
                  setTempGroup([]);
                  playSelect();
                }}
                disabled={isDownMode || !myPlayer}
              />
            )}

            {secondaryOpen && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-900/70 border border-slate-700/70 rounded-full p-1">
                  <button
                    type="button"
                    onClick={decreaseVolume}
                    className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full text-slate-200 hover:bg-slate-800/70"
                    title="Bajar volumen"
                  >
                    Vol -
                  </button>
                  <div className="text-[10px] md:text-xs text-slate-300 px-2">
                    {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                  </div>
                  <button
                    type="button"
                    onClick={increaseVolume}
                    className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full text-slate-200 hover:bg-slate-800/70"
                    title="Subir volumen"
                  >
                    Vol +
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full text-slate-200 hover:bg-slate-800/70"
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted ? "Mute" : "Silencio"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAssistant((prev) => !prev)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border",
                    showAssistant
                      ? "bg-blue-600/70 text-white border-blue-400/70"
                      : "bg-slate-900/60 text-slate-200 border-slate-700/60 hover:bg-slate-800/70",
                  )}
                >
                  Asistente
                </button>

                <div className="flex items-center gap-1 bg-slate-900/70 border border-slate-700/70 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setPanelTab("actions")}
                    className={cn(
                      "text-xs md:text-sm font-semibold px-3 py-1 rounded-full relative",
                      panelTab === "actions"
                        ? "bg-blue-600/70 text-white"
                        : "bg-slate-800/70 text-slate-200",
                    )}
                  >
                    Acciones
                    {stealableJokers.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("emoji")}
                    className={cn(
                      "text-xs md:text-sm font-semibold px-3 py-1 rounded-full",
                      panelTab === "emoji"
                        ? "bg-blue-600/70 text-white"
                        : "bg-slate-800/70 text-slate-200",
                    )}
                  >
                    Emojis
                  </button>
                </div>
              </div>
            )}

            {!isDownMode && selectedAddTargets.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs md:text-sm text-blue-200 font-semibold">
                    Carta seleccionada: elige agregar o descartar
                  </div>
                  <div className="flex items-center gap-2">
                    {isMyTurn && hasDrawn && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedCardId) return;
                          onDiscard(selectedCardId);
                          setSelectedCardId(null);
                          playDrop();
                        }}
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-800/70"
                      >
                        Descartar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedCardId(null)}
                      className="text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30 text-blue-200 hover:bg-blue-900/40"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAddTargets.map((target) => (
                    <button
                      key={`${target.playerId}-${target.meldIndex}`}
                      type="button"
                      onClick={() => {
                        onAddToMeld(selectedCardId as string, target.playerId, target.meldIndex);
                        setSelectedCardId(null);
                        playSuccess();
                      }}
                      className="px-3 py-2 rounded-full text-xs md:text-sm font-semibold bg-blue-600/80 text-white border border-blue-400/50 hover:bg-blue-500/80"
                    >
                      {target.playerName} · Juego {target.meldIndex + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {haveMelded &&
              myPlayer &&
              myPlayer.melds &&
              myPlayer.melds.length > 0 && (
                <div className="flex justify-center gap-4 flex-wrap">
                  {myPlayer.melds.map((group, gIdx) => (
                    <MeldGroup
                      key={gIdx}
                      group={group}
                      playerId={myPlayer.id}
                      meldIndex={gIdx}
                      size="large"
                    />
                  ))}
                </div>
              )}

            <HandArea
              sortedHand={sortedHand}
              groupsToMeld={groupsToMeld}
              tempGroup={tempGroup}
              selectedCardId={selectedCardId}
              addableCards={addableCards}
              suggestedDiscardCardId={suggestedDiscardCardId}
              isMyTurn={isMyTurn}
              hasDrawn={hasDrawn}
              isDownMode={isDownMode}
              isMobile={isMobile}
              onClick={handleCardClick}
              handPoints={myHandPoints}
              boughtCardIds={myPlayer?.boughtCards?.map((c) => c.id) ?? []}
              groupCandidateIds={groupCandidateIds}
              sortMode={sortMode}
              onSortModeChange={handleSortModeChange}
              onMoveSelectedCard={handleMoveSelectedCard}
              canReorder={!isDownMode && !!myPlayer}
            />

            {isDownMode && (
              <DownModeControls
                groupsToMeld={groupsToMeld}
                tempGroup={tempGroup}
                onAddGroup={handleAddGroup}
                onConfirmDown={handleConfirmDown}
                onCancel={toggleDownMode}
                error={downError}
                canAutoFill={canDownCheck.canDown && groupsToMeld.length === 0}
                onAutoFill={() => {
                  setGroupsToMeld(canDownCheck.groups);
                  setTempGroup([]);
                }}
                canConfirmDown={
                  myPlayer
                    ? myPlayer.hand.length -
                      (groupsToMeld.reduce((sum, g) => sum + g.length, 0) +
                        tempGroup.length) >
                      0
                    : false
                }
              />
            )}
          </div>
        </section>
      </div>
      {/* Buy Confirmation Dialog */}
      <BuyConfirmDialog
        show={showBuyConfirmDialog}
        myPlayer={myPlayer}
        discardCard={gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : undefined}
        currentRound={gameState.currentRound}
        onConfirm={() => {
          setShowBuyConfirmDialog(false);
          onDrawDiscard();
          playShuffle();
        }}
        onCancel={() => setShowBuyConfirmDialog(false)}
      />
    </div>
  );
};

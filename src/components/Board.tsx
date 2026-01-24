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
import { useHandManagement } from "@/hooks/useHandManagement";
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

// Types and interfaces
interface BoardProps {
  gameState: GameState;
  myPlayerId: string;
  roomId?: string;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
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
}

export const Board: React.FC<BoardProps> = ({
  gameState,
  myPlayerId,
  roomId,
  onDrawDeck,
  onDrawDiscard,
  onDiscard,
  onDown,
  onAddToMeld,
  onStealJoker,
  onEndGame,
  onUpdateName,
  hasDrawn,
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
  const { sortMode, setSortMode, sortedHand, canDownCheck } = useHandManagement(
    myPlayer?.hand ?? [],
    gameState.currentRound,
    haveMelded ?? false,
    myPlayer?.boughtCards ?? [],
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
  } = useGameSounds();

  // Highlight turn for human
  React.useEffect(() => {
    if (isMyTurn && gameState.status === "PLAYING") {
      playYourTurn();
    }
  }, [isMyTurn, gameState.status, playYourTurn]);

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
    if (!isMyTurn || !hasDrawn) return;

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

    if (myPlayer && (myPlayer.buysUsed ?? 0) >= 7) {
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
      className="min-h-screen felt-table p-2 md:p-4 flex flex-col justify-between overflow-hidden select-none"
      style={{ paddingBottom: "safe-area-inset-bottom" }}
    >
      <GameHeader
        gameState={gameState}
        myPlayerId={myPlayerId}
        roomId={roomId}
        onEndGame={onEndGame}
      />
      <div className="h-10 md:h-12"></div> {/* Spacer for fixed header */}
      {/* Players Area - Responsive Layout */}
      {isMobile ? (
        // Mobile Layout - Grid for better space usage
        <div className="w-full max-w-sm mx-auto mb-4">
          {layout.others && layout.others.length > 0 && (
            <div
              className={cn(
                "grid gap-2 place-items-center",
                layout.others.length <= 2 ? "grid-cols-2" : "grid-cols-2",
              )}
            >
              {layout.others.slice(0, 4).map((player) => (
                <div key={player.id} className="w-full">
                  <PlayerBadge
                    player={player}
                    isOwnPlayer={false}
                    isCurrentTurn={
                      gameState.currentTurn ===
                      gameState.players.findIndex((p) => p.id === player.id)
                    }
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
        // Desktop Layout - Original circular layout
        <div className="flex justify-around items-start w-full max-w-2xl mx-auto min-h-15">
          {/* Case: 5 Players (Top Left & Top Right) */}
          {layout.topLeft && (
            <PlayerBadge
              key={layout.topLeft.id}
              player={layout.topLeft}
              isOwnPlayer={layout.topLeft.id === myPlayerId}
              isCurrentTurn={
                gameState.currentTurn ===
                gameState.players.findIndex((p) => p.id === layout.topLeft?.id)
              }
              handPoints={layout.topLeft.id === myPlayerId ? myHandPoints : 0}
              expandedPlayerId={expandedPlayerId}
              onExpandToggle={setExpandedPlayerId}
              gameStatus={gameState.status}
              onUpdateName={onUpdateName}
              onMeldClick={handleMeldClick}
            />
          )}

          {/* Case: 2 or 4 Players (Center Top) */}
          {layout.top && (
            <PlayerBadge
              key={layout.top.id}
              player={layout.top}
              isOwnPlayer={layout.top.id === myPlayerId}
              isCurrentTurn={
                gameState.currentTurn ===
                gameState.players.findIndex((p) => p.id === layout.top?.id)
              }
              handPoints={layout.top.id === myPlayerId ? myHandPoints : 0}
              expandedPlayerId={expandedPlayerId}
              onExpandToggle={setExpandedPlayerId}
              gameStatus={gameState.status}
              onUpdateName={onUpdateName}
              onMeldClick={handleMeldClick}
            />
          )}

          {/* Case: 5 Players (Top Right) */}
          {layout.topRight && (
            <PlayerBadge
              key={layout.topRight.id}
              player={layout.topRight}
              isOwnPlayer={layout.topRight.id === myPlayerId}
              isCurrentTurn={
                gameState.currentTurn ===
                gameState.players.findIndex((p) => p.id === layout.topRight?.id)
              }
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
      <div className="flex-1 flex justify-between items-center my-2 md:my-4 w-full">
        {/* Left Player - Only show on desktop */}
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
                handPoints={layout.left.id === myPlayerId ? myHandPoints : 0}
                expandedPlayerId={expandedPlayerId}
                onExpandToggle={setExpandedPlayerId}
                gameStatus={gameState.status}
                onUpdateName={onUpdateName}
              />
            )}
          </div>
        )}

        {/* Center Table */}
        <DeckArea
          isMyTurn={isMyTurn}
          hasDrawn={hasDrawn}
          isDownMode={isDownMode}
          gameState={gameState}
          myPlayer={myPlayer}
          onDrawDeck={onDrawDeck}
          onDrawDiscard={onDrawDiscard}
          handleDiscardPileClick={handleDiscardPileClick}
          setShowBuyConfirmDialog={setShowBuyConfirmDialog}
          isDiscardUseful={isDiscardUseful}
          discardReason={discardReason}
          playShuffle={playShuffle}
          selectedCardId={selectedCardId}
        />

        {/* Right Player - Only show on desktop */}
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
      {/* Bottom: My Player Hand */}
      <div className="flex flex-col items-center w-full relative">
        {/* Action Bar */}
        {!isDownMode && (
          <ActionBar
            stealableJokers={stealableJokers}
            isMyTurn={isMyTurn}
            hasDrawn={hasDrawn}
            isDownMode={isDownMode}
            canDown={canDownCheck.canDown}
            hasMelds={haveMelded ?? false}
            onToggleDownMode={toggleDownMode}
            onStealJoker={handleStealJoker}
          />
        )}

        {/* My Melds */}
        {haveMelded &&
          myPlayer &&
          myPlayer.melds &&
          myPlayer.melds.length > 0 && (
            <div className="mb-4 flex justify-center gap-4 flex-wrap">
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

        {/* Status Message */}
        <div
          className={cn(
            "mb-2 text-white font-bold text-sm md:text-lg bg-black/40 px-3 py-1 md:px-4 rounded-full transition-all text-center max-w-[90vw] truncate",
            isMyTurn ? "ring-2 ring-yellow-400 bg-green-600/80" : "",
          )}
        >
          {myPlayer?.name} (Tú) - R{gameState.currentRound}
          {isDownMode && " - Selecciona cartas para formar grupos"}
          {!isDownMode && isMyTurn && !hasDrawn && " - Roba una carta"}
          {!isDownMode &&
            isMyTurn &&
            hasDrawn &&
            !selectedCardId &&
            (addableCards.length > 0
              ? " - Cartas azules: ¡Se pueden añadir a juegos!"
              : " - Selecciona una carta para botar")}
          {!isDownMode &&
            isMyTurn &&
            hasDrawn &&
            selectedCardId &&
            " - Toca el Pozo para confirmar"}
        </div>

        <HandAssistant
          hand={myPlayer?.hand ?? []}
          topDiscard={
            gameState.discardPile.length > 0
              ? gameState.discardPile[gameState.discardPile.length - 1]
              : undefined
          }
          currentRound={gameState.currentRound}
          sortMode={sortMode}
          onToggleAutoSort={() =>
            setSortMode((prev) => (prev === "auto" ? "suit" : "auto"))
          }
          canInteract={isMyTurn && hasDrawn && !isDownMode && !!myPlayer}
          onPrefillDownMode={(cards) => {
            if (!myPlayer || !isMyTurn || !hasDrawn) return;
            if (!isDownMode) toggleDownMode();
            setSelectedCardId(null);
            setTempGroup(cards);
            playSelect();
          }}
          allMelds={gameState.players.flatMap(p => p.melds || [])}
          additionalGroups={additionalGroups}
          onAddToMeld={(cardId) => {
            if (!myPlayer) return;
            const card = myPlayer.hand.find(c => c.id === cardId);
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

        {/* Hand Area */}
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
          boughtCardIds={myPlayer?.boughtCards.map((c) => c.id)}
          groupCandidateIds={groupCandidateIds}
        />

        {/* Down Mode Controls */}
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

        {/* Duplicate HandArea removed - single HandArea above handles rendering */}
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

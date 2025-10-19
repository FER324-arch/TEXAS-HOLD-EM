import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import './styles/app.css';
import type { Card, GameState, PlayerAction, PlayerState, Stage } from './game/types';
import { createDeck, drawCards, formatCard, shuffleDeck, toDisplayCard } from './game/cardUtils';
import { decideAction } from './game/ai';
import { evaluateBestHand } from './game/handEvaluator';

const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

const stageOrder: Stage[] = ['preflop', 'flop', 'turn', 'river', 'showdown', 'roundEnd', 'gameOver'];

const stageLabels: Record<Stage, string> = {
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  roundEnd: 'Fin de ronda',
  gameOver: 'Partida finalizada'
};

const createPlayers = (): PlayerState[] => [
  { id: 'p1', name: 'Tú', isHuman: true, chips: INITIAL_CHIPS, hand: [], folded: false, currentBet: 0, status: 'Esperando', isAllIn: false, isOut: false },
  { id: 'p2', name: 'Aurora', isHuman: false, chips: INITIAL_CHIPS, hand: [], folded: false, currentBet: 0, status: 'Esperando', isAllIn: false, isOut: false },
  { id: 'p3', name: 'Valko', isHuman: false, chips: INITIAL_CHIPS, hand: [], folded: false, currentBet: 0, status: 'Esperando', isAllIn: false, isOut: false },
  { id: 'p4', name: 'Zenith', isHuman: false, chips: INITIAL_CHIPS, hand: [], folded: false, currentBet: 0, status: 'Esperando', isAllIn: false, isOut: false }
];

const clonePlayers = (players: PlayerState[]) => players.map((player) => ({ ...player, hand: [...player.hand] }));

const findNextActive = (players: PlayerState[], startIndex: number, includeAllIn = false): number => {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (startIndex + offset) % players.length;
    const candidate = players[index];
    if (!candidate || candidate.isOut || candidate.folded) {
      continue;
    }
    if (!includeAllIn && (candidate.isAllIn || candidate.chips === 0)) {
      continue;
    }
    return index;
  }
  return -1;
};

const activeParticipants = (players: PlayerState[]) => players.filter((player) => !player.isOut && !player.folded);

const pushLog = (log: string[], entry: string): string[] => {
  const next = [...log, entry];
  return next.length > 120 ? next.slice(next.length - 120) : next;
};

const resetPlayerBets = (players: PlayerState[]): PlayerState[] =>
  players.map((player) => {
    if (player.isOut || player.folded) {
      return { ...player };
    }
    return { ...player, currentBet: 0, status: player.isAllIn ? 'All-in' : 'Esperando' };
  });

const getNextStage = (stage: Stage): Stage => {
  const index = stageOrder.indexOf(stage);
  return stageOrder[Math.min(index + 1, stageOrder.length - 1)];
};

const getStageAnnouncement = (stage: Stage): string => {
  switch (stage) {
    case 'preflop':
      return '¡Comienza la acción!';
    case 'flop':
      return 'Se descubre el flop';
    case 'turn':
      return 'Turn revelado';
    case 'river':
      return 'Última carta, el river';
    case 'showdown':
      return 'Showdown: se revelan las manos';
    default:
      return '';
  }
};

const prepareRound = (previousState?: GameState): GameState => {
  const previousPlayers = previousState ? previousState.players : undefined;
  const basePlayers = previousPlayers ? clonePlayers(previousPlayers) : createPlayers();

  const refreshedPlayers = basePlayers.map((player) => {
    const isOut = player.isOut || player.chips <= 0;
    return {
      ...player,
      hand: [],
      folded: isOut,
      isOut,
      currentBet: 0,
      status: isOut ? 'Eliminado' : 'Esperando',
      isAllIn: false
    };
  });

  const survivors = refreshedPlayers.filter((player) => !player.isOut);
  const previousDealer = previousState?.dealerIndex ?? refreshedPlayers.length - 1;
  const dealerIndex = survivors.length >= 2 ? (() => {
    let idx = previousDealer;
    for (let steps = 0; steps < refreshedPlayers.length; steps += 1) {
      idx = (idx + 1) % refreshedPlayers.length;
      if (!refreshedPlayers[idx].isOut) {
        return idx;
      }
    }
    return previousDealer;
  })() : previousDealer;

  if (survivors.length <= 1) {
    const winner = survivors[0];
    const finalLog = pushLog(previousState?.messageLog ?? [], winner ? `${winner.name} se queda con todas las fichas.` : 'La partida termina sin ganadores.');
    return {
      players: refreshedPlayers,
      deck: [],
      communityCards: [],
      pot: 0,
      stage: 'gameOver',
      activePlayerIndex: -1,
      dealerIndex,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      currentBet: 0,
      minimumRaise: BIG_BLIND,
      awaitingHumanAction: false,
      messageLog: finalLog,
      roundCount: previousState?.roundCount ?? 0,
      winnerSummary: winner ? `${winner.name} gana la partida.` : 'Fin del juego'
    };
  }

  let deck = shuffleDeck(createDeck());

  const activeIndexes = refreshedPlayers
    .map((player, index) => (!player.isOut ? index : -1))
    .filter((index) => index >= 0);

  for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
    for (const index of activeIndexes) {
      const draw = drawCards(deck, 1);
      refreshedPlayers[index].hand.push(draw.cards[0]);
      deck = draw.deck;
    }
  }

  let pot = 0;
  let currentBet = 0;

  const smallBlindIndex = findNextActive(refreshedPlayers, dealerIndex, true);
  const bigBlindIndex = smallBlindIndex >= 0 ? findNextActive(refreshedPlayers, smallBlindIndex, true) : -1;

  if (smallBlindIndex >= 0) {
    const smallBlindPlayer = refreshedPlayers[smallBlindIndex];
    const amount = Math.min(SMALL_BLIND, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= amount;
    smallBlindPlayer.currentBet = amount;
    pot += amount;
    if (smallBlindPlayer.chips === 0) {
      smallBlindPlayer.isAllIn = true;
      smallBlindPlayer.status = 'All-in (ciega pequeña)';
    } else {
      smallBlindPlayer.status = 'Ciega pequeña';
    }
  }

  if (bigBlindIndex >= 0) {
    const bigBlindPlayer = refreshedPlayers[bigBlindIndex];
    const amount = Math.min(BIG_BLIND, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= amount;
    bigBlindPlayer.currentBet = amount;
    pot += amount;
    currentBet = amount;
    if (bigBlindPlayer.chips === 0) {
      bigBlindPlayer.isAllIn = true;
      bigBlindPlayer.status = 'All-in (ciega grande)';
    } else {
      bigBlindPlayer.status = 'Ciega grande';
    }
  }

  const activePlayerIndex = bigBlindIndex >= 0 ? findNextActive(refreshedPlayers, bigBlindIndex) : -1;
  const awaitingHumanAction = activePlayerIndex >= 0 ? refreshedPlayers[activePlayerIndex].isHuman : false;

  const baseLog = previousState?.messageLog ?? [];
  const roundNumber = (previousState?.roundCount ?? 0) + 1;
  const messageLog = pushLog(baseLog, `— Ronda ${roundNumber} | Ciegas ${SMALL_BLIND}/${BIG_BLIND}`);

  return {
    players: refreshedPlayers,
    deck,
    communityCards: [],
    pot,
    stage: 'preflop',
    activePlayerIndex,
    dealerIndex,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    currentBet,
    minimumRaise: BIG_BLIND,
    awaitingHumanAction,
    messageLog: pushLog(messageLog, getStageAnnouncement('preflop')),
    roundCount: roundNumber,
    winnerSummary: undefined
  };
};

const calculateHighestBet = (players: PlayerState[]): number => players.reduce((acc, player) => Math.max(acc, player.currentBet), 0);

const resolveShowdown = (state: GameState) => {
  const players = clonePlayers(state.players);
  const contenders = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isOut && !player.folded);

  const evaluated = contenders.map(({ player, index }) => ({
    index,
    player,
    result: evaluateBestHand([...player.hand, ...state.communityCards])
  }));

  evaluated.sort((a, b) => b.result.score - a.result.score);
  const bestScore = evaluated[0].result.score;
  const winners = evaluated.filter((entry) => entry.result.score === bestScore);

  const share = Math.floor(state.pot / winners.length);
  let remainder = state.pot % winners.length;

  const messageEntries = pushLog(state.messageLog, 'Showdown finalizado.');
  let summary = '';

  winners.forEach((winner, position) => {
    const prize = share + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const player = players[winner.index];
    player.chips += prize;
    player.status = 'Ganador';
    const description = `${player.name} gana ${prize} fichas con ${winner.result.description}`;
    summary = summary ? `${summary} | ${description}` : description;
  });

  evaluated
    .filter((entry) => !winners.includes(entry))
    .forEach((entry) => {
      const player = players[entry.index];
      player.status = `Pierde (${entry.result.description})`;
    });

  const logWithHands = evaluated.reduce((acc, entry) => {
    const cards = entry.player.hand.map((card) => formatCard(card)).join(' ');
    return pushLog(acc, `${entry.player.name}: ${entry.result.description} [${cards}]`);
  }, messageEntries);

  return {
    ...state,
    players,
    pot: 0,
    stage: 'roundEnd' as Stage,
    activePlayerIndex: -1,
    awaitingHumanAction: false,
    messageLog: pushLog(logWithHands, summary),
    winnerSummary: summary,
    currentBet: 0,
    minimumRaise: state.bigBlind
  };
};

const awardSingleWinner = (state: GameState, winnerIndex: number): GameState => {
  const players = clonePlayers(state.players);
  const winner = players[winnerIndex];
  winner.chips += state.pot;
  winner.status = 'Ganador';
  const log = pushLog(state.messageLog, `${winner.name} gana el bote de ${state.pot} fichas sin mostrar cartas.`);
  const summary = `${winner.name} recoge ${state.pot} fichas.`;

  players.forEach((player, index) => {
    if (index !== winnerIndex && !player.isOut) {
      player.status = player.folded ? 'Se retiró' : player.status;
    }
  });

  return {
    ...state,
    players,
    pot: 0,
    stage: 'roundEnd',
    activePlayerIndex: -1,
    awaitingHumanAction: false,
    messageLog: pushLog(log, summary),
    winnerSummary: summary,
    currentBet: 0,
    minimumRaise: state.bigBlind
  };
};

const advanceStage = (state: GameState): GameState => {
  const nextStage = getNextStage(state.stage);
  if (nextStage === 'showdown') {
    return resolveShowdown(state);
  }

  let deck = [...state.deck];
  let communityCards = [...state.communityCards];

  if (nextStage === 'flop') {
    const draw = drawCards(deck, 3);
    communityCards = [...communityCards, ...draw.cards];
    deck = draw.deck;
  } else if (nextStage === 'turn' || nextStage === 'river') {
    const draw = drawCards(deck, 1);
    communityCards = [...communityCards, ...draw.cards];
    deck = draw.deck;
  }

  const players = resetPlayerBets(state.players);
  const announcement = getStageAnnouncement(nextStage);
  const messageLog = announcement ? pushLog(state.messageLog, announcement) : state.messageLog;

  const firstToAct = findNextActive(players, state.dealerIndex);
  const awaitingHumanAction = firstToAct >= 0 ? players[firstToAct].isHuman : false;
  const progressed: GameState = {
    ...state,
    stage: nextStage,
    deck,
    communityCards,
    players,
    currentBet: 0,
    minimumRaise: state.bigBlind,
    activePlayerIndex: firstToAct,
    awaitingHumanAction,
    messageLog
  };

  const canAct = players.some((player) => !player.isOut && !player.folded && !player.isAllIn && player.chips > 0);
  if (!canAct && nextStage !== 'showdown') {
    return advanceStage(progressed);
  }

  return progressed;
};

const useGame = () => {
  const [state, setState] = useState<GameState>(() => prepareRound());

  const progressAfterRound = useCallback(() => {
    setState((current) => {
      if (current.stage !== 'roundEnd') {
        return current;
      }
      return prepareRound(current);
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(prepareRound());
  }, []);

  const handleAction = useCallback((action: PlayerAction) => {
    setState((current) => {
      if (current.stage === 'gameOver' || current.stage === 'roundEnd') {
        return current;
      }

      const players = clonePlayers(current.players);
      const player = players[current.activePlayerIndex];
      if (!player || player.isOut || player.folded) {
        return current;
      }

      let pot = current.pot;
      let currentBet = current.currentBet;
      let minimumRaise = current.minimumRaise;
      let stage = current.stage;
      let communityCards = [...current.communityCards];
      let deck = [...current.deck];
      let awaitingHumanAction = false;
      let winnerSummary = current.winnerSummary;
      let messageLog = [...current.messageLog];

      const logAction = (entry: string) => {
        messageLog = pushLog(messageLog, entry);
      };

      if (action.type === 'fold') {
        player.folded = true;
        player.status = 'Se retira';
        logAction(`${player.name} se retira.`);
      } else if (action.type === 'check') {
        player.status = 'Pasa';
        logAction(`${player.name} pasa.`);
      } else if (action.type === 'call') {
        const desiredBet = Math.max(action.amount, player.currentBet);
        const difference = desiredBet - player.currentBet;
        const contribution = Math.min(difference, player.chips);
        player.chips -= contribution;
        player.currentBet += contribution;
        pot += contribution;
        if (player.chips === 0) {
          player.isAllIn = true;
          player.status = 'All-in';
        } else {
          player.status = 'Iguala';
        }
        currentBet = Math.max(currentBet, player.currentBet);
        logAction(`${player.name} iguala ${player.currentBet} fichas.`);
      } else if (action.type === 'raise') {
        const target = Math.max(action.amount, current.currentBet + current.minimumRaise);
        const raiseDifference = target - player.currentBet;
        const contribution = Math.min(raiseDifference, player.chips);
        player.chips -= contribution;
        player.currentBet += contribution;
        pot += contribution;
        currentBet = player.currentBet;
        minimumRaise = Math.max(current.bigBlind, target - current.currentBet);
        if (player.chips === 0) {
          player.isAllIn = true;
          player.status = 'All-in';
        } else {
          player.status = `Sube a ${player.currentBet}`;
        }
        logAction(`${player.name} sube a ${player.currentBet} fichas.`);
      }

      const remaining = activeParticipants(players);
      if (remaining.length === 1) {
        const winnerIndex = players.findIndex((candidate) => candidate.id === remaining[0].id);
        return awardSingleWinner({
          ...current,
          players,
          pot,
          currentBet,
          minimumRaise,
          stage,
          communityCards,
          deck,
          messageLog,
          winnerSummary
        }, winnerIndex);
      }

      const highestBet = calculateHighestBet(players);
      const playersNeedingAction = players.filter(
        (candidate) => !candidate.isOut && !candidate.folded && !candidate.isAllIn && candidate.chips > 0 && candidate.currentBet !== highestBet
      );

      if (playersNeedingAction.length === 0) {
        const progressed = advanceStage({
          ...current,
          players,
          pot,
          currentBet: highestBet,
          minimumRaise,
          stage,
          communityCards,
          deck,
          messageLog,
          winnerSummary,
          awaitingHumanAction: false,
          activePlayerIndex: current.activePlayerIndex
        });
        return progressed;
      }

      let nextIndex = -1;
      for (let offset = 1; offset <= players.length; offset += 1) {
        const index = (current.activePlayerIndex + offset) % players.length;
        const candidate = players[index];
        if (!candidate || candidate.isOut || candidate.folded || candidate.isAllIn || candidate.chips === 0) {
          continue;
        }
        if (candidate.currentBet !== highestBet) {
          nextIndex = index;
          break;
        }
      }

      if (nextIndex === -1) {
        const progressed = advanceStage({
          ...current,
          players,
          pot,
          currentBet: highestBet,
          minimumRaise,
          stage,
          communityCards,
          deck,
          messageLog,
          winnerSummary,
          awaitingHumanAction: false,
          activePlayerIndex: current.activePlayerIndex
        });
        return progressed;
      }

      awaitingHumanAction = players[nextIndex].isHuman;

      return {
        ...current,
        players,
        pot,
        currentBet: highestBet,
        minimumRaise,
        stage,
        communityCards,
        deck,
        messageLog,
        winnerSummary,
        activePlayerIndex: nextIndex,
        awaitingHumanAction
      };
    });
  }, []);

  useEffect(() => {
    if (state.stage === 'roundEnd') {
      const timeout = setTimeout(() => {
        progressAfterRound();
      }, 2200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [state.stage, progressAfterRound]);

  useEffect(() => {
    if (state.stage === 'gameOver') {
      return;
    }
    const activePlayer = state.players[state.activePlayerIndex];
    if (!activePlayer || activePlayer.isHuman || state.awaitingHumanAction) {
      return;
    }
    const timer = setTimeout(() => {
      const action = decideAction(state, activePlayer);
      handleAction(action);
    }, 1200);
    return () => clearTimeout(timer);
  }, [state, handleAction]);

  return { state, handleAction, resetGame };
};

const PlayingCard = ({ card, hidden }: { card: Card; hidden?: boolean }) => {
  if (hidden) {
    return <div className="playing-card back">Elite</div>;
  }
  const display = toDisplayCard(card);
  return (
    <div className="playing-card">
      <span className="rank" style={{ color: display.isRed ? '#ff9fb2' : '#e3fff3' }}>
        {display.rank}
      </span>
      <span className="suit" style={{ color: display.isRed ? '#ff9fb2' : '#73ffd1' }}>
        {display.suit}
      </span>
    </div>
  );
};

const PlayerPanel = ({
  player,
  isActive,
  reveal,
  isDealer
}: {
  player: PlayerState;
  isActive: boolean;
  reveal: boolean;
  isDealer: boolean;
}) => (
  <div className={clsx('player-card', { active: isActive })}>
    <div className="player-header">
      <div>
        <div className="player-name">{player.name}</div>
        <div className="player-role">{isDealer ? 'Button' : player.isHuman ? 'Jugador' : 'IA estratégica'}</div>
      </div>
      <div className="chip-stack">💰 {player.chips}</div>
    </div>
    <div className="hand-cards">
      {player.hand.map((card, index) => (
        <PlayingCard key={`${player.id}-${index}`} card={card} hidden={!player.isHuman && !reveal} />
      ))}
    </div>
    <div className={clsx('status-tag', { folded: player.folded || player.isOut })}>{player.status}</div>
  </div>
);

const ActionControls = ({
  state,
  onAction
}: {
  state: GameState;
  onAction: (action: PlayerAction) => void;
}) => {
  const player = state.players[state.activePlayerIndex];
  const callAmount = Math.max(0, state.currentBet - (player?.currentBet ?? 0));
  const maxRaise = player ? player.currentBet + player.chips : 0;
  const [raiseTarget, setRaiseTarget] = useState(state.currentBet + state.minimumRaise);

  useEffect(() => {
    setRaiseTarget(state.currentBet + state.minimumRaise);
  }, [state.currentBet, state.minimumRaise, player?.chips]);

  if (!player || !player.isHuman || player.folded || player.isOut || state.stage === 'roundEnd' || state.stage === 'gameOver') {
    return null;
  }

  const canRaise = player.chips + player.currentBet > Math.max(state.currentBet, state.currentBet + state.minimumRaise - 1);

  const raiseMin = Math.min(player.currentBet + Math.max(state.minimumRaise, state.bigBlind), maxRaise);
  const raiseMax = maxRaise;

  return (
    <div className="controls-panel">
      <h2>Tu turno</h2>
      <div className="controls-row">
        <button className="action-button danger" onClick={() => onAction({ type: 'fold' })}>
          Retirarse
        </button>
        <button className="action-button secondary" onClick={() => onAction(callAmount === 0 ? { type: 'check' } : { type: 'call', amount: player.currentBet + callAmount })}>
          {callAmount === 0 ? 'Pasar' : `Igualar ${callAmount}`}
        </button>
        <button
          className="action-button primary"
          disabled={!canRaise || raiseMax <= raiseMin}
          onClick={() => onAction({ type: 'raise', amount: Math.max(raiseTarget, raiseMin) })}
        >
          Subir a {Math.max(raiseTarget, raiseMin)}
        </button>
      </div>
      {canRaise && raiseMax > raiseMin && (
        <div className="slider-row">
          <label>Nivel de apuesta</label>
          <input
            type="range"
            min={raiseMin}
            max={raiseMax}
            step={Math.max(state.bigBlind, 5)}
            value={Math.min(Math.max(raiseTarget, raiseMin), raiseMax)}
            onChange={(event) => setRaiseTarget(Number(event.target.value))}
          />
        </div>
      )}
      <div className="info-bar">
        <span>Cantidad a igualar: {callAmount}</span>
        <span>Fichas disponibles: {player.chips}</span>
      </div>
    </div>
  );
};

const App = () => {
  const { state, handleAction, resetGame } = useGame();
  const revealHands = state.stage === 'showdown' || state.stage === 'roundEnd' || state.stage === 'gameOver';

  const infoBar = useMemo(() => {
    const entries = [
      `Etapa: ${stageLabels[state.stage]}`,
      `Bote: ${state.pot}`,
      `Ciegas: ${state.smallBlind}/${state.bigBlind}`
    ];
    if (state.winnerSummary) {
      entries.push(state.winnerSummary);
    }
    return entries;
  }, [state.stage, state.pot, state.smallBlind, state.bigBlind, state.winnerSummary]);

  return (
    <div className="app-shell">
      <div className="branding">
        <h1>Texas Hold'em Elite</h1>
        <span>Experiencia profesional de póker</span>
      </div>
      <div className="table-wrapper">
        <div className="table-surface">
          <div className="table-edge" />
          <div className="community-row">
            {state.communityCards.map((card, index) => (
              <PlayingCard key={`community-${index}`} card={card} />
            ))}
            {state.communityCards.length < 5 &&
              Array.from({ length: 5 - state.communityCards.length }).map((_, index) => (
                <div key={`placeholder-${index}`} className="playing-card back">
                  ★
                </div>
              ))}
          </div>
          <div className="players-grid">
            {state.players.map((player, index) => (
              <PlayerPanel
                key={player.id}
                player={player}
                isDealer={index === state.dealerIndex}
                isActive={index === state.activePlayerIndex && state.stage !== 'roundEnd' && state.stage !== 'gameOver'}
                reveal={revealHands}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="info-bar">
        {infoBar.map((entry) => (
          <span key={entry} className={entry.startsWith('Bote') ? 'pot-display' : undefined}>
            {entry}
          </span>
        ))}
      </div>
      {state.stage === 'gameOver' && (
        <div className="controls-panel">
          <h2>Partida finalizada</h2>
          <p>{state.winnerSummary}</p>
          <button className="action-button primary" onClick={resetGame}>
            Comenzar nueva partida
          </button>
        </div>
      )}
      <ActionControls state={state} onAction={handleAction} />
      <div className="log-panel">
        <h3>Registro</h3>
        {state.messageLog.slice(-12).map((entry, index) => (
          <div key={`${entry}-${index}`} className="log-entry">
            {entry}
          </div>
        ))}
        {state.stage === 'roundEnd' && state.winnerSummary && <div className="result-banner">{state.winnerSummary}</div>}
      </div>
    </div>
  );
};

export default App;

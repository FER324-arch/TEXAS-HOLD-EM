import { describe, expect, it } from 'vitest';
import { GameStateMachine } from './gameStateMachine';

describe('GameStateMachine', () => {
  it('follows standard progression', () => {
    const fsm = new GameStateMachine();
    expect(fsm.phase).toBe('waiting');
    fsm.advance({ type: 'PLAYER_JOINED' });
    expect(fsm.phase).toBe('seating');
    fsm.advance({ type: 'SEATS_READY' });
    expect(fsm.phase).toBe('handStart');
    fsm.advance({ type: 'START_HAND' });
    expect(fsm.phase).toBe('preflop');
    fsm.advance({ type: 'ROUND_COMPLETE' });
    expect(fsm.phase).toBe('flop');
  });

  it('throws on invalid transitions', () => {
    const fsm = new GameStateMachine();
    expect(() => fsm.advance({ type: 'ROUND_COMPLETE' })).toThrowError();
  });
});

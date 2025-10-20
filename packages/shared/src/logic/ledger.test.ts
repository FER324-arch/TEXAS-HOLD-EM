import { describe, expect, it } from 'vitest';
import { computeBalance, computeMonthlyPnL, LedgerEntryDTO } from './ledger';

describe('ledger', () => {
  const entries: LedgerEntryDTO[] = [
    { id: '1', accountId: 'user', type: 'DEPOSIT', amount: 1000, createdAt: '2024-04-01T00:00:00Z' },
    { id: '2', accountId: 'user', type: 'BUY_IN', amount: -200, createdAt: '2024-04-01T00:00:00Z' },
    { id: '3', accountId: 'user', type: 'WIN', amount: 500, createdAt: '2024-04-02T00:00:00Z' },
    { id: '4', accountId: 'user', type: 'RAKE', amount: -20, createdAt: '2024-04-02T00:00:00Z' }
  ];

  it('computes balance', () => {
    expect(computeBalance(entries)).toBe(1280);
  });

  it('computes pnl timeline', () => {
    const pnl = computeMonthlyPnL(entries);
    expect(pnl).toHaveLength(2);
    expect(pnl[0].pnl).toBeGreaterThan(0);
  });
});

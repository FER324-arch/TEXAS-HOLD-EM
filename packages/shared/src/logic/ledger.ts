export type LedgerType =
  | 'DEPOSIT'
  | 'WITHDRAW_TO_ADMIN'
  | 'BUY_IN'
  | 'CASH_OUT'
  | 'RAKE'
  | 'WIN'
  | 'LOSS'
  | 'ADJUSTMENT'
  | 'MINT'
  | 'BURN'
  | 'TRANSFER';

export interface LedgerEntryDTO {
  id: string;
  accountId: string;
  userId?: string;
  type: LedgerType;
  amount: number;
  createdAt: string;
}

export interface DailyPnLPoint {
  date: string;
  pnl: number;
}

const creditTypes: LedgerType[] = ['DEPOSIT', 'WIN', 'ADJUSTMENT', 'MINT', 'TRANSFER'];

export const computeBalance = (entries: LedgerEntryDTO[]): number =>
  entries.reduce((total, entry) => total + entry.amount, 0);

export const computeMonthlyPnL = (entries: LedgerEntryDTO[]): DailyPnLPoint[] => {
  const grouped = new Map<string, number>();
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10);
    const sign = creditTypes.includes(entry.type) ? 1 : -1;
    const value = grouped.get(date) ?? 0;
    grouped.set(date, value + sign * Math.abs(entry.amount));
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, pnl]) => ({ date, pnl }));
};

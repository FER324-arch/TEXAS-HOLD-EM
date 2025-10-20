export interface BetRecord {
  playerId: string;
  amount: number;
}

export interface SidePotResult {
  potAmount: number;
  eligiblePlayers: string[];
}

export const calculateSidePots = (bets: BetRecord[]): SidePotResult[] => {
  const filtered = bets.filter((bet) => bet.amount > 0);
  if (!filtered.length) return [];
  const sorted = [...filtered].sort((a, b) => a.amount - b.amount);
  const results: SidePotResult[] = [];
  let previous = 0;
  while (sorted.length) {
    const level = sorted[0].amount;
    const levelContribution = level - previous;
    const contributors = sorted.map((bet) => bet.playerId);
    const potAmount = levelContribution * sorted.length;
    results.push({ potAmount, eligiblePlayers: [...contributors] });
    previous = level;
    sorted.shift();
  }
  return results;
};

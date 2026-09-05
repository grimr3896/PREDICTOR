export type Outcome = '1' | 'X' | '2' | null;

export type GamePoolSize = number;

export interface GameItem {
  id: number;
  label: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime?: string;
  oddsHome?: string;
  oddsDraw?: string;
  oddsAway?: string;
  lockedOutcome: Outcome;
}

export interface CombinationStats {
  totalCombinations: number;
  lockedCount: number;
  unlockedCount: number;
  remainingCombinations: number;
  reductionPercentage: number;
}

export interface GeneratedCombination {
  index: number;
  code: string;
  outcomes: ('1' | 'X' | '2')[];
}

export type SingleOutcome = '1' | 'X' | '2';
export type Outcome = SingleOutcome | null;

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
  selectedOutcomes: SingleOutcome[];
  lockedOutcome: Outcome;
}

export interface CombinationStats {
  totalCombinations: number;
  lockedCount: number;
  doubleCount: number;
  unlockedCount: number;
  remainingCombinations: number;
  reductionPercentage: number;
}

export interface GeneratedCombination {
  index: number;
  code: string;
  outcomes: ('1' | 'X' | '2')[];
}

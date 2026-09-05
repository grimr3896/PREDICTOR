import { GameItem, Outcome, GeneratedCombination, CombinationStats } from '../types';

export const OUTCOME_MAP: Record<number, '1' | 'X' | '2'> = {
  0: '1',
  1: 'X',
  2: '2',
};

export const OUTCOME_NAMES: Record<'1' | 'X' | '2', string> = {
  '1': 'Home Win (1)',
  'X': 'Draw (X)',
  '2': 'Away Win (2)',
};

export function calculateStats(games: GameItem[]): CombinationStats {
  const total = Math.pow(3, games.length);
  const lockedCount = games.filter((g) => g.lockedOutcome !== null).length;
  const unlockedCount = games.length - lockedCount;
  const remainingCombinations = Math.pow(3, unlockedCount);
  const reductionPercentage =
    total > 0 ? ((total - remainingCombinations) / total) * 100 : 0;

  return {
    totalCombinations: total,
    lockedCount,
    unlockedCount,
    remainingCombinations,
    reductionPercentage,
  };
}

/**
 * Returns the combination at a specific 0-based index without storing the entire list in memory.
 */
export function getCombinationAtIndex(
  index: number,
  games: GameItem[],
  unlockedIndices: number[]
): GeneratedCombination {
  const outcomes: ('1' | 'X' | '2')[] = new Array(games.length);

  // Fill in locked games
  for (let i = 0; i < games.length; i++) {
    if (games[i].lockedOutcome !== null) {
      outcomes[i] = games[i].lockedOutcome as '1' | 'X' | '2';
    }
  }

  // Fill in unlocked games from ternary representation of index
  let remainder = index;
  for (let j = 0; j < unlockedIndices.length; j++) {
    const digit = remainder % 3;
    outcomes[unlockedIndices[j]] = OUTCOME_MAP[digit];
    remainder = Math.floor(remainder / 3);
  }

  const code = outcomes.join('');

  return {
    index: index + 1, // 1-based for user display
    code,
    outcomes,
  };
}

/**
 * Generates a single page of combinations on-the-fly.
 */
export function getPageCombinations(
  page: number,
  pageSize: number,
  totalRemaining: number,
  games: GameItem[]
): GeneratedCombination[] {
  const unlockedIndices: number[] = [];
  for (let i = 0; i < games.length; i++) {
    if (games[i].lockedOutcome === null) {
      unlockedIndices.push(i);
    }
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRemaining);

  const results: GeneratedCombination[] = [];
  for (let idx = startIndex; idx < endIndex; idx++) {
    results.push(getCombinationAtIndex(idx, games, unlockedIndices));
  }

  return results;
}

export interface CsvProgress {
  generated: number;
  total: number;
  percent: number;
  ratePerSec: number;
}

/**
 * Generates CSV in asynchronous chunks using Blob parts to minimize memory usage
 * and avoid freezing the main UI thread.
 */
export async function generateCsvBlob(
  games: GameItem[],
  totalRemaining: number,
  onProgress: (progress: CsvProgress) => void,
  shouldCancel: () => boolean
): Promise<Blob | null> {
  const unlockedIndices: number[] = [];
  for (let i = 0; i < games.length; i++) {
    if (games[i].lockedOutcome === null) {
      unlockedIndices.push(i);
    }
  }

  // Build CSV Header
  const headers = ['Combination #', 'Outcome Code'];
  games.forEach((g) => {
    const label = g.homeTeam && g.awayTeam 
      ? `"${g.label}: ${g.homeTeam} vs ${g.awayTeam}"`
      : `"${g.label}"`;
    headers.push(label);
  });
  const headerLine = headers.join(',') + '\r\n';

  const chunks: string[] = [headerLine];
  const CHUNK_SIZE = 25000; // Optimal batch size for string buffer and event loop yield
  let generated = 0;
  const startTime = performance.now();
  let lastProgressUpdate = startTime;

  // Pre-allocate outcomes array and pre-fill locked indices
  const currentOutcomes: ('1' | 'X' | '2')[] = new Array(games.length);
  for (let g = 0; g < games.length; g++) {
    if (games[g].lockedOutcome !== null) {
      currentOutcomes[g] = games[g].lockedOutcome as ('1' | 'X' | '2');
    }
  }

  const CHOICES: ('1' | 'X' | '2')[] = ['1', 'X', '2'];
  const numUnlocked = unlockedIndices.length;

  while (generated < totalRemaining) {
    if (shouldCancel()) {
      return null;
    }

    const batchEnd = Math.min(generated + CHUNK_SIZE, totalRemaining);
    let chunkString = '';

    for (let i = generated; i < batchEnd; i++) {
      let rem = i;
      for (let k = numUnlocked - 1; k >= 0; k--) {
        currentOutcomes[unlockedIndices[k]] = CHOICES[rem % 3];
        rem = Math.floor(rem / 3);
      }
      const code = currentOutcomes.join('');
      // Format: index, code, outcome1, outcome2, ...
      chunkString += `${i + 1},${code},${currentOutcomes.join(',')}\r\n`;
    }

    chunks.push(chunkString);
    generated = batchEnd;

    const now = performance.now();
    // Update progress at most every 100ms or on completion
    if (now - lastProgressUpdate > 100 || generated === totalRemaining) {
      const elapsedSec = (now - startTime) / 1000;
      const rate = elapsedSec > 0 ? Math.round(generated / elapsedSec) : 0;
      onProgress({
        generated,
        total: totalRemaining,
        percent: Math.min(100, Math.round((generated / totalRemaining) * 100)),
        ratePerSec: rate,
      });
      lastProgressUpdate = now;
    }

    // Yield control back to browser to process UI rendering and cancel clicks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
}

export const SAMPLE_TEAMS_17: { home: string; away: string }[] = [
  { home: 'Arsenal', away: 'Chelsea' },
  { home: 'Liverpool', away: 'Manchester City' },
  { home: 'Manchester United', away: 'Tottenham' },
  { home: 'Newcastle United', away: 'Aston Villa' },
  { home: 'Real Madrid', away: 'Barcelona' },
  { home: 'Atletico Madrid', away: 'Sevilla' },
  { home: 'Bayern Munich', away: 'Borussia Dortmund' },
  { home: 'Bayer Leverkusen', away: 'RB Leipzig' },
  { home: 'Inter Milan', away: 'AC Milan' },
  { home: 'Juventus', away: 'Napoli' },
  { home: 'Paris Saint-Germain', away: 'Marseille' },
  { home: 'Benfica', away: 'Sporting CP' },
  { home: 'Ajax', away: 'Feyenoord' },
  { home: 'Celtic', away: 'Rangers' },
  { home: 'Porto', away: 'Braga' },
  { home: 'Roma', away: 'Lazio' },
  { home: 'Brighton', away: 'West Ham' },
];

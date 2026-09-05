import { GameItem, Outcome, SingleOutcome, GeneratedCombination, CombinationStats } from '../types';

export const OUTCOME_MAP: Record<number, SingleOutcome> = {
  0: '1',
  1: 'X',
  2: '2',
};

export const OUTCOME_NAMES: Record<SingleOutcome, string> = {
  '1': 'Home Win (1)',
  'X': 'Draw (X)',
  '2': 'Away Win (2)',
};

/**
 * Returns the active allowed outcomes for a given game.
 * If 1 option selected: single lock (1 choice).
 * If 2 options selected: double chance (2 choices, e.g. ['1', 'X']).
 * If 0 or 3 options selected: all 3 outcomes allowed ('1', 'X', '2').
 */
export function getGameChoices(game: GameItem): SingleOutcome[] {
  if (game.selectedOutcomes && game.selectedOutcomes.length > 0 && game.selectedOutcomes.length < 3) {
    return game.selectedOutcomes;
  }
  if (game.lockedOutcome) {
    return [game.lockedOutcome];
  }
  return ['1', 'X', '2'];
}

export function calculateStats(games: GameItem[]): CombinationStats {
  const total = Math.pow(3, games.length);
  let lockedCount = 0;
  let doubleCount = 0;
  let unlockedCount = 0;
  let remainingCombinations = 1;

  for (const g of games) {
    const choices = getGameChoices(g);
    const count = choices.length;
    if (count === 1) {
      lockedCount++;
    } else if (count === 2) {
      doubleCount++;
    } else {
      unlockedCount++;
    }
    remainingCombinations *= count;
  }

  const reductionPercentage =
    total > 0 ? ((total - remainingCombinations) / total) * 100 : 0;

  return {
    totalCombinations: total,
    lockedCount,
    doubleCount,
    unlockedCount,
    remainingCombinations,
    reductionPercentage,
  };
}

/**
 * Returns the combination at a specific 0-based index without storing the entire list in memory.
 * Uses mixed-radix number decomposition for instant O(N) evaluation.
 */
export function getCombinationAtIndex(
  index: number,
  games: GameItem[],
  variableIndices: number[],
  gameChoicesList: SingleOutcome[][],
  gameChoiceCounts: number[]
): GeneratedCombination {
  const outcomes: SingleOutcome[] = new Array(games.length);

  // Fill in fixed single-choice games
  for (let i = 0; i < games.length; i++) {
    if (gameChoiceCounts[i] === 1) {
      outcomes[i] = gameChoicesList[i][0];
    }
  }

  // Decode variable games from mixed-radix representation of index
  let remainder = index;
  for (let j = variableIndices.length - 1; j >= 0; j--) {
    const gIdx = variableIndices[j];
    const base = gameChoiceCounts[gIdx];
    outcomes[gIdx] = gameChoicesList[gIdx][remainder % base];
    remainder = Math.floor(remainder / base);
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
  const gameChoicesList: SingleOutcome[][] = games.map((g) => getGameChoices(g));
  const gameChoiceCounts: number[] = gameChoicesList.map((c) => c.length);
  const variableIndices: number[] = [];

  for (let i = 0; i < games.length; i++) {
    if (gameChoiceCounts[i] > 1) {
      variableIndices.push(i);
    }
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRemaining);

  const results: GeneratedCombination[] = [];
  for (let idx = startIndex; idx < endIndex; idx++) {
    results.push(
      getCombinationAtIndex(
        idx,
        games,
        variableIndices,
        gameChoicesList,
        gameChoiceCounts
      )
    );
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
 * and avoid freezing the main UI thread. Supports mixed single, double, and triple choices.
 */
export async function generateCsvBlob(
  games: GameItem[],
  totalRemaining: number,
  onProgress: (progress: CsvProgress) => void,
  shouldCancel: () => boolean,
  maxRows?: number
): Promise<{ blob: Blob | null; actualRows: number }> {
  const gameChoicesList: SingleOutcome[][] = games.map((g) => getGameChoices(g));
  const gameChoiceCounts: number[] = gameChoicesList.map((c) => c.length);
  const variableIndices: number[] = [];

  for (let i = 0; i < games.length; i++) {
    if (gameChoiceCounts[i] > 1) {
      variableIndices.push(i);
    }
  }

  const effectiveTotal = maxRows ? Math.min(totalRemaining, maxRows) : totalRemaining;

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
  const CHUNK_SIZE = 10000; // Optimal batch size for string buffer and event loop yield
  let generated = 0;
  const startTime = performance.now();
  let lastProgressUpdate = startTime;

  // Pre-allocate outcomes array and pre-fill fixed games
  const currentOutcomes: SingleOutcome[] = new Array(games.length);
  for (let g = 0; g < games.length; g++) {
    if (gameChoiceCounts[g] === 1) {
      currentOutcomes[g] = gameChoicesList[g][0];
    }
  }

  const numVariables = variableIndices.length;

  while (generated < effectiveTotal) {
    if (shouldCancel()) {
      return { blob: null, actualRows: 0 };
    }

    const batchEnd = Math.min(generated + CHUNK_SIZE, effectiveTotal);
    const batchCount = batchEnd - generated;
    const batchLines = new Array(batchCount);
    let lineIdx = 0;

    for (let i = generated; i < batchEnd; i++) {
      let rem = i;
      for (let k = numVariables - 1; k >= 0; k--) {
        const gIdx = variableIndices[k];
        const base = gameChoiceCounts[gIdx];
        currentOutcomes[gIdx] = gameChoicesList[gIdx][rem % base];
        rem = Math.floor(rem / base);
      }
      const code = currentOutcomes.join('');
      // Format: index, code, outcome1, outcome2, ...
      batchLines[lineIdx++] = `${i + 1},${code},${currentOutcomes.join(',')}`;
    }

    chunks.push(batchLines.join('\r\n') + '\r\n');
    generated = batchEnd;

    const now = performance.now();
    // Update progress at most every 60ms or on completion
    if (now - lastProgressUpdate > 60 || generated === effectiveTotal) {
      const elapsedSec = (now - startTime) / 1000;
      const rate = elapsedSec > 0 ? Math.round(generated / elapsedSec) : 0;
      onProgress({
        generated,
        total: effectiveTotal,
        percent: Math.min(100, Math.round((generated / effectiveTotal) * 100)),
        ratePerSec: rate,
      });
      lastProgressUpdate = now;
    }

    // Yield control back to browser to process UI rendering, paint, and cancel clicks
    await new Promise((resolve) => setTimeout(resolve, 8));
  }

  if (shouldCancel()) {
    return { blob: null, actualRows: 0 };
  }

  const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
  return { blob, actualRows: effectiveTotal };
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

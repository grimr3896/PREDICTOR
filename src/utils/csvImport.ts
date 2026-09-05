import { GameItem } from '../types';

export const EXPECTED_HEADERS = [
  'game_number',
  'home_team',
  'away_team',
  'kickoff_time',
  'odds_home',
  'odds_draw',
  'odds_away',
] as const;

export const EXPECTED_HEADERS_STRING = EXPECTED_HEADERS.join(', ');

export interface CsvParseResult {
  success: boolean;
  games?: GameItem[];
  errorMessage?: string;
  warnings: string[];
  importedCount: number;
}

/**
 * Splits a CSV text into array of rows, properly handling quotes, delimiters (comma or semicolon), and newlines.
 */
export function parseCsvText(csvText: string): string[][] {
  // Detect delimiter based on first line
  const firstLine = csvText.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of CRLF
      }
      currentRow.push(currentField.trim());
      // Check if row is not completely empty
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push last field & row if pending
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses and validates CSV fixture file according to exact specifications.
 */
export function parseFixturesCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];
  const rows = parseCsvText(csvText);

  if (rows.length === 0) {
    return {
      success: false,
      errorMessage: `Invalid CSV format. Expected headers: ${EXPECTED_HEADERS_STRING}`,
      warnings: [],
      importedCount: 0,
    };
  }

  // Header Validation (exact header required in order, case-insensitive, trimmed, stripping BOM and quotes)
  const rawHeaders = rows[0];
  const cleanedHeaders = rawHeaders.map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/^[\uFEFF]/, '')
      .replace(/^"+|"+$/g, '')
      .trim()
  );

  const headersMatch =
    cleanedHeaders.length >= EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((expected, index) => cleanedHeaders[index] === expected);

  if (!headersMatch) {
    return {
      success: false,
      errorMessage: `Invalid CSV format. Expected headers: ${EXPECTED_HEADERS_STRING}`,
      warnings: [],
      importedCount: 0,
    };
  }

  const seenGameNumbers = new Set<number>();
  const parsedGames: GameItem[] = [];

  // Data rows start from index 1 (line 2)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1; // 1-based line number in file

    // Check if entire row is empty
    if (row.every((c) => !c || c.trim() === '')) {
      continue;
    }

    const rawGameNumber = row[0]?.trim() ?? '';
    const homeTeam = row[1]?.trim() ?? '';
    const awayTeam = row[2]?.trim() ?? '';
    const kickoffTime = row[3]?.trim() ?? '';
    const oddsHome = row[4]?.trim() ?? '';
    const oddsDraw = row[5]?.trim() ?? '';
    const oddsAway = row[6]?.trim() ?? '';

    // Required fields check: game_number, home_team, away_team
    if (!rawGameNumber) {
      warnings.push(`Row ${rowNumber} skipped: missing game_number`);
      continue;
    }

    const gameNumber = parseInt(rawGameNumber, 10);
    if (isNaN(gameNumber) || gameNumber <= 0) {
      warnings.push(`Row ${rowNumber} skipped: invalid game_number "${rawGameNumber}"`);
      continue;
    }

    if (!homeTeam) {
      warnings.push(`Row ${rowNumber} skipped: missing home_team`);
      continue;
    }

    if (!awayTeam) {
      warnings.push(`Row ${rowNumber} skipped: missing away_team`);
      continue;
    }

    // Duplicate game_number check: keep first occurrence
    if (seenGameNumbers.has(gameNumber)) {
      warnings.push(
        `Row ${rowNumber}: Duplicate game_number ${gameNumber} ignored (kept first occurrence)`
      );
      continue;
    }

    seenGameNumbers.add(gameNumber);

    parsedGames.push({
      id: gameNumber,
      label: `Game ${gameNumber}`,
      homeTeam,
      awayTeam,
      kickoffTime: kickoffTime || undefined,
      oddsHome: oddsHome || undefined,
      oddsDraw: oddsDraw || undefined,
      oddsAway: oddsAway || undefined,
      selectedOutcomes: [],
      lockedOutcome: null, // "Not sure" (unlocked) by default
    });
  }

  if (parsedGames.length === 0) {
    return {
      success: false,
      errorMessage: 'No valid game rows found in CSV file.',
      warnings,
      importedCount: 0,
    };
  }

  // Sort games by game_number ascending
  parsedGames.sort((a, b) => a.id - b.id);

  // Pool size warning if count is not 13 or 17
  if (parsedGames.length !== 13 && parsedGames.length !== 17) {
    warnings.push(
      `Imported ${parsedGames.length} games. Note: Standard jackpot pools typically consist of 13 or 17 games.`
    );
  }

  return {
    success: true,
    games: parsedGames,
    warnings,
    importedCount: parsedGames.length,
  };
}

/**
 * Downloads a sample CSV template with correct headers and 2 filled example rows.
 * Uses robust download technique with delayed URL revocation to avoid "Failed - Network error".
 */
export function downloadCsvTemplate(): void {
  const content =
    'game_number,home_team,away_team,kickoff_time,odds_home,odds_draw,odds_away\r\n' +
    '1,Rayo Vallecano,Racing Santander,19:30,2.25,3.50,3.25\r\n' +
    '5,Everton,Manchester United,16:00,3.05,3.45,2.25\r\n';

  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jackpot_fixtures_template.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  } catch {
    // Fallback using encoded URI
    const encoded = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = 'jackpot_fixtures_template.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 1000);
  }
}

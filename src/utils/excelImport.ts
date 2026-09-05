import { GameItem } from '../types';
import { EXPECTED_HEADERS, EXPECTED_HEADERS_STRING, CsvParseResult } from './csvImport';

// TypeScript declaration for global SheetJS (XLSX)
declare global {
  interface Window {
    XLSX?: any;
  }
}

/**
 * Returns the global XLSX instance or loads it dynamically from CDN if not yet ready.
 */
export async function getXLSX(): Promise<any> {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window environment not found'));
    }

    if (window.XLSX) {
      return resolve(window.XLSX);
    }

    const existingScript = document.querySelector('script[src*="xlsx"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.XLSX));
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load SheetJS library from CDN.'))
      );
      setTimeout(() => {
        if (window.XLSX) {
          resolve(window.XLSX);
        } else {
          reject(new Error('Timeout loading SheetJS library from CDN.'));
        }
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('Failed to load SheetJS library from CDN.'));
    document.head.appendChild(script);
  });
}

/**
 * Parses and validates an Excel workbook (.xlsx / .xls) using SheetJS.
 * - Reads first sheet only
 * - Converts to raw rows with { header: 1 }
 * - Validates header row
 * - Reuses exact game mapping and validation logic as CSV importer
 */
export async function parseFixturesExcel(arrayBuffer: ArrayBuffer): Promise<CsvParseResult> {
  const warnings: string[] = [];

  let XLSX: any;
  try {
    XLSX = await getXLSX();
  } catch (err) {
    return {
      success: false,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Failed to initialize Excel parser (SheetJS). Please check your internet connection.',
      warnings: [],
      importedCount: 0,
    };
  }

  let workbook: any;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (err) {
    return {
      success: false,
      errorMessage: `Could not read Excel file: ${err instanceof Error ? err.message : 'Corrupted or unreadable format'}`,
      warnings: [],
      importedCount: 0,
    };
  }

  // 1. Use the first sheet in the workbook
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      success: false,
      errorMessage: 'Excel file contains no worksheets.',
      warnings: [],
      importedCount: 0,
    };
  }

  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    return {
      success: false,
      errorMessage: 'First sheet in Excel workbook is empty or invalid.',
      warnings: [],
      importedCount: 0,
    };
  }

  // 2. Convert to 2D array of rows including header
  const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      errorMessage: `Invalid Excel format. Expected headers: ${EXPECTED_HEADERS_STRING}`,
      warnings: [],
      importedCount: 0,
    };
  }

  // 3. Header row validation (case-insensitive, trimmed, stripping BOM and quotes)
  const headerRow = rawRows[0] || [];
  const cleanedHeaders = headerRow.map((h: any) =>
    String(h ?? '')
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
      errorMessage: `Invalid Excel format. Expected headers: ${EXPECTED_HEADERS_STRING}`,
      warnings: [],
      importedCount: 0,
    };
  }

  // 4. Map remaining rows into the internal GameItem data structure
  const seenGameNumbers = new Set<number>();
  const parsedGames: GameItem[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const rowNumber = r + 1; // 1-based spreadsheet row number (row 1 is header)

    // Check if entire row is empty
    if (row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }

    const rawGameNumber = String(row[0] ?? '').trim();
    const homeTeam = String(row[1] ?? '').trim();
    const awayTeam = String(row[2] ?? '').trim();
    const kickoffTime = String(row[3] ?? '').trim();
    const oddsHome = String(row[4] ?? '').trim();
    const oddsDraw = String(row[5] ?? '').trim();
    const oddsAway = String(row[6] ?? '').trim();

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

    // Duplicate game_number check: keep first occurrence, warn about duplicate
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
      lockedOutcome: null, // "Not sure" (unlocked) by default
    });
  }

  if (parsedGames.length === 0) {
    return {
      success: false,
      errorMessage: 'No valid game rows found in Excel file.',
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
 * Generates and downloads a blank .xlsx Excel template client-side using SheetJS.
 * Contains the required header row and 2 example rows.
 */
export async function downloadExcelTemplate(): Promise<void> {
  const XLSX = await getXLSX();

  const exampleData = [
    {
      game_number: 1,
      home_team: 'Rayo Vallecano',
      away_team: 'Racing Santander',
      kickoff_time: '19:30',
      odds_home: 2.25,
      odds_draw: 3.50,
      odds_away: 3.25,
    },
    {
      game_number: 5,
      home_team: 'Everton',
      away_team: 'Manchester United',
      kickoff_time: '16:00',
      odds_home: 3.05,
      odds_draw: 3.45,
      odds_away: 2.25,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData, {
    header: [...EXPECTED_HEADERS],
  });

  // Set nice column widths for Excel
  ws['!cols'] = [
    { wch: 14 }, // game_number
    { wch: 22 }, // home_team
    { wch: 22 }, // away_team
    { wch: 14 }, // kickoff_time
    { wch: 12 }, // odds_home
    { wch: 12 }, // odds_draw
    { wch: 12 }, // odds_away
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fixtures');

  // Trigger download client-side safely
  try {
    XLSX.writeFile(wb, 'jackpot_fixtures_template.xlsx');
  } catch {
    // Fallback using Blob & URL
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jackpot_fixtures_template.xlsx';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  }
}

import React, { useState, useMemo, useRef } from 'react';
import { Upload, FileDown, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { GameItem, GamePoolSize, Outcome } from './types';
import { calculateStats, SAMPLE_TEAMS_17 } from './utils/combinationLogic';
import { parseFixturesCsv, downloadCsvTemplate } from './utils/csvImport';
import { parseFixturesExcel, downloadExcelTemplate } from './utils/excelImport';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { GameRow } from './components/GameRow';
import { CombinationTable } from './components/CombinationTable';
import { ExportModal } from './components/ExportModal';
import { ImportNotification } from './components/ImportNotification';

function createInitialGames(count: GamePoolSize): GameItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    label: `Game ${i + 1}`,
    homeTeam: '',
    awayTeam: '',
    lockedOutcome: null,
  }));
}

export default function App() {
  const [poolSize, setPoolSize] = useState<GamePoolSize>(13);
  const [games, setGames] = useState<GameItem[]>(() => createInitialGames(13));
  const [showTable, setShowTable] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalFormat, setExportModalFormat] = useState<'csv' | 'excel'>('csv');
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    warnings?: string[];
  } | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenExport = (format: 'csv' | 'excel' = 'csv') => {
    setExportModalFormat(format);
    setIsExportModalOpen(true);
  };

  // Compute stats in real-time
  const stats = useMemo(() => {
    return calculateStats(games);
  }, [games]);

  // Handle switching pool size (13 vs 17)
  const handlePoolSizeChange = (newSize: GamePoolSize) => {
    setPoolSize(newSize);
    setGames((prevGames) => {
      const result: GameItem[] = [];
      for (let i = 0; i < newSize; i++) {
        if (i < prevGames.length) {
          result.push({
            ...prevGames[i],
            id: i + 1,
            label: `Game ${i + 1}`,
          });
        } else {
          result.push({
            id: i + 1,
            label: `Game ${i + 1}`,
            homeTeam: '',
            awayTeam: '',
            lockedOutcome: null,
          });
        }
      }
      return result;
    });
  };

  // Lock or unlock an outcome for a specific game
  const handleOutcomeChange = (id: number, outcome: Outcome) => {
    setGames((prev) =>
      prev.map((game) =>
        game.id === id ? { ...game, lockedOutcome: outcome } : game
      )
    );
  };

  // Update team names
  const handleTeamChange = (
    id: number,
    field: 'homeTeam' | 'awayTeam',
    value: string
  ) => {
    setGames((prev) =>
      prev.map((game) =>
        game.id === id ? { ...game, [field]: value } : game
      )
    );
  };

  // Reset all games to unlocked
  const handleResetAll = () => {
    setGames((prev) =>
      prev.map((g) => ({
        ...g,
        lockedOutcome: null,
      }))
    );
  };

  // Load sample fixtures
  const handleLoadSampleMatches = () => {
    setGames((prev) =>
      prev.map((g, idx) => {
        const sample = SAMPLE_TEAMS_17[idx % SAMPLE_TEAMS_17.length];
        return {
          ...g,
          homeTeam: sample ? sample.home : '',
          awayTeam: sample ? sample.away : '',
        };
      })
    );
  };

  // Quick lock 5 games with sample outcomes to illustrate the filter
  const handleRandomLock = () => {
    const outcomes: Outcome[] = ['1', 'X', '2'];
    setGames((prev) =>
      prev.map((g, idx) => {
        if (idx < 5) {
          const picked = outcomes[idx % outcomes.length];
          return { ...g, lockedOutcome: picked };
        }
        return g;
      })
    );
  };

  const handleGenerate = () => {
    setShowTable(true);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setImportNotification({
        type: 'error',
        message: 'Unsupported file format. Please upload a .csv, .xlsx, or .xls file.',
      });
      return;
    }

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            setImportNotification({
              type: 'error',
              message: 'Failed to read Excel file data.',
            });
            return;
          }
          const result = await parseFixturesExcel(arrayBuffer);
          if (!result.success) {
            setImportNotification({
              type: 'error',
              message: result.errorMessage || 'Failed to parse Excel file.',
            });
          } else if (result.games) {
            setGames(result.games);
            setPoolSize(result.games.length);
            setImportNotification({
              type: 'success',
              message: `${result.importedCount} games imported successfully from Excel`,
              warnings: result.warnings,
            });
          }
        } catch (err) {
          setImportNotification({
            type: 'error',
            message: `Error processing Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      };
      reader.onerror = () => {
        setImportNotification({
          type: 'error',
          message: 'Error reading the Excel file. Please try again.',
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV import
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        const result = parseFixturesCsv(text);
        if (!result.success) {
          setImportNotification({
            type: 'error',
            message: result.errorMessage || 'Failed to parse CSV.',
          });
        } else if (result.games) {
          setGames(result.games);
          setPoolSize(result.games.length);
          setImportNotification({
            type: 'success',
            message: `${result.importedCount} games imported successfully from CSV`,
            warnings: result.warnings,
          });
        }
      };
      reader.onerror = () => {
        setImportNotification({
          type: 'error',
          message: 'Error reading the CSV file. Please try again.',
        });
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Hidden file input for CSV & Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        id="fixtures-file-input"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelected(file);
          }
          e.target.value = '';
        }}
      />

      {/* Top Navigation */}
      <Header
        poolSize={poolSize}
        onPoolSizeChange={handlePoolSizeChange}
        onResetAll={handleResetAll}
        onLoadSampleMatches={handleLoadSampleMatches}
        onRandomLock={handleRandomLock}
        lockedCount={stats.lockedCount}
        onImportClick={handleImportClick}
        onDownloadCsvTemplate={downloadCsvTemplate}
        onDownloadExcelTemplate={downloadExcelTemplate}
      />

      {/* Prominent Live Calculation Counter & Key Metrics */}
      <StatsBar
        stats={stats}
        poolSize={poolSize}
        onGenerate={handleGenerate}
        onOpenExport={handleOpenExport}
        onResetAll={handleResetAll}
        isGeneratedViewActive={showTable}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Section 1: Game Setup and Outcome Matrix */}
          <div
            id="fixtures-setup-card"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white border rounded-2xl p-4 sm:p-6 shadow-xs transition-all duration-200 ${
              isDragging
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/10 scale-[1.002]'
                : 'border-zinc-200'
            }`}
          >
            {/* Import Notification Banner if any */}
            {importNotification && (
              <ImportNotification
                type={importNotification.type}
                message={importNotification.message}
                warnings={importNotification.warnings}
                onDismiss={() => setImportNotification(null)}
              />
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                    Jackpot Matches Setup
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {poolSize} Matches
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Select <strong className="text-emerald-700">1</strong> (Home),{' '}
                  <strong className="text-amber-700">X</strong> (Draw), or{' '}
                  <strong className="text-sky-700">2</strong> (Away) to lock a game. Leave on{' '}
                  <strong className="text-zinc-700">Not sure</strong> to generate all 3 possibilities.
                </p>
              </div>

              {/* Action Toolbar & Legend */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Reset all locks & Fixture Import Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="fixtures-reset-all-locks-btn"
                    onClick={handleResetAll}
                    disabled={stats.lockedCount === 0}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      stats.lockedCount > 0
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border-rose-300 cursor-pointer shadow-xs'
                        : 'text-zinc-400 bg-zinc-50 border-zinc-200 opacity-40 cursor-not-allowed'
                    }`}
                    title="Clear every locked game back to Not sure"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Reset all locks</span>
                  </button>

                  <button
                    type="button"
                    id="import-fixtures-btn"
                    onClick={handleImportClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Import fixtures from a CSV or Excel (.xlsx / .xls) file"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Import Fixtures (.csv, .xlsx)</span>
                  </button>

                  <button
                    type="button"
                    id="download-csv-template-btn"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
                    title="Download blank CSV template with example rows"
                  >
                    <FileDown className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Download CSV template</span>
                  </button>

                  <button
                    type="button"
                    id="download-excel-template-btn"
                    onClick={downloadExcelTemplate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    title="Download blank Excel (.xlsx) template with example rows"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Excel template</span>
                  </button>
                </div>

                {/* Legend */}
                <div className="hidden sm:flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    1 = Home
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    X = Draw
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    2 = Away
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-600 font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    ? = Unlocked
                  </span>
                </div>
              </div>
            </div>

            {/* List of Game Rows */}
            <div className="space-y-2.5">
              {games.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  onOutcomeChange={handleOutcomeChange}
                  onTeamChange={handleTeamChange}
                />
              ))}
            </div>

            {/* Bottom bar inside card for quick action */}
            <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">
                {stats.lockedCount === 0 ? (
                  <span>All games are currently unlocked (3<sup>{poolSize}</sup> = {stats.totalCombinations.toLocaleString()} combinations).</span>
                ) : (
                  <span>
                    Fixed <strong className="text-zinc-800">{stats.lockedCount}</strong> games. Remaining <strong className="text-emerald-700">{stats.unlockedCount}</strong> unlocked games produce 3<sup>{stats.unlockedCount}</sup> = <strong className="text-emerald-700">{stats.remainingCombinations.toLocaleString()}</strong> combinations.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  id="view-paginated-table-btn"
                  onClick={handleGenerate}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs transition-colors cursor-pointer"
                >
                  View Paginated Table
                </button>
                <button
                  type="button"
                  id="bottom-download-csv-btn"
                  onClick={() => handleOpenExport('csv')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-colors cursor-pointer"
                  title="Export combinations to CSV"
                >
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  id="bottom-export-excel-btn"
                  onClick={() => handleOpenExport('excel')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 shadow-xs transition-colors cursor-pointer"
                  title="Export combinations as Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Export as Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Combinations Paginated Table & Code Breakdown */}
          {showTable && (
            <div ref={tableRef}>
              <CombinationTable
                games={games}
                totalRemaining={stats.remainingCombinations}
                onOpenExport={handleOpenExport}
              />
            </div>
          )}
        </div>
      </main>

      {/* CSV / Excel Export Modal with streaming progress indicator */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        games={games}
        totalRemaining={stats.remainingCombinations}
        initialFormat={exportModalFormat}
      />

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-zinc-200 bg-white text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-zinc-700">Jackpot Combination Generator</p>
          <p className="mt-1 text-zinc-400">
            Zero-dependency client-side generator. Supports 13-game and 17-game football pools (Totoloto / Mega Jackpot / Toto 15).
          </p>
        </div>
      </footer>
    </div>
  );
}

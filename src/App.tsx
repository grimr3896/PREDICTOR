import React, { useState, useMemo, useRef } from 'react';
import { GameItem, GamePoolSize, Outcome } from './types';
import { calculateStats, SAMPLE_TEAMS_17 } from './utils/combinationLogic';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { GameRow } from './components/GameRow';
import { CombinationTable } from './components/CombinationTable';
import { ExportModal } from './components/ExportModal';


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
  const tableRef = useRef<HTMLDivElement>(null);

  // Compute stats in real-time
  const stats = useMemo(() => {
    return calculateStats(games);
  }, [games]);

  // Handle switching pool size (13 vs 17)
  const handlePoolSizeChange = (newSize: GamePoolSize) => {
    if (newSize === poolSize) return;
    setPoolSize(newSize);
    setGames((prevGames) => {
      if (newSize > prevGames.length) {
        // Expand
        const addition = Array.from(
          { length: newSize - prevGames.length },
          (_, i) => ({
            id: prevGames.length + i + 1,
            label: `Game ${prevGames.length + i + 1}`,
            homeTeam: '',
            awayTeam: '',
            lockedOutcome: null,
          })
        );
        return [...prevGames, ...addition];
      } else {
        // Shrink to 13
        return prevGames.slice(0, newSize);
      }
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation */}
      <Header
        poolSize={poolSize}
        onPoolSizeChange={handlePoolSizeChange}
        onResetAll={handleResetAll}
        onLoadSampleMatches={handleLoadSampleMatches}
        onRandomLock={handleRandomLock}
        lockedCount={stats.lockedCount}
      />

      {/* Prominent Live Calculation Counter & Key Metrics */}
      <StatsBar
        stats={stats}
        poolSize={poolSize}
        onGenerate={handleGenerate}
        onOpenExport={() => setIsExportModalOpen(true)}
        isGeneratedViewActive={showTable}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Section 1: Game Setup and Outcome Matrix */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <span>Jackpot Matches Setup</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                    {poolSize} Matches
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Select <strong className="text-emerald-700">1</strong> (Home),{' '}
                  <strong className="text-amber-700">X</strong> (Draw), or{' '}
                  <strong className="text-sky-700">2</strong> (Away) to lock a game. Leave on{' '}
                  <strong className="text-zinc-700">Not sure</strong> to generate all 3 possibilities.
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  1 = Home
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  X = Draw
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  2 = Away
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  ? = 3 choices
                </span>
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

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs transition-colors cursor-pointer"
                >
                  View Paginated Table
                </button>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Download CSV
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
                onOpenExport={() => setIsExportModalOpen(true)}
              />
            </div>
          )}
        </div>
      </main>

      {/* CSV Export Modal with streaming progress indicator */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        games={games}
        totalRemaining={stats.remainingCombinations}
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

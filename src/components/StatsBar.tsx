import React, { useState } from 'react';
import { Layers, Lock, Unlock, Download, Play, TrendingDown, DollarSign } from 'lucide-react';
import { CombinationStats } from '../types';

interface StatsBarProps {
  stats: CombinationStats;
  poolSize: number;
  onGenerate: () => void;
  onOpenExport: () => void;
  isGeneratedViewActive: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  poolSize,
  onGenerate,
  onOpenExport,
  isGeneratedViewActive,
}) => {
  const [stakePerCombo, setStakePerCombo] = useState<number>(1);
  const [currency, setCurrency] = useState<string>('$');

  const formattedRemaining = stats.remainingCombinations.toLocaleString();
  const formattedTotal = stats.totalCombinations.toLocaleString();
  const totalCost = stats.remainingCombinations * stakePerCombo;

  // Warning state if over 5 million
  const isExtremelyLarge = stats.remainingCombinations > 5000000;
  const isLarge = stats.remainingCombinations > 10000;

  return (
    <section className="bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Live Counter Hero Banner */}
        <div className="bg-zinc-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-zinc-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Counter info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Calculation
                </span>
                <span className="text-xs text-zinc-400">
                  {stats.lockedCount} of {poolSize} games fixed
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  id="live-combination-count"
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono"
                >
                  {formattedRemaining}
                </span>
                <span className="text-sm font-medium text-zinc-300">
                  combinations remaining
                </span>
                {stats.reductionPercentage > 0 && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60 inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {stats.reductionPercentage.toFixed(2)}% filtered
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400">
                Out of <span className="font-mono text-zinc-200">{formattedTotal}</span> total unfiltered possibilities (3<sup>{poolSize}</sup>).
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                id="generate-combinations-btn"
                onClick={onGenerate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 shadow-md transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>{isGeneratedViewActive ? 'Refresh Combinations' : 'Generate Combinations'}</span>
              </button>

              <button
                type="button"
                id="download-csv-top-btn"
                onClick={onOpenExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-white border border-zinc-700 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download as CSV</span>
              </button>
            </div>
          </div>

          {/* Quick breakdown metrics row */}
          <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-700/50">
              <div className="text-zinc-400 flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Locked Games</span>
              </div>
              <div className="text-base font-bold text-zinc-100 font-mono">
                {stats.lockedCount} <span className="text-xs font-normal text-zinc-400">/ {poolSize}</span>
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-700/50">
              <div className="text-zinc-400 flex items-center gap-1.5 mb-1">
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlocked Games</span>
              </div>
              <div className="text-base font-bold text-zinc-100 font-mono">
                {stats.unlockedCount} <span className="text-xs font-normal text-zinc-400">(3<sup>{stats.unlockedCount}</sup>)</span>
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-700/50">
              <div className="text-zinc-400 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Render Mode</span>
              </div>
              <div className="text-base font-bold text-zinc-100">
                {isLarge ? 'Paginated (100/p)' : 'Instant View'}
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-700/50">
              <div className="text-zinc-400 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Est. Stake ({currency}{stakePerCombo}/slip)</span>
              </div>
              <div className="text-base font-bold text-zinc-100 font-mono truncate" title={`${currency}${totalCost.toLocaleString()}`}>
                {currency}{totalCost > 1000000000 ? `${(totalCost / 1000000000).toFixed(1)}B` : totalCost.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Warning if combination count is > 5,000,000 */}
        {isExtremelyLarge && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <span className="font-semibold">Large Combination Volume:</span> With {stats.unlockedCount} unlocked games, there are {formattedRemaining} combinations. Generating a full CSV of this size will produce a multi-hundred MB file. For best efficiency, consider locking a few more games before exporting.
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

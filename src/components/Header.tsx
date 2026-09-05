import React from 'react';
import { Sparkles, RotateCcw, Shuffle } from 'lucide-react';
import { GamePoolSize } from '../types';

interface HeaderProps {
  poolSize: GamePoolSize;
  onPoolSizeChange: (size: GamePoolSize) => void;
  onResetAll: () => void;
  onLoadSampleMatches: () => void;
  onRandomLock: () => void;
  lockedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  poolSize,
  onPoolSizeChange,
  onResetAll,
  onLoadSampleMatches,
  onRandomLock,
  lockedCount,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <span className="text-base tracking-tighter">1X2</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight leading-none">
                Jackpot Combination Generator
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Filter &amp; export full 1X2 football pool combinations with live math
              </p>
            </div>
          </div>

          {/* Controls: Pool size selector & Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pool Size Segmented Control */}
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
              <button
                type="button"
                id="pool-size-13-btn"
                onClick={() => onPoolSizeChange(13)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  poolSize === 13
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                13 Games <span className="text-[11px] font-normal opacity-70">(Midweek)</span>
              </button>
              <button
                type="button"
                id="pool-size-17-btn"
                onClick={() => onPoolSizeChange(17)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  poolSize === 17
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                17 Games <span className="text-[11px] font-normal opacity-70">(Mega)</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="sample-matches-btn"
                onClick={onLoadSampleMatches}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors"
                title="Load realistic top-tier football matchups"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Sample Matches</span>
              </button>

              <button
                type="button"
                id="random-lock-btn"
                onClick={onRandomLock}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors"
                title="Randomly lock 5 high-confidence games"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Lock 5</span>
              </button>

              <button
                type="button"
                id="reset-all-btn"
                onClick={onResetAll}
                disabled={lockedCount === 0}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                  lockedCount > 0
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 cursor-pointer'
                    : 'text-zinc-400 bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed'
                }`}
                title="Unlock every game"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

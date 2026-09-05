import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { GameItem, Outcome } from '../types';

interface GameRowProps {
  game: GameItem;
  onOutcomeChange: (id: number, outcome: Outcome) => void;
  onTeamChange: (id: number, field: 'homeTeam' | 'awayTeam', value: string) => void;
}

export const GameRow: React.FC<GameRowProps> = ({
  game,
  onOutcomeChange,
  onTeamChange,
}) => {
  const isLocked = game.lockedOutcome !== null;

  // Outcome color mappings for the active locked state
  const getRowContainerClasses = () => {
    if (!isLocked) {
      return 'bg-white border-zinc-200 hover:border-zinc-300';
    }
    switch (game.lockedOutcome) {
      case '1':
        return 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300/60 shadow-xs';
      case 'X':
        return 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60 shadow-xs';
      case '2':
        return 'bg-sky-50/40 border-sky-300 ring-1 ring-sky-300/60 shadow-xs';
      default:
        return 'bg-white border-zinc-200';
    }
  };

  const handleOutcomeClick = (outcome: Outcome) => {
    // If clicking the current locked outcome, toggle back to unlocked / Not sure
    if (game.lockedOutcome === outcome) {
      onOutcomeChange(game.id, null);
    } else {
      onOutcomeChange(game.id, outcome);
    }
  };

  return (
    <div
      id={`game-row-${game.id}`}
      className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 ${getRowContainerClasses()}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Game Label & Team Names */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          {/* Game Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-lg border font-mono ${
                isLocked
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              #{game.id < 10 ? `0${game.id}` : game.id}
            </span>
            <span className="text-xs font-semibold text-zinc-900 sm:hidden">
              {game.label}
            </span>
          </div>

          {/* Optional Team inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
            <div className="relative">
              <input
                type="text"
                id={`game-${game.id}-home-team`}
                value={game.homeTeam}
                onChange={(e) => onTeamChange(game.id, 'homeTeam', e.target.value)}
                placeholder="Home team (optional)"
                className="w-full text-xs sm:text-sm px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-zinc-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-zinc-400 pointer-events-none">
                Home
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                id={`game-${game.id}-away-team`}
                value={game.awayTeam}
                onChange={(e) => onTeamChange(game.id, 'awayTeam', e.target.value)}
                placeholder="Away team (optional)"
                className="w-full text-xs sm:text-sm px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder:text-zinc-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-zinc-400 pointer-events-none">
                Away
              </span>
            </div>
          </div>
        </div>

        {/* 3-Way Outcome Selector & Lock Indicator */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
          {/* Status Chip */}
          <div className="text-[11px] font-medium hidden sm:flex items-center gap-1.5 mr-1">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 font-semibold text-zinc-900">
                <Lock className="w-3 h-3 text-emerald-600" />
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <Unlock className="w-3 h-3 text-zinc-400" />
                3 Choices
              </span>
            )}
          </div>

          {/* Outcome Buttons: 1, X, 2, Not Sure */}
          <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
            {/* 1: Home */}
            <button
              type="button"
              id={`game-${game.id}-outcome-1`}
              onClick={() => handleOutcomeClick('1')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                game.lockedOutcome === '1'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
              }`}
              title="Lock as Home Win (1)"
            >
              1 <span className="hidden sm:inline font-normal text-[10px] opacity-80">(Home)</span>
            </button>

            {/* X: Draw */}
            <button
              type="button"
              id={`game-${game.id}-outcome-X`}
              onClick={() => handleOutcomeClick('X')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                game.lockedOutcome === 'X'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200'
              }`}
              title="Lock as Draw (X)"
            >
              X <span className="hidden sm:inline font-normal text-[10px] opacity-80">(Draw)</span>
            </button>

            {/* 2: Away */}
            <button
              type="button"
              id={`game-${game.id}-outcome-2`}
              onClick={() => handleOutcomeClick('2')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                game.lockedOutcome === '2'
                  ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-500/30'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-sky-50 hover:text-sky-800 hover:border-sky-200'
              }`}
              title="Lock as Away Win (2)"
            >
              2 <span className="hidden sm:inline font-normal text-[10px] opacity-80">(Away)</span>
            </button>

            {/* Not sure / Unlocked */}
            <button
              type="button"
              id={`game-${game.id}-outcome-unlocked`}
              onClick={() => onOutcomeChange(game.id, null)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                game.lockedOutcome === null
                  ? 'bg-zinc-800 text-white border-zinc-900 shadow-xs'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800'
              }`}
              title="Unlock (All 3 outcomes generated)"
            >
              <span className="sm:hidden">?</span>
              <span className="hidden sm:inline">Not sure</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

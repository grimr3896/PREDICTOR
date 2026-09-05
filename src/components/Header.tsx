import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw, Shuffle, Upload, FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { GamePoolSize } from '../types';

interface HeaderProps {
  poolSize: GamePoolSize;
  onPoolSizeChange: (size: GamePoolSize) => void;
  onResetAll: () => void;
  onLoadSampleMatches: () => void;
  onRandomLock: () => void;
  lockedCount: number;
  onImportClick: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadExcelTemplate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  poolSize,
  onPoolSizeChange,
  onResetAll,
  onLoadSampleMatches,
  onRandomLock,
  lockedCount,
  onImportClick,
  onDownloadCsvTemplate,
  onDownloadExcelTemplate,
}) => {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTemplateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <span className="text-sm tracking-tighter">1X2</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight leading-none">
                Jackpot Combination Generator
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Filter &amp; export full 1X2 football pool combinations with live math
              </p>
            </div>
          </div>

          {/* Controls: Pool size selector & Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pool Size Segmented Control */}
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
              <button
                type="button"
                id="pool-size-13-btn"
                onClick={() => onPoolSizeChange(13)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  poolSize === 13
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                13 Games <span className="text-[10px] font-normal opacity-70 hidden sm:inline">(Midweek)</span>
              </button>
              <button
                type="button"
                id="pool-size-17-btn"
                onClick={() => onPoolSizeChange(17)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  poolSize === 17
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                17 Games <span className="text-[10px] font-normal opacity-70 hidden sm:inline">(Mega)</span>
              </button>
              {poolSize !== 13 && poolSize !== 17 && (
                <span
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300"
                  title="Custom game count from imported fixtures"
                >
                  {poolSize} Games (Custom)
                </span>
              )}
            </div>

            {/* Fixture Import & Template Dropdown */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="header-import-fixtures-btn"
                onClick={onImportClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Import fixtures from a CSV or Excel (.xlsx/.xls) file"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Import Fixtures</span>
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  id="header-download-template-menu-btn"
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
                  title="Download sample fixture templates"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Templates</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
                </button>

                {showTemplateMenu && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                      Sample Templates
                    </div>
                    <button
                      type="button"
                      id="header-download-csv-template-btn"
                      onClick={() => {
                        onDownloadCsvTemplate();
                        setShowTemplateMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-zinc-900">Download CSV template</div>
                        <div className="text-[10px] text-zinc-500">Standard comma-separated .csv</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      id="header-download-excel-template-btn"
                      onClick={() => {
                        onDownloadExcelTemplate();
                        setShowTemplateMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-zinc-100"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-zinc-900">Download Excel template</div>
                        <div className="text-[10px] text-zinc-500">Microsoft Excel .xlsx workbook</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="sample-matches-btn"
                onClick={onLoadSampleMatches}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Load realistic top-tier football matchups"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Sample Matches</span>
              </button>

              <button
                type="button"
                id="random-lock-btn"
                onClick={onRandomLock}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Randomly lock 5 games"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Lock 5</span>
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
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

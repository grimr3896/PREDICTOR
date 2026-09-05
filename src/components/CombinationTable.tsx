import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Download,
  Search,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { GameItem, GeneratedCombination } from '../types';
import { getPageCombinations } from '../utils/combinationLogic';

interface CombinationTableProps {
  games: GameItem[];
  totalRemaining: number;
  onOpenExport: (format?: 'csv' | 'excel') => void;
}

export const CombinationTable: React.FC<CombinationTableProps> = ({
  games,
  totalRemaining,
  onOpenExport,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchPrefix, setSearchPrefix] = useState<string>('');

  const totalPages = Math.max(1, Math.ceil(totalRemaining / pageSize));

  // Ensure current page is in bounds
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Generate combinations for the current page on-the-fly
  const combinations = useMemo(() => {
    return getPageCombinations(safePage, pageSize, totalRemaining, games);
  }, [safePage, pageSize, totalRemaining, games]);

  // Handle copying code to clipboard
  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // Fallback
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(clamped);
    setJumpPageInput(clamped.toString());
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum)) {
      handlePageChange(pageNum);
    }
  };

  // Filter combinations in the current page by prefix if entered
  const filteredCombinations = useMemo(() => {
    if (!searchPrefix.trim()) return combinations;
    const cleanPrefix = searchPrefix.trim().toUpperCase();
    return combinations.filter((c) => c.code.startsWith(cleanPrefix));
  }, [combinations, searchPrefix]);

  const startRow = (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, totalRemaining);

  const getOutcomeBadgeColor = (outcome: '1' | 'X' | '2') => {
    switch (outcome) {
      case '1':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'X':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case '2':
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
  };

  return (
    <section id="combinations-results" className="mt-8 bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-zinc-900">
                Generated Combinations List
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Showing rows <span className="font-mono font-semibold text-zinc-800">{startRow.toLocaleString()}</span> to{' '}
              <span className="font-mono font-semibold text-zinc-800">{endRow.toLocaleString()}</span> of{' '}
              <span className="font-mono font-bold text-emerald-700">{totalRemaining.toLocaleString()}</span> total combinations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick prefix filter for the page */}
            <div className="relative">
              <input
                type="text"
                id="search-outcome-prefix"
                value={searchPrefix}
                onChange={(e) => setSearchPrefix(e.target.value)}
                placeholder="Filter page (e.g. 1X2...)"
                maxLength={games.length}
                className="w-40 sm:w-48 text-xs pl-7 pr-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1">
              <span className="hidden sm:inline">Per page:</span>
              <select
                id="page-size-selector"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                  setJumpPageInput('1');
                }}
                className="bg-transparent font-semibold text-zinc-900 focus:outline-none cursor-pointer"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              id="export-csv-table-btn"
              onClick={() => onOpenExport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Export combinations to CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Export as Excel Button */}
            <button
              type="button"
              id="export-excel-table-btn"
              onClick={() => onOpenExport('excel')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Export combinations as Excel (.xlsx) workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export as Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Combinations Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-100/70 text-zinc-600 font-medium">
              <th className="py-2.5 px-4 w-16 text-center font-mono">#</th>
              <th className="py-2.5 px-4 w-52">Outcome Code</th>
              <th className="py-2.5 px-4">Game Breakdown (1 / X / 2)</th>
              <th className="py-2.5 px-4 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredCombinations.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-500">
                  <p className="font-semibold text-zinc-700">No combinations found</p>
                  <p className="text-xs mt-1">Try clearing your search filter.</p>
                </td>
              </tr>
            ) : (
              filteredCombinations.map((combo) => (
                <tr
                  key={combo.index}
                  className="hover:bg-zinc-50/80 transition-colors group"
                >
                  {/* Row Number */}
                  <td className="py-2.5 px-4 text-center font-mono font-medium text-zinc-400">
                    {combo.index.toLocaleString()}
                  </td>

                  {/* Outcome String */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm tracking-wider text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                        {combo.code}
                      </span>
                    </div>
                  </td>

                  {/* Per Game Breakdown Chips */}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {combo.outcomes.map((outcome, gIdx) => {
                        const game = games[gIdx];
                        const titleText = game?.homeTeam && game?.awayTeam
                          ? `G${gIdx + 1}: ${game.homeTeam} vs ${game.awayTeam} -> Outcome ${outcome}`
                          : `Game ${gIdx + 1}: Outcome ${outcome}`;
                        return (
                          <span
                            key={gIdx}
                            title={titleText}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono font-bold text-[11px] border cursor-help ${getOutcomeBadgeColor(
                              outcome
                            )}`}
                          >
                            {outcome}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Copy button */}
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(combo.code, combo.index)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                        copiedIndex === combo.index
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                      title="Copy outcome code to clipboard"
                    >
                      {copiedIndex === combo.index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Page status */}
        <div className="text-zinc-500 text-center sm:text-left">
          Page <span className="font-semibold text-zinc-900">{safePage.toLocaleString()}</span> of{' '}
          <span className="font-semibold text-zinc-900">{totalPages.toLocaleString()}</span>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="pagination-first-btn"
            onClick={() => handlePageChange(1)}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="pagination-prev-btn"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Jump To Form */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 px-1">
            <input
              type="number"
              id="jump-to-page-input"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-16 text-center text-xs py-1 px-2 border border-zinc-200 bg-white rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-md font-medium text-[11px] transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>

          <button
            type="button"
            id="pagination-next-btn"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="pagination-last-btn"
            onClick={() => handlePageChange(totalPages)}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

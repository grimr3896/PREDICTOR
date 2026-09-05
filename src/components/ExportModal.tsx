import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  X,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
} from 'lucide-react';
import { GameItem } from '../types';
import { generateCsvBlob, CsvProgress } from '../utils/combinationLogic';
import { generateExcelBlob } from '../utils/excelImport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameItem[];
  totalRemaining: number;
  initialFormat?: 'csv' | 'excel';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  games,
  totalRemaining,
  initialFormat = 'csv',
}) => {
  const [format, setFormat] = useState<'csv' | 'excel'>(initialFormat);
  const [stage, setStage] = useState<'confirm' | 'generating' | 'done' | 'error'>('confirm');
  const [scopeLimit, setScopeLimit] = useState<number>(() => {
    if (initialFormat === 'excel') {
      return totalRemaining <= 50000 ? totalRemaining : 25000;
    }
    return totalRemaining;
  });
  const [progress, setProgress] = useState<CsvProgress>({
    generated: 0,
    total: totalRemaining,
    percent: 0,
    ratePerSec: 0,
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);
  const [exportedRowCount, setExportedRowCount] = useState<number>(totalRemaining);

  const isCancelledRef = useRef<boolean>(false);

  // Clean up object URL on unmount or URL change to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  useEffect(() => {
    if (isOpen) {
      const activeFormat = initialFormat || 'csv';
      setFormat(activeFormat);
      setStage('confirm');
      
      // Set safe default scope limit
      if (activeFormat === 'excel') {
        setScopeLimit(totalRemaining <= 50000 ? totalRemaining : 25000);
      } else {
        setScopeLimit(totalRemaining);
      }

      setProgress({
        generated: 0,
        total: totalRemaining,
        percent: 0,
        ratePerSec: 0,
      });
      isCancelledRef.current = false;
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
      }
    }
  }, [isOpen, totalRemaining, initialFormat]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    onClose();
  };

  const handleFormatChange = (newFormat: 'csv' | 'excel') => {
    setFormat(newFormat);
    if (newFormat === 'excel') {
      if (scopeLimit > 50000) {
        setScopeLimit(totalRemaining <= 50000 ? totalRemaining : 25000);
      }
    } else {
      if (scopeLimit <= 50000 && totalRemaining > 50000) {
        setScopeLimit(totalRemaining);
      }
    }
  };

  const effectiveExportCount = Math.min(totalRemaining, scopeLimit);
  const isHighVolume = format === 'csv' && effectiveExportCount > 5000000;
  const estMb = Math.round((effectiveExportCount * (games.length * 2 + 15)) / (1024 * 1024));

  const handleStartExport = async () => {
    setStage('generating');
    isCancelledRef.current = false;

    // Free any previous object URL before starting new export
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    try {
      let blob: Blob | null = null;
      let actualRows = effectiveExportCount;

      if (format === 'excel') {
        const result = await generateExcelBlob(
          games,
          totalRemaining,
          (p) => setProgress(p),
          () => isCancelledRef.current,
          scopeLimit
        );
        blob = result.blob;
        actualRows = result.actualRows;
      } else {
        const result = await generateCsvBlob(
          games,
          totalRemaining,
          (p) => setProgress(p),
          () => isCancelledRef.current,
          scopeLimit
        );
        blob = result.blob;
        actualRows = result.actualRows;
      }

      if (isCancelledRef.current || !blob) {
        setStage('confirm');
        return;
      }

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setFileSizeMb(Number((blob.size / (1024 * 1024)).toFixed(2)));
      setExportedRowCount(actualRows);

      const timeStamp = new Date().toISOString().slice(0, 10);
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const generatedName = `jackpot_${games.length}games_${actualRows}combos_${timeStamp}.${ext}`;
      setFileName(generatedName);

      setStage('done');

      // Attempt browser auto-download safely
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = generatedName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 1000);
      } catch (autoDlErr) {
        console.warn('Auto download blocked by browser, manual button available:', autoDlErr);
      }
    } catch (err) {
      console.error('Export error:', err);
      setStage('error');
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setStage('confirm');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== 'generating') {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              {format === 'excel' ? (
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              ) : (
                <FileText className="w-4 h-4 text-emerald-700" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Export Combinations ({format === 'excel' ? 'Excel .xlsx' : 'CSV'})
              </h3>
              <p className="text-xs text-zinc-500">
                Client-side stream generator for {effectiveExportCount.toLocaleString()} combinations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={stage === 'generating' ? handleCancel : handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {stage === 'confirm' && (
            <div className="space-y-4">
              {/* Format Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Select Export Format:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100/90 rounded-xl border border-zinc-200">
                  <button
                    type="button"
                    id="export-modal-csv-format-btn"
                    onClick={() => handleFormatChange('csv')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      format === 'csv'
                        ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80 font-bold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV (.csv)</span>
                  </button>

                  <button
                    type="button"
                    id="export-modal-excel-format-btn"
                    onClick={() => handleFormatChange('excel')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      format === 'excel'
                        ? 'bg-white text-emerald-950 shadow-xs border border-emerald-300 font-bold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Row Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Export Quantity:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {format === 'excel' ? (
                    <>
                      {totalRemaining <= 50000 ? (
                        <button
                          type="button"
                          onClick={() => setScopeLimit(totalRemaining)}
                          className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                            scopeLimit === totalRemaining
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="font-semibold">All Combinations</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {totalRemaining.toLocaleString()} rows
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setScopeLimit(25000)}
                          className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                            scopeLimit === 25000
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="font-semibold">First 25,000</div>
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Recommended (~1s)
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setScopeLimit(totalRemaining <= 50000 ? Math.min(totalRemaining, 10000) : 50000)}
                        className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                          (totalRemaining > 50000 && scopeLimit === 50000) || (totalRemaining <= 50000 && scopeLimit === 10000)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="font-semibold">
                          {totalRemaining > 50000 ? 'Max (50,000)' : 'First 10,000'}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {totalRemaining > 50000 ? 'Full Excel capacity' : '10,000 rows'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScopeLimit(100)}
                        className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                          scopeLimit === 100
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="font-semibold">Current Page</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">100 rows</div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setScopeLimit(totalRemaining)}
                        className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                          scopeLimit === totalRemaining
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="font-semibold">All Combinations</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {totalRemaining.toLocaleString()} rows
                        </div>
                      </button>

                      {totalRemaining > 100000 && (
                        <button
                          type="button"
                          onClick={() => setScopeLimit(100000)}
                          className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                            scopeLimit === 100000
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="font-semibold">First 100,000</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">Fast stream</div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setScopeLimit(100)}
                        className={`px-2.5 py-2 text-xs rounded-lg border text-left transition-colors cursor-pointer ${
                          scopeLimit === 100
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="font-semibold">Current Page</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">100 rows</div>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Format Specific Details & Warnings */}
              {format === 'excel' ? (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Microsoft Excel (.xlsx) Safe Stream</span>
                  </div>
                  <p className="text-emerald-800">
                    Generates a native Excel workbook with styled headers and formatted columns. Excel exports in the browser are capped at 50,000 rows to ensure snappy UI and prevent browser freezes.
                  </p>
                  {totalRemaining > 50000 && (
                    <div className="flex items-start gap-1.5 p-2 mt-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        💡 For the full pool of <strong>{totalRemaining.toLocaleString()}</strong> combinations, select <strong>CSV format</strong> which streams unlimited rows without freezing.
                      </span>
                    </div>
                  )}
                </div>
              ) : isHighVolume ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Large Dataset Notice (&gt; 5,000,000 rows)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Exporting <strong className="font-mono text-amber-950">{effectiveExportCount.toLocaleString()}</strong> rows (~{estMb} MB).
                  </p>
                  <p className="text-xs text-amber-800">
                    💡 <strong>Tip:</strong> Consider locking a few more games first in the setup pool to export in seconds.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 space-y-1.5">
                  <p>
                    Exports <strong className="text-zinc-900 font-mono">{effectiveExportCount.toLocaleString()}</strong> combinations directly into a standard CSV file with combination indices and team outcome columns.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  id="cancel-export-confirm-btn"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="start-export-btn"
                  onClick={handleStartExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {format === 'excel' ? (
                    <FileSpreadsheet className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {format === 'excel'
                      ? `Export ${effectiveExportCount.toLocaleString()} to Excel`
                      : `Export ${effectiveExportCount.toLocaleString()} to CSV`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {stage === 'generating' && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  Generating {format === 'excel' ? 'Excel (.xlsx) workbook' : 'CSV'} smoothly...
                </span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200 p-0.5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(2, progress.percent)}%` }}
                />
              </div>

              {/* Stats ticker */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-zinc-500">Rows processed:</span>
                  <div className="font-mono font-semibold text-zinc-900 mt-0.5">
                    {progress.generated.toLocaleString()} / {progress.total.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Processing speed:</span>
                  <div className="font-mono font-semibold text-zinc-900 mt-0.5">
                    ~{progress.ratePerSec.toLocaleString()} rows/sec
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  id="abort-export-btn"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Export
                </button>
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900">
                  {format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} File Generated Successfully!
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Downloaded <strong className="text-zinc-800">{fileName}</strong> ({fileSizeMb} MB, {exportedRowCount.toLocaleString()} rows).
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={fileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Again</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-3 text-center py-2">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs text-rose-800 font-medium">
                An error occurred during generation. Please try locking more games or choosing a smaller row batch.
              </p>
              <button
                type="button"
                onClick={() => setStage('confirm')}
                className="px-4 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


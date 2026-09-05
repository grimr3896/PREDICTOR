import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  X,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { GameItem } from '../types';
import { generateCsvBlob, CsvProgress } from '../utils/combinationLogic';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameItem[];
  totalRemaining: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  games,
  totalRemaining,
}) => {
  const [stage, setStage] = useState<'confirm' | 'generating' | 'done' | 'error'>('confirm');
  const [progress, setProgress] = useState<CsvProgress>({
    generated: 0,
    total: totalRemaining,
    percent: 0,
    ratePerSec: 0,
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);

  const isCancelledRef = useRef<boolean>(false);

  const isHighVolume = totalRemaining > 5000000;
  // Approximate CSV size: ~ (N * 2 + 15) bytes per row. For 17 games, ~49 bytes/row.
  const estMb = Math.round((totalRemaining * (games.length * 2 + 15)) / (1024 * 1024));

  useEffect(() => {
    if (isOpen) {
      // If count is under 5M, we can start immediately or show confirmation
      // If over 5M, start at 'confirm' to warn the user
      setStage('confirm');
      setProgress({
        generated: 0,
        total: totalRemaining,
        percent: 0,
        ratePerSec: 0,
      });
      isCancelledRef.current = false;
      if (downloadUrl) {
        const urlToRevoke = downloadUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 60000);
        setDownloadUrl(null);
      }
    }
  }, [isOpen, totalRemaining]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setStage('generating');
    isCancelledRef.current = false;

    try {
      const blob = await generateCsvBlob(
        games,
        totalRemaining,
        (p) => setProgress(p),
        () => isCancelledRef.current
      );

      if (isCancelledRef.current || !blob) {
        setStage('confirm');
        return;
      }

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setFileSizeMb(Number((blob.size / (1024 * 1024)).toFixed(2)));

      const timeStamp = new Date().toISOString().slice(0, 10);
      const generatedName = `jackpot_${games.length}games_${totalRemaining}combos_${timeStamp}.csv`;
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
        }, 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Export Combinations CSV
              </h3>
              <p className="text-xs text-zinc-500">
                Client-side stream generator for {totalRemaining.toLocaleString()} combinations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={stage === 'generating' ? handleCancel : onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {stage === 'confirm' && (
            <div className="space-y-4">
              {isHighVolume ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Large Dataset Warning (&gt; 5,000,000 combinations)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    You have requested an export of{' '}
                    <strong className="font-mono text-amber-950">{totalRemaining.toLocaleString()}</strong> rows.
                    Estimated CSV file size is approximately <strong className="font-mono text-amber-950">~{estMb} MB</strong>.
                  </p>
                  <p className="text-xs text-amber-800">
                    💡 <strong>Recommendation:</strong> Consider locking a few more games first in the setup pool to reduce the file size and export in seconds.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 space-y-1.5">
                  <p>
                    This will export all <strong className="text-zinc-900 font-mono">{totalRemaining.toLocaleString()}</strong> combinations directly into a CSV file with:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-700 font-medium">
                    <li>Combination row index</li>
                    <li>Full {games.length}-digit outcome string (e.g. 1X21...)</li>
                    <li>Detailed columns for each game with team names</li>
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  id="cancel-export-confirm-btn"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors cursor-pointer"
                >
                  {isHighVolume ? 'Lock More Games First' : 'Cancel'}
                </button>
                <button
                  type="button"
                  id="start-export-btn"
                  onClick={handleStartExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isHighVolume ? 'Proceed with Export Anyway' : 'Start CSV Export'}</span>
                </button>
              </div>
            </div>
          )}

          {stage === 'generating' && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  Generating CSV in chunks...
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
                  CSV Generated Successfully!
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Downloaded <strong className="text-zinc-800">{fileName}</strong> ({fileSizeMb} MB).
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
                  onClick={onClose}
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
                An error occurred during generation. Please try locking more games or freeing browser memory.
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

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

interface ImportNotificationProps {
  type: 'success' | 'error';
  message: string;
  warnings?: string[];
  onDismiss: () => void;
}

export const ImportNotification: React.FC<ImportNotificationProps> = ({
  type,
  message,
  warnings = [],
  onDismiss,
}) => {
  if (type === 'error') {
    return (
      <div
        id="import-error-banner"
        className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-xs animate-in fade-in duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                Import Failed
              </h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed font-mono whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="import-success-banner"
      className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs animate-in fade-in duration-150"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              {message}
            </h4>
            <p className="text-xs text-emerald-800">
              All fixture rows have been loaded into the setup matrix with outcomes unlocked ("Not sure").
            </p>

            {warnings.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/70 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Import notes &amp; warnings ({warnings.length}):
                </span>
                <ul className="list-disc list-inside text-xs text-emerald-900/90 space-y-0.5 font-mono text-[11px]">
                  {warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

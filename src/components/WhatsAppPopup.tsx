import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Bell, ExternalLink } from 'lucide-react';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDcWLp8PgsHZKtwRd0z';

interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppPopup: React.FC<WhatsAppPopupProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleJoin = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('hide_whatsapp_popup', 'true');
      } catch {}
    }
    window.open(WHATSAPP_CHANNEL_URL, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('hide_whatsapp_popup', 'true');
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden transform transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner with WhatsApp Green Theme */}
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white p-5 text-center relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* WhatsApp Icon Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg mb-3 p-2.5">
            <svg
              className="w-10 h-10 text-emerald-600 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.21 8.21 0 01-5.82 2.41h-.01c-1.42 0-2.82-.37-4.06-1.08l-.29-.17-3.13.82.84-3.05-.19-.3a8.204 8.204 0 01-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.55-.42-.14 0-.31-.02-.48-.02-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.3z" />
            </svg>
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">
            PANDEY JI UP⁴³
          </h3>
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mt-0.5">
            Official WhatsApp Channel
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Join for Daily Free PDFs & Updates! 🚀
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Sabhi batches ki classes, notes aur mock tests sabse pehle paane ke liye abhi join karein:
            </p>
          </div>

          {/* Feature list */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Daily Free PDFs</strong> with questions & solution sheets
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Class Timetable</strong> & Live class direct links
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>All Exams Covered</strong> (Railway Group D, SSC, State Police)
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>100% Free Education</strong> • Pandey Ji Free Content
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleJoin}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-98 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>👉 JOIN OFFICIAL WHATSAPP CHANNEL</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Secondary Dismiss & Don't Show Again */}
          <div className="flex items-center justify-between pt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
              />
              <span>Don't show again</span>
            </label>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WhatsAppFloatingButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center group">
      {/* Label Tooltip */}
      <span className="hidden sm:inline-block mr-2 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
        Join WhatsApp Channel
      </span>

      {/* Pulsing Button */}
      <button
        type="button"
        onClick={onClick}
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer relative"
        title="Join Pandey Ji Official WhatsApp Channel"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25 pointer-events-none" />
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 fill-current drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.21 8.21 0 01-5.82 2.41h-.01c-1.42 0-2.82-.37-4.06-1.08l-.29-.17-3.13.82.84-3.05-.19-.3a8.204 8.204 0 01-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.55-.42-.14 0-.31-.02-.48-.02-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.3z" />
        </svg>
      </button>
    </div>
  );
};

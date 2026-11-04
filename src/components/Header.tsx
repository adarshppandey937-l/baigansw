import React from 'react';
import { Search, Sun, Moon, Info, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenDisclaimer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  isDarkMode,
  onToggleTheme,
  onOpenDisclaimer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 text-white shadow-lg px-3 py-2.5 sm:px-4 sm:py-3 transition-colors border-b border-orange-400/30 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Dev Profile Badge */}
        <div className="flex items-center gap-2 bg-white/20 dark:bg-zinc-800/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 dark:border-zinc-700 shrink-0">
          <img
            src="https://i.postimg.cc/wv3RgCjh/Screenshot-2026-07-30-13-33-52-41-948cd9899890cbd5c2798760b2b95377.jpg"
            alt="Dev Avatar"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white shadow-sm"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://i.postimg.cc/7PF6SP6R/file-000000009290821187ff34aaef4ccaf2.png';
            }}
          />
          <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white drop-shadow-sm hidden xs:inline whitespace-nowrap">
            𝐏𝐀𝐍𝐃ԵY 𝐉𝐈 UP⁴³
          </span>
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-200 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search batches, lectures, or topics..."
            className="w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-xs sm:text-sm rounded-full pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-orange-500 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenDisclaimer}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition-transform active:scale-95 cursor-pointer"
            title="Notice / Disclaimer"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-full bg-white text-amber-600 dark:bg-zinc-800 dark:text-amber-400 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-800" />}
          </button>
        </div>
      </div>
    </header>
  );
};

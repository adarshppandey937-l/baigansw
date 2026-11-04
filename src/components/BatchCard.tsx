import React from 'react';
import { Heart, Play, Radio, Video, Clock, CheckCircle2 } from 'lucide-react';
import { BatchItem } from '../types';

interface BatchCardProps {
  batch: BatchItem;
  isFavorite: boolean;
  onToggleFavorite: (batch: BatchItem) => void;
  onOpenBatch: (batch: BatchItem) => void;
  showLiveBadge?: boolean;
}

export const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  isFavorite,
  onToggleFavorite,
  onOpenBatch,
  showLiveBadge = false,
}) => {
  const title = batch.title || batch.name || 'Batch';
  const banner =
    batch.banner ||
    batch.thumbnail ||
    'https://i.postimg.cc/7PF6SP6R/file-000000009290821187ff34aaef4ccaf2.png';

  // Pricing calculations
  const sellPrice =
    batch.discountPrice !== undefined && batch.discountPrice !== null
      ? Number(batch.discountPrice)
      : batch.price !== undefined && batch.price !== null
      ? Number(batch.price)
      : 0;

  const originalPrice =
    batch.originalPrice !== undefined && batch.originalPrice !== null
      ? Number(batch.originalPrice)
      : batch.price && batch.discountPrice && Number(batch.price) > Number(batch.discountPrice)
      ? Number(batch.price)
      : sellPrice;

  let discountPercent = 0;
  if (originalPrice > 0 && sellPrice < originalPrice) {
    discountPercent = Math.round(((originalPrice - sellPrice) / originalPrice) * 100);
  }

  // Highlights extraction
  const highlights = batch.courseHighlights || batch.highlights || [];
  let highlightItems: string[] = [];
  if (Array.isArray(highlights)) {
    highlightItems = highlights
      .map((h) => (typeof h === 'object' && h !== null ? h.title || h.text || '' : String(h)))
      .filter(Boolean)
      .slice(0, 3);
  }

  // Validity
  let validityText = '';
  if (batch.validity) {
    const v = String(batch.validity).trim();
    validityText = v.toLowerCase().includes('validity') ? v : `${v} validity`;
  }

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 flex flex-col">
      {/* Banner Area */}
      <div className="relative w-full h-36 sm:h-40 bg-zinc-950 overflow-hidden flex items-center justify-center">
        <img
          src={banner}
          alt={title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://i.postimg.cc/7PF6SP6R/file-000000009290821187ff34aaef4ccaf2.png';
          }}
        />

        {/* Live Badge */}
        {(showLiveBadge || batch.isLive) && (
          <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-white live-indicator" />
            LIVE
          </div>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(batch);
          }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer ${
            isFavorite
              ? 'bg-white text-rose-500 shadow-rose-500/20'
              : 'bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Body Area */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          {title}
        </h3>

        <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-2">
          ⚡ 𝐎𝐖𝐍𝐄𝐑 ➛ 𝐏𝐀ⲛDЕY 𝐉𝐈 UP⁴³
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {batch.isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              <Radio className="w-3 h-3 text-rose-500" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Video className="w-3 h-3 text-zinc-500" /> Recorded
            </span>
          )}

          {validityText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Clock className="w-3 h-3 text-zinc-500" /> {validityText}
            </span>
          )}
        </div>

        {/* Highlights List */}
        {highlightItems.length > 0 && (
          <ul className="space-y-1 mb-3 text-xs text-zinc-600 dark:text-zinc-400 flex-1">
            {highlightItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer with Price and Study Action */}
        <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {sellPrice === 0 ? 'FREE' : `₹${sellPrice}`}
              </span>
              {originalPrice > sellPrice && (
                <span className="text-xs text-zinc-400 line-through font-semibold">
                  ₹{originalPrice}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded w-fit">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenBatch(batch)}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Let's study
          </button>
        </div>
      </div>
    </div>
  );
};

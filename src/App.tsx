import React, { useState, useEffect, useMemo } from 'react';
import { Home, Radio, Video as VideoIcon, Heart, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { BannerCarousel } from './components/BannerCarousel';
import { BatchCard } from './components/BatchCard';
import { BatchView } from './components/BatchView';
import { VideoPlayer } from './components/VideoPlayer';
import { PdfModal } from './components/PdfModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { WhatsAppPopup, WhatsAppFloatingButton } from './components/WhatsAppPopup';
import { BatchItem, WatchHistoryEntry } from './types';
import { getBatches } from './utils/api';

export default function App() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'recorded' | 'favorites'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);

  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    title: string;
    recordings?: import('./components/VideoPlayer').VideoRecordingOption[];
  } | null>(null);
  const [activePdf, setActivePdf] = useState<{
    url: string;
    title: string;
    fileSize?: string;
    chapterName?: string;
  } | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('screen_mode');
      if (saved) return saved === 'black';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [favorites, setFavorites] = useState<BatchItem[]>(() => {
    try {
      const saved = localStorage.getItem('fav_batches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('disclaimer_acknowledged');
    } catch {
      return false;
    }
  });

  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Trigger WhatsApp popup after 2.5s on first visit if not dismissed
  useEffect(() => {
    try {
      const isHidden = localStorage.getItem('hide_whatsapp_popup');
      if (!isHidden) {
        const timer = setTimeout(() => {
          setShowWhatsAppPopup(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Global Toast Event Listener for instant feedback (e.g. PDF download)
  useEffect(() => {
    const handleToast = (e: any) => {
      if (e.detail?.message) {
        setToastMessage({ message: e.detail.message, type: e.detail.type || 'info' });
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  // Sync dark mode class with root html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('screen_mode', 'black');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('screen_mode', 'white');
    }
  }, [isDarkMode]);

  // Load batches on initial mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBatches();
        setBatches(data || []);
      } catch (err: any) {
        console.error('Failed to load batches:', err);
        setError('Check your connection or try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleFavorite = (batch: BatchItem) => {
    const id = batch.id || batch._id;
    let next: BatchItem[];
    if (favorites.some((f) => (f.id || f._id) === id)) {
      next = favorites.filter((f) => (f.id || f._id) !== id);
    } else {
      next = [...favorites, batch];
    }
    setFavorites(next);
    try {
      localStorage.setItem('fav_batches', JSON.stringify(next));
    } catch {}
  };

  const handleAddToHistory = (url: string, title: string) => {
    if (!selectedBatch) return;
    const batchId = selectedBatch.id || selectedBatch._id || '';
    const key = `batch_history_${batchId}`;
    try {
      const current: WatchHistoryEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [{ url, title, time: new Date().toISOString() }, ...current.filter((c) => c.url !== url)].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  };

  const handleCloseDisclaimer = () => {
    setShowDisclaimer(false);
    try {
      localStorage.setItem('disclaimer_acknowledged', 'true');
    } catch {}
  };

  const isBatchRecorded = (b: BatchItem): boolean => {
    const text = `${b.title || b.name || ''} ${b.description || b.about || ''}`.toLowerCase();
    return (
      text.includes('vod') ||
      text.includes('vdo') ||
      text.includes('video') ||
      text.includes('recorded') ||
      text.includes('rec')
    );
  };

  // Filter batches based on tab and search
  const filteredBatches = useMemo(() => {
    let list: BatchItem[] = [];
    if (activeTab === 'favorites') {
      list = favorites;
    } else if (activeTab === 'live') {
      list = batches.filter((b) => b.isLive || !isBatchRecorded(b));
    } else if (activeTab === 'recorded') {
      list = batches.filter((b) => isBatchRecorded(b) || !b.isLive);
    } else {
      list = batches;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((b) => {
      const title = (b.title || b.name || '').toLowerCase();
      const desc = String(b.description || b.about || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }, [batches, favorites, activeTab, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors">
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none watermark-overlay opacity-15 select-none z-0" />

      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        onOpenDisclaimer={() => setShowDisclaimer(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 relative z-10 pb-24">
        {/* Active Sticky Video Player */}
        {playingVideo && (
          <VideoPlayer
            videoUrl={playingVideo.url}
            videoTitle={playingVideo.title}
            recordings={playingVideo.recordings}
            onClose={() => setPlayingVideo(null)}
            onAddToHistory={handleAddToHistory}
          />
        )}

        {/* View Mode: Batch Detail View OR Batches Grid */}
        {selectedBatch ? (
          <BatchView
            batch={selectedBatch}
            onBack={() => setSelectedBatch(null)}
            onPlayVideo={(url, title, recordings) => {
              setPlayingVideo({ url, title, recordings });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPdf={(url, title, fileSize, chapterName) => {
              setActivePdf({
                url,
                title,
                fileSize,
                chapterName,
              });
            }}
          />
        ) : (
          <>
            {/* Auto-rotating promo banners (Home tab & no search) */}
            {activeTab === 'home' && !searchQuery.trim() && <BannerCarousel />}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center p-16 text-amber-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-bold text-sm tracking-wide">Loading Courses & Batches...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <p className="text-zinc-600 dark:text-zinc-300 font-semibold mb-3">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Refresh Page
                </button>
              </div>
            )}

            {/* Batches Grid */}
            {!loading && !error && (
              <>
                {filteredBatches.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    {activeTab === 'favorites'
                      ? '❤️ Koi Favorite Batch Add Nahi Kiya Gaya Hai.'
                      : '❌ Koi Batches Nahi Mile.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {filteredBatches.map((batch, idx) => {
                      const id = batch.id || batch._id || String(idx);
                      const isFav = favorites.some((f) => (f.id || f._id) === id);
                      return (
                        <BatchCard
                          key={id}
                          batch={batch}
                          isFavorite={isFav}
                          showLiveBadge={activeTab === 'home' && idx < 12 && !isBatchRecorded(batch)}
                          onToggleFavorite={handleToggleFavorite}
                          onOpenBatch={(b) => setSelectedBatch(b)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 shadow-lg py-2 px-3 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('home');
              setSelectedBatch(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home' && !selectedBatch
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>HOME</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('live');
              setSelectedBatch(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'live' && !selectedBatch
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-500 live-indicator" />
            <span>LIVE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('recorded');
              setSelectedBatch(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'recorded' && !selectedBatch
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            <span>RECORDED</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('favorites');
              setSelectedBatch(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'favorites' && !selectedBatch
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <span>FAVORITES</span>
          </button>
        </div>
      </nav>

      {/* PDF Modal */}
      {activePdf && (
        <PdfModal
          url={activePdf.url}
          title={activePdf.title}
          fileSize={activePdf.fileSize}
          chapterName={activePdf.chapterName}
          courseName={selectedBatch?.title || selectedBatch?.name || 'Course Content'}
          onClose={() => setActivePdf(null)}
        />
      )}

      {/* Disclaimer / Notice Modal */}
      <DisclaimerModal isOpen={showDisclaimer} onClose={handleCloseDisclaimer} />

      {/* Official WhatsApp Channel Popup Modal */}
      <WhatsAppPopup
        isOpen={showWhatsAppPopup}
        onClose={() => setShowWhatsAppPopup(false)}
      />

      {/* Floating WhatsApp Channel Button */}
      <WhatsAppFloatingButton onClick={() => setShowWhatsAppPopup(true)} />

      {/* Global Toast Notification for Download / Action Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] sm:w-auto animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border text-center ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/60 shadow-emerald-950/40'
                : toastMessage.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border-rose-500/60 shadow-rose-950/40'
                : 'bg-zinc-900/95 text-amber-200 border-amber-500/60 shadow-black/50'
            }`}
          >
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

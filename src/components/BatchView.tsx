import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Folder,
  FolderOpen,
  Video,
  FileText,
  Clock,
  Calendar,
  Play,
  Download,
  Trash2,
  Radio,
  ChevronDown,
  ChevronRight,
  User,
  HelpCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { BatchItem, TopicFolder, ClassItem, WatchHistoryEntry } from '../types';
import { getBatchClasses, getBatchDetails, getTodaysClasses } from '../utils/api';
import { getCachedOrFetchPdfSize, downloadFullOriginalPdf } from '../utils/pdf';
import { VideoRecordingOption } from './VideoPlayer';

interface BatchViewProps {
  batch: BatchItem;
  onBack: () => void;
  onPlayVideo: (url: string, title: string, recordings?: VideoRecordingOption[]) => void;
  onOpenPdf: (url: string, title: string, fileSize?: string, chapterName?: string) => void;
}

export const BatchView: React.FC<BatchViewProps> = ({
  batch,
  onBack,
  onPlayVideo,
  onOpenPdf,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'overview' | 'timetable' | 'history'>('content');
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState<BatchItem>(batch);
  const [topics, setTopics] = useState<TopicFolder[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const [chapterFilter, setChapterFilter] = useState<'all' | 'lectures' | 'pdfs'>('all');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [pdfSizes, setPdfSizes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [todaysClasses, setTodaysClasses] = useState<any[]>([]);

  const batchId = batch.id || batch._id || '';
  const batchTitle = batch.title || batch.name || 'Course Content';

  const FOLDER_AVATAR = "https://i.postimg.cc/wv3RgCjh/Screenshot-2026-07-30-13-33-52-41-948cd9899890cbd5c2798760b2b95377.jpg";
  const PDF_THUMB = "https://i.postimg.cc/pV6FTSfx/IMG-20261024-110550.jpg";
  const DEFAULT_THUMB = "https://i.postimg.cc/7PF6SP6R/file-000000009290821187ff34aaef4ccaf2.png";

  // Load batch details and topics
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fullDetails, topicList] = await Promise.all([
          getBatchDetails(batchId).catch(() => batch),
          getBatchClasses(batchId).catch(() => []),
        ]);
        if (fullDetails && Object.keys(fullDetails).length > 0) {
          setBatchData(fullDetails);
        }
        setTopics(topicList || []);
      } catch (err) {
        console.error('Failed to load batch content:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [batchId]);

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`batch_history_${batchId}`);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, [batchId]);

  // Load timetable / today's classes
  useEffect(() => {
    if (activeTab === 'timetable') {
      getTodaysClasses(batchId)
        .then((classes) => setTodaysClasses(classes || []))
        .catch(() => setTodaysClasses([]));
    }
  }, [activeTab, batchId]);

  // Clean string helper for grouping
  const cleanName = (str: string | undefined): string => {
    if (!str) return '';
    let clean = String(str).trim();
    clean = clean.replace(/^OWNER\s+PANDEY\s+JI\s*/i, '');
    clean = clean.replace(/\b(class|lec|lecture|part|session)\s*[-:]?\s*\d+\b/gi, '');
    clean = clean.replace(/^(class|lec|lecture|part|session)\s*[-:]?\s*\d+\s*/i, '');
    clean = clean.replace(/\s+by\s+[\w\s\.]+$/i, '');
    clean = clean.replace(/\s+[A-Za-z]+\s+(sir|ma'am|mam)\b/gi, '');
    clean = clean.replace(/\s+(sir|ma'am|mam)\b/gi, '');
    clean = clean.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
    return clean || 'General Chapters';
  };

  // Format duration helper
  const formatDuration = (raw: any): string => {
    if (raw === undefined || raw === null || raw === '') return '';
    let sec = parseInt(raw, 10);
    if (!isNaN(sec)) {
      if (sec > 100000) sec = Math.floor(sec / 1000);
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    }
    return String(raw);
  };

  // Asynchronously resolve PDF sizes when in chapter view
  const resolvePdfSize = (url: string) => {
    if (!url || pdfSizes[url]) return;
    getCachedOrFetchPdfSize(url).then((size) => {
      setPdfSizes((prev) => ({ ...prev, [url]: size }));
    });
  };

  // Toggle chapter accordion
  const toggleChapter = (key: string) => {
    setOpenChapters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearHistory = () => {
    if (confirm('Clear watch history for this batch?')) {
      localStorage.removeItem(`batch_history_${batchId}`);
      setHistory([]);
    }
  };

  // Extract recordings array helper
  const getRecordings = (cls: any): VideoRecordingOption[] => {
    const list = cls.mp4Recordings || cls.mp4 || cls.recordings || cls.videoRecordings || [];
    const results: VideoRecordingOption[] = [];

    if (Array.isArray(list)) {
      list.forEach((item: any) => {
        if (item && item.url) {
          results.push({
            quality: item.quality || item.resolution || 'MP4',
            url: item.url,
            size: item.size ? parseFloat(Number(item.size).toFixed(2)) : undefined
          });
        }
      });
    }

    ['720', '480', '360', '240'].forEach((res) => {
      const u = cls[`mp4_${res}`] || cls[`url_${res}`] || cls[`video_${res}`];
      if (u && !results.some(r => r.url === u)) {
        results.push({ quality: `${res}p`, url: u });
      }
    });

    return results;
  };

  // Render Subject Drilldown
  const renderSubjectContent = () => {
    if (selectedTopicIndex === null || !topics[selectedTopicIndex]) return null;
    const topic = topics[selectedTopicIndex];
    const subjectName = cleanName(topic.topicName || topic.title || topic.name) || `Subject ${selectedTopicIndex + 1}`;

    // Group items into chapters
    const chaptersMap: Record<string, ClassItem[]> = {};
    const flatLectures: ClassItem[] = [];
    const flatPdfs: { cls: ClassItem; url: string }[] = [];

    const subChapters = topic.chapters || [];
    if (Array.isArray(subChapters) && subChapters.length > 0) {
      subChapters.forEach((chap) => {
        const chapName = cleanName(chap.chapterName || chap.name || chap.title) || 'Chapter Folder';
        const classes = chap.classes || chap.videos || [];
        if (!chaptersMap[chapName]) chaptersMap[chapName] = [];
        chaptersMap[chapName].push(...classes);
      });
    } else {
      const classes = topic.classes || topic.videos || topic.items || [topic as any];
      classes.forEach((cls) => {
        let rawChap = cls.chapterName || cls.chapter || cls.subTopic || cls.folderName || cls.subTopicName;
        let chapName = cleanName(rawChap);
        if (!chapName || chapName === subjectName) {
          chapName = cleanName(cls.topicName) || cleanName(cls.title || cls.name) || 'General Chapters';
        }
        if (!chaptersMap[chapName]) chaptersMap[chapName] = [];
        chaptersMap[chapName].push(cls);
      });
    }

    // Extract flat counts and pre-fetch PDF sizes
    Object.values(chaptersMap).forEach((clsList) => {
      clsList.forEach((cls) => {
        const recordings = getRecordings(cls);
        const vLink = cls.class_link || cls.video_link || cls.link || cls.url || cls.streamUrl || recordings[0]?.url;
        if (vLink) flatLectures.push(cls);

        const pdfs = cls.classPdf || cls.pdfs || [];
        pdfs.forEach((p) => {
          const pUrl = typeof p === 'object' ? p.url : p;
          if (pUrl) {
            flatPdfs.push({ cls, url: pUrl });
            resolvePdfSize(pUrl);
          }
        });
      });
    });

    const totalCount = flatLectures.length + flatPdfs.length;

    return (
      <div className="space-y-4">
        {/* Top Filter Buttons: All, Lectures, PDFs */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setChapterFilter('all')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
              chapterFilter === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>All ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setChapterFilter('lectures')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
              chapterFilter === 'lectures'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/20'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Lectures ({flatLectures.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setChapterFilter('pdfs')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
              chapterFilter === 'pdfs'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/20'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>PDFs ({flatPdfs.length})</span>
          </button>
        </div>

        {/* Current Subject Header */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border-l-4 border-amber-500 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
              {subjectName}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTopicIndex(null)}
            className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Subjects
          </button>
        </div>

        {/* Chapter List View */}
        {chapterFilter === 'all' && (
          <div className="space-y-3">
            {Object.entries(chaptersMap).map(([chapName, clsList], idx) => {
              const chapKey = `chap_${selectedTopicIndex}_${idx}`;
              const isOpen = openChapters[chapKey] !== false;

              return (
                <div
                  key={chapKey}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
                >
                  {/* Chapter Header */}
                  <div
                    onClick={() => toggleChapter(chapKey)}
                    className="bg-sky-600 dark:bg-sky-700 text-white px-4 py-3 cursor-pointer flex items-center justify-between font-bold text-xs sm:text-sm select-none"
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      {chapName}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      {clsList.length} Items
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>

                  {/* Chapter Content Items */}
                  {isOpen && (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {clsList.map((cls, cIdx) => {
                        const rawTitle = cls.title || cls.name || 'Untitled Class';
                        const displayTitle = rawTitle.startsWith('OWNER PANDEY JI')
                          ? rawTitle
                          : `OWNER PANDEY JI ${rawTitle}`;

                        const recordings = getRecordings(cls);
                        const vLink = cls.class_link || cls.video_link || cls.link || cls.url || cls.streamUrl || recordings[0]?.url;
                        const durationText = formatDuration(cls.duration || cls.videoDuration || cls.length);

                        const dateStr = cls.startDate || cls.createdAt || cls.date;
                        let formattedDate = '';
                        if (dateStr) {
                          const d = new Date(dateStr);
                          if (!isNaN(d.getTime())) {
                            formattedDate = `${d.toLocaleDateString('en-GB')} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          }
                        }

                        const thumb = cls.thumbnail || cls.banner || cls.image || DEFAULT_THUMB;
                        const pdfs = cls.classPdf || cls.pdfs || [];

                        return (
                          <React.Fragment key={cIdx}>
                            {/* Video Lecture Row */}
                            {vLink && (
                              <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <img
                                    src={thumb}
                                    alt={displayTitle}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-amber-500 shrink-0 bg-black"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_THUMB;
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                      {displayTitle}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {durationText && (
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                          <Clock className="w-3 h-3" /> {durationText}
                                        </span>
                                      )}
                                      {formattedDate && (
                                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                          <Calendar className="w-3 h-3" /> {formattedDate}
                                        </span>
                                      )}
                                      {recordings.length > 0 && recordings[0].size && (
                                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded">
                                          {recordings[0].size} MB
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0 flex-wrap">
                                  {/* Direct Resolution buttons if available */}
                                  {recordings.slice(0, 2).map((rec, rIdx) => (
                                    <button
                                      type="button"
                                      key={rIdx}
                                      onClick={() => onPlayVideo(rec.url, displayTitle, recordings)}
                                      className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95 shadow-sm transition-all cursor-pointer"
                                      title={`Play ${rec.quality} (${rec.size ? `${rec.size} MB` : ''})`}
                                    >
                                      <span>▶ {rec.quality}</span>
                                      {rec.size && <span className="text-[10px] text-zinc-300">({rec.size} MB)</span>}
                                    </button>
                                  ))}

                                  {/* Main Play Button */}
                                  <button
                                    type="button"
                                    onClick={() => onPlayVideo(vLink, displayTitle, recordings)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    PLAY
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* PDF Rows: Displays MB size and downloads 100% full original PDF */}
                            {pdfs.map((p, pIdx) => {
                              const pUrl = typeof p === 'object' ? p.url : p;
                              if (!pUrl) return null;
                              const pSize = pdfSizes[pUrl];

                              return (
                                <div
                                  key={pIdx}
                                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <img
                                      src={PDF_THUMB}
                                      alt="PDF"
                                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-rose-500 shrink-0 bg-black"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = PDF_THUMB;
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                        {displayTitle} (PDF)
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {pSize && (
                                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> {pSize}
                                          </span>
                                        )}
                                        {formattedDate && (
                                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {formattedDate}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenPdf(pUrl, displayTitle, pSize, chapName)}
                                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      VIEW PDF
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => downloadFullOriginalPdf(pUrl, displayTitle, batchTitle, chapName)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                                      title="Download complete original PDF with questions & solution sheets"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      DOWNLOAD {pSize ? `(${pSize})` : ''}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lectures Only Flat View */}
        {chapterFilter === 'lectures' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="bg-emerald-600 text-white px-4 py-3 font-bold text-xs sm:text-sm flex items-center justify-between">
              <span>📂 General (All Lectures)</span>
              <span>{flatLectures.length} Lectures</span>
            </div>
            {flatLectures.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">No lectures found.</div>
            ) : (
              flatLectures.map((cls, idx) => {
                const rawTitle = cls.title || cls.name || 'Untitled Class';
                const displayTitle = rawTitle.startsWith('OWNER PANDEY JI')
                  ? rawTitle
                  : `OWNER PANDEY JI ${rawTitle}`;
                const recordings = getRecordings(cls);
                const vLink = cls.class_link || cls.video_link || cls.link || cls.url || cls.streamUrl || recordings[0]?.url;
                const durationText = formatDuration(cls.duration || cls.videoDuration);

                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={cls.thumbnail || DEFAULT_THUMB}
                        alt="Thumb"
                        className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shrink-0 bg-black"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                          {displayTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {durationText && (
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {durationText}
                            </div>
                          )}
                          {recordings.length > 0 && recordings[0].size && (
                            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded">
                              {recordings[0].size} MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayVideo(vLink!, displayTitle, recordings)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 self-end sm:self-center shadow-md active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> PLAY
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PDFs Only Flat View */}
        {chapterFilter === 'pdfs' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="bg-rose-600 text-white px-4 py-3 font-bold text-xs sm:text-sm flex items-center justify-between">
              <span>📂 General (All PDFs)</span>
              <span>{flatPdfs.length} PDFs</span>
            </div>
            {flatPdfs.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">No PDFs found.</div>
            ) : (
              flatPdfs.map((item, idx) => {
                const cls = item.cls;
                const pUrl = item.url;
                const rawTitle = cls.title || cls.name || 'Untitled Class';
                const displayTitle = rawTitle.startsWith('OWNER PANDEY JI')
                  ? rawTitle
                  : `OWNER PANDEY JI ${rawTitle}`;
                const pSize = pdfSizes[pUrl];

                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={PDF_THUMB}
                        alt="PDF"
                        className="w-11 h-11 rounded-full object-cover border-2 border-rose-500 shrink-0 bg-black"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                          {displayTitle} (PDF)
                        </h4>
                        {pSize && (
                          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                            {pSize}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenPdf(pUrl, displayTitle, pSize, subjectName)}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" /> VIEW
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFullOriginalPdf(pUrl, displayTitle, batchTitle, subjectName)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
                        title="Download complete original PDF with questions & solution sheets"
                      >
                        <Download className="w-3.5 h-3.5" /> DOWNLOAD {pSize ? `(${pSize})` : ''}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Back to courses button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </button>

      {/* Tabs navigation */}
      {selectedTopicIndex === null && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            📁 Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            🕒 History
          </button>
        </div>
      )}

      {/* Tab 1: Content */}
      {activeTab === 'content' && (
        <>
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center text-amber-500 font-bold border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
              ⏳ Loading Course Folders...
            </div>
          ) : selectedTopicIndex !== null ? (
            renderSubjectContent()
          ) : topics.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center text-zinc-500 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-800 shadow-sm">
              ⚠️ Abhi batch start nahi hua ya koi content available nahi hai.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topics.map((t, i) => {
                const sName = cleanName(t.topicName || t.title || t.name) || `Folder ${i + 1}`;
                const classCount = (t.classes || t.videos || [t]).length;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedTopicIndex(i);
                      setChapterFilter('all');
                    }}
                    className="bg-white dark:bg-zinc-900 hover:bg-amber-50/50 dark:hover:bg-zinc-800/80 rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={FOLDER_AVATAR}
                        alt="Folder"
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-500 shrink-0 bg-black group-hover:scale-105 transition-transform"
                      />
                      <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                        {sName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                        {classCount} Classes
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          {batchData.banner && (
            <img
              src={batchData.banner}
              alt={batchTitle}
              className="w-full max-h-64 object-cover rounded-xl shadow-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_THUMB;
              }}
            />
          )}

          <div>
            <h2 className="text-lg sm:text-2xl font-black text-amber-500 mb-2">{batchTitle}</h2>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Price: {batchData.discountPrice ? `₹${batchData.discountPrice}` : 'FREE'}
              {batchData.originalPrice && (
                <span className="ml-2 text-zinc-400 line-through">₹${batchData.originalPrice}</span>
              )}
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Description */}
          <div>
            <h4 className="font-bold text-sm sm:text-base text-amber-500 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Batch Description
            </h4>
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {typeof batchData.description === 'string'
                ? batchData.description
                : Array.isArray(batchData.description)
                ? batchData.description.join('\n')
                : batchData.about || 'Complete course content with comprehensive study modules.'}
            </div>
          </div>

          {/* Faculty Details */}
          {batchData.facultyDetails && batchData.facultyDetails.length > 0 && (
            <div>
              <h4 className="font-bold text-sm sm:text-base text-amber-500 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Faculty Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {batchData.facultyDetails.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3"
                  >
                    {f.image || f.photo ? (
                      <img
                        src={f.image || f.photo}
                        alt={f.name || 'Teacher'}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                        {f.name || f.teacherName || 'Faculty Member'}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {f.bio || f.description || 'Subject Expert'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {batchData.faqs && batchData.faqs.length > 0 && (
            <div>
              <h4 className="font-bold text-sm sm:text-base text-amber-500 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
              </h4>
              <div className="space-y-2">
                {batchData.faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 p-3 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between cursor-pointer font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      <span>{faq.question || faq.q}</span>
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-700 pt-2">
                      {faq.answer || faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Timetable / Today's Classes */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h4 className="font-bold text-sm sm:text-base text-rose-500 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500" /> Today's Live & Upcoming Classes
            </h4>

            {todaysClasses.length === 0 ? (
              <p className="text-xs sm:text-sm text-zinc-400 text-center py-6">
                No classes scheduled for today.
              </p>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((cls, idx) => {
                  const isLive = cls.isLive && cls.streamStatus !== 'ended';
                  const isUpcoming = cls.startDate && new Date(cls.startDate) > new Date();
                  const recordings = getRecordings(cls);
                  const vLink = cls.class_link || cls.streamUrl || cls.url || recordings[0]?.url;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                            {cls.title}
                          </h5>
                          {isLive ? (
                            <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white live-indicator" /> LIVE
                            </span>
                          ) : isUpcoming ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded-full">
                              Upcoming
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        {cls.startDate && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(cls.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      {isLive && vLink && (
                        <button
                          type="button"
                          onClick={() => onPlayVideo(vLink, cls.title, recordings)}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 self-end sm:self-center shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Join Live
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm sm:text-base text-amber-500 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Watch History
            </h4>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs sm:text-sm">
              🕒 Abhi tak aapne is batch ki koi video nahi dekhi hai.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h5 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {item.title}
                    </h5>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Watched on: {new Date(item.time).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPlayVideo(item.url, item.title)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 self-end sm:self-center shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> PLAY AGAIN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

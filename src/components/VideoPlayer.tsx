import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  X,
  Maximize,
  Minimize,
  Download,
  FastForward,
  RotateCcw,
  AlertCircle,
  Play,
  Settings,
  Check,
  Signal
} from 'lucide-react';

export interface VideoRecordingOption {
  quality?: string;
  url: string;
  size?: number; // size in MB
}

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  recordings?: VideoRecordingOption[];
  onClose: () => void;
  onAddToHistory?: (url: string, title: string) => void;
}

interface HlsQualityLevel {
  index: number;
  height: number;
  label: string;
  bitrate: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoTitle,
  recordings = [],
  onClose,
  onAddToHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeMediaUrl, setActiveMediaUrl] = useState<string>(videoUrl);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasResumeTime, setHasResumeTime] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Quality State
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto'); // 'Auto' | '720p' | '480p' | '360p' | '240p'
  const [hlsLevels, setHlsLevels] = useState<HlsQualityLevel[]>([]);
  const [qualityToast, setQualityToast] = useState<string | null>(null);
  const [pendingResumeTime, setPendingResumeTime] = useState<number | null>(null);

  const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const STANDARD_QUALITIES = ['Auto', '720p', '480p', '360p', '240p'];

  // Temporary toast notification on video
  const showQualityNotice = (text: string) => {
    setQualityToast(text);
    setTimeout(() => {
      setQualityToast((prev) => (prev === text ? null : prev));
    }, 2500);
  };

  // Robust Close Handler: cleanup video, HLS, exit fullscreen, and trigger onClose
  const handleClose = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch {}
    }

    onClose();
  }, [onClose]);

  // Fullscreen event listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Helper: Extract YouTube ID cleanly
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const ytId = getYouTubeId(activeMediaUrl || videoUrl);
  const isYouTube = Boolean(ytId);

  // When videoUrl changes from outside
  useEffect(() => {
    setPlaybackError(null);
    setActiveMediaUrl(videoUrl);
    setSelectedQuality('Auto');
    setHlsLevels([]);
  }, [videoUrl]);

  // Save to history once opened
  useEffect(() => {
    if (videoUrl && onAddToHistory) {
      onAddToHistory(videoUrl, videoTitle);
    }
  }, [videoUrl, videoTitle, onAddToHistory]);

  // Check saved progress
  useEffect(() => {
    const progressKey = `vid_progress_${encodeURIComponent(videoUrl)}`;
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      const parsed = parseFloat(saved);
      if (parsed > 5) {
        setHasResumeTime(parsed);
      }
    }
  }, [videoUrl]);

  // Main video initialization and HLS handling
  useEffect(() => {
    if (!activeMediaUrl || isYouTube) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Destroy previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setPlaybackError(null);

    const isM3U8 =
      activeMediaUrl.includes('.m3u8') ||
      (!activeMediaUrl.includes('.mp4') && !activeMediaUrl.includes('.webm'));

    if (isM3U8) {
      const streamProxyUrl = `/api/stream-proxy?url=${encodeURIComponent(activeMediaUrl)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });

        hls.loadSource(streamProxyUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          videoElement.playbackRate = playbackSpeed;

          // Extract available HLS quality levels
          if (data.levels && data.levels.length > 0) {
            const parsed: HlsQualityLevel[] = data.levels.map((lvl, index) => {
              let h = lvl.height || 0;
              if (!h && lvl.attrs && typeof lvl.attrs.RESOLUTION === 'string') {
                const parts = lvl.attrs.RESOLUTION.split('x');
                if (parts.length === 2) {
                  h = parseInt(parts[1], 10) || 0;
                }
              }
              return {
                index,
                height: h,
                label: h > 0 ? `${h}p` : `Level ${index + 1}`,
                bitrate: lvl.bitrate || 0,
              };
            });
            setHlsLevels(parsed);
          }

          // Apply saved progress if initial load
          const progressKey = `vid_progress_${encodeURIComponent(videoUrl)}`;
          const saved = localStorage.getItem(progressKey);
          if (saved) {
            const t = parseFloat(saved);
            if (t > 5 && (!videoElement.duration || t < videoElement.duration - 5)) {
              videoElement.currentTime = t;
            }
          }

          // Restore pending switch time if any
          if (pendingResumeTime !== null) {
            videoElement.currentTime = pendingResumeTime;
            setPendingResumeTime(null);
          }

          videoElement.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.warn('HLS Fatal error:', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                // If MP4 recordings exist, automatically fallback to MP4 recording
                if (recordings.length > 0) {
                  const fallbackRec =
                    recordings.find((r) => r.quality?.includes('480')) || recordings[0];
                  setActiveMediaUrl(fallbackRec.url);
                } else {
                  setPlaybackError('Stream network error. Try switching resolution below.');
                }
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari HLS
        videoElement.src = streamProxyUrl;
        videoElement.playbackRate = playbackSpeed;
        videoElement.play().catch(() => {});
      } else {
        // Fallback to MP4 if available
        if (recordings.length > 0) {
          setActiveMediaUrl(recordings[0].url);
        } else {
          videoElement.src = activeMediaUrl;
          videoElement.play().catch(() => {});
        }
      }
    } else {
      // Direct MP4 / WebM video
      videoElement.src = activeMediaUrl;
      videoElement.playbackRate = playbackSpeed;
      if (pendingResumeTime !== null) {
        videoElement.currentTime = pendingResumeTime;
        setPendingResumeTime(null);
      }
      videoElement.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeMediaUrl, isYouTube, recordings, playbackSpeed, videoUrl]);

  // Handle Quality Selection: Auto, 240p, 360p, 480p, 720p
  const handleSelectQuality = (targetQuality: string) => {
    setSelectedQuality(targetQuality);

    // 1. AUTO selected: reset HLS to adaptive level (-1)
    if (targetQuality === 'Auto') {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = -1;
        hlsRef.current.loadLevel = -1;
      } else if (activeMediaUrl !== videoUrl) {
        // Switch back to master HLS stream
        const currentT = videoRef.current?.currentTime || 0;
        setPendingResumeTime(currentT);
        setActiveMediaUrl(videoUrl);
      }
      showQualityNotice('⚡ Quality: Auto (Adaptive HLS)');
      return;
    }

    const targetHeight = parseInt(targetQuality.replace(/\D/g, ''), 10);

    // 2. Check if active HLS instance has this quality level
    if (hlsRef.current && hlsLevels.length > 0) {
      // Find exact level matching height
      let match = hlsLevels.find((l) => l.height === targetHeight);

      // If no exact match, find closest level
      if (!match) {
        let minDiff = Infinity;
        hlsLevels.forEach((l) => {
          const diff = Math.abs((l.height || 0) - targetHeight);
          if (diff < minDiff) {
            minDiff = diff;
            match = l;
          }
        });
      }

      if (match) {
        // Force HLS to this exact level!
        hlsRef.current.currentLevel = match.index;
        hlsRef.current.loadLevel = match.index;
        hlsRef.current.nextLevel = match.index;
        showQualityNotice(`🎬 Switched to ${targetQuality} (${match.label})`);
        return;
      }
    }

    // 3. If HLS does not have it, or not currently playing HLS, check MP4 recordings
    if (recordings.length > 0) {
      const recMatch = recordings.find(
        (r) =>
          r.quality?.toLowerCase().includes(targetQuality.toLowerCase()) ||
          (targetHeight && r.quality?.includes(String(targetHeight)))
      );

      if (recMatch) {
        const currentT = videoRef.current?.currentTime || 0;
        setPendingResumeTime(currentT);
        setActiveMediaUrl(recMatch.url);
        showQualityNotice(
          `🎬 Switched to ${targetQuality} MP4 ${recMatch.size ? `(${recMatch.size} MB)` : ''}`
        );
        return;
      }
    }

    // 4. Fallback: if HLS is active but levels were not parsed yet, still instruct HLS or give notice
    if (hlsRef.current) {
      // Estimate level index from heights
      if (targetHeight === 240) hlsRef.current.currentLevel = 0;
      else if (targetHeight === 360) hlsRef.current.currentLevel = 1;
      else if (targetHeight === 480) hlsRef.current.currentLevel = 2;
      else if (targetHeight === 720) hlsRef.current.currentLevel = 3;
    }
    showQualityNotice(`🎬 Quality set to ${targetQuality}`);
  };

  // Track playback time
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 5) {
      const progressKey = `vid_progress_${encodeURIComponent(videoUrl)}`;
      localStorage.setItem(progressKey, video.currentTime.toString());
    }
  };

  const handleSpeedCycle = () => {
    const currentIdx = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const handleToggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen failed:', err);
      }
    }
  };

  const handleDownload = () => {
    const dlUrl = activeMediaUrl || videoUrl;
    const a = document.createElement('a');
    a.href = dlUrl;
    a.target = '_blank';
    a.download = `${videoTitle.replace(/[^a-zA-Z0-9_\-\u0900-\u097F\s.]/g, '').trim().replace(/\s+/g, '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const ytEmbedUrl =
    isYouTube && ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&controls=1&playsinline=1&enablejsapi=1`
      : '';

  return (
    <div
      ref={containerRef}
      className="sticky top-16 z-30 mb-6 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500 transition-all select-none"
    >
      {/* Top Bar Controls */}
      <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-b border-zinc-800 relative z-20">
        <span
          className="text-xs sm:text-sm font-bold text-amber-400 truncate max-w-[34%]"
          title={videoTitle}
        >
          {videoTitle || 'Playing Video'}
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Speed selector */}
          <button
            type="button"
            onClick={handleSpeedCycle}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
            title="Change Playback Speed"
          >
            <FastForward className="w-3 h-3" />
            {playbackSpeed}x
          </button>

          {/* Quick Quality Dropdown Selector */}
          <div className="relative">
            <select
              value={selectedQuality}
              onChange={(e) => handleSelectQuality(e.target.value)}
              className="bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-bold px-2 py-1 rounded cursor-pointer outline-none transition-colors border border-sky-500/50"
              title="Select Video Quality / Resolution"
            >
              {STANDARD_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q === 'Auto' ? '⚡ Auto' : q}
                </option>
              ))}
              {recordings.map((rec, idx) => (
                <option key={`rec_${idx}`} value={rec.quality || `MP4_${idx}`}>
                  {rec.quality || `MP4`} {rec.size ? `(${rec.size}MB)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
            title="Download Video"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">DOWNLOAD</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* Close button with explicit X and CLOSE text */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 active:scale-90 text-white text-[11px] font-extrabold rounded flex items-center gap-1 transition-all cursor-pointer shadow-md shrink-0"
            title="Close Player"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>CLOSE</span>
          </button>
        </div>
      </div>

      {/* Video Content Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {isYouTube && ytEmbedUrl ? (
          <iframe
            src={ytEmbedUrl}
            title={videoTitle}
            className="w-full h-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (pendingResumeTime !== null && videoRef.current) {
                videoRef.current.currentTime = pendingResumeTime;
                setPendingResumeTime(null);
              }
              if (videoRef.current) {
                videoRef.current.playbackRate = playbackSpeed;
              }
            }}
            onError={() => {
              if (recordings.length > 0 && activeMediaUrl === videoUrl) {
                // Auto switch to MP4 recording
                setActiveMediaUrl(recordings[0].url);
              } else {
                setPlaybackError('Video loading issue. Try selecting 240p or 360p below.');
              }
            }}
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Floating Close button in Fullscreen mode */}
        {isFullscreen && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-3 right-3 z-50 bg-rose-600/90 hover:bg-rose-600 text-white p-2 rounded-full shadow-2xl backdrop-blur-md active:scale-90 transition-all cursor-pointer"
            title="Close Video"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Quality Switch Toast Notification Banner */}
        {qualityToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 text-amber-300 border border-amber-500/50 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 pointer-events-none flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <span>{qualityToast}</span>
          </div>
        )}

        {/* Error Notification with Fallback Action */}
        {playbackError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-20">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-white text-xs sm:text-sm font-semibold mb-3 max-w-sm">
              {playbackError}
            </p>
            {recordings.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {recordings.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPlaybackError(null);
                      setActiveMediaUrl(r.url);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" /> Play {r.quality || 'MP4'}{' '}
                    {r.size ? `(${r.size} MB)` : ''}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPlaybackError(null);
                  setActiveMediaUrl(videoUrl);
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Retry Stream
              </button>
            )}
          </div>
        )}

        {/* Resume timestamp badge */}
        {hasResumeTime && (
          <div className="absolute bottom-14 left-4 bg-black/85 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg border border-amber-500/50 flex items-center gap-2 z-10 shadow-lg">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Resumed from {Math.floor(hasResumeTime / 60)}:
              {String(Math.floor(hasResumeTime % 60)).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setHasResumeTime(null);
              }}
              className="ml-1 text-amber-400 hover:underline font-bold cursor-pointer"
            >
              Restart
            </button>
          </div>
        )}
      </div>

      {/* Prominent Resolution / Quality Selector Bar Directly Under Video */}
      {!isYouTube && (
        <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-zinc-300">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Quality / Resolution:</span>
            <span className="text-[11px] font-normal text-zinc-400">
              (Current: <strong className="text-amber-400">{selectedQuality}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STANDARD_QUALITIES.map((q) => {
              const isSelected = selectedQuality === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSelectQuality(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                  title={`Switch to ${q} video stream`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {q === 'Auto' ? 'Auto' : q}
                </button>
              );
            })}

            {/* If extra MP4 recordings exist with specific sizes, show quick buttons */}
            {recordings.map((rec, i) => {
              const label = rec.quality || `MP4 ${i + 1}`;
              const isSelected = activeMediaUrl === rec.url;
              return (
                <button
                  key={`rec_btn_${i}`}
                  type="button"
                  onClick={() => {
                    setSelectedQuality(label);
                    const currentT = videoRef.current?.currentTime || 0;
                    setPendingResumeTime(currentT);
                    setActiveMediaUrl(rec.url);
                    showQualityNotice(`🎬 Switched to ${label}`);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  {label} {rec.size ? `(${rec.size}M)` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

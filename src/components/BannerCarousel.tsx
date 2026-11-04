import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

export interface BannerItem {
  url: string;
  caption: string;
  link: string;
  btnText: string;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    url: "https://i.postimg.cc/HsdCssJm/file-00000000312c8211af3da971ade18b97.png",
    caption: "Join WhatsApp Channel for Free Notes & Daily Updates 👉",
    link: "https://whatsapp.com/channel/0029VbDcWLp8PgsHZKtwRd0z",
    btnText: "Join Channel"
  },
  {
    url: "https://i.postimg.cc/VNBsPsBJ/file-00000000e1bc8211af2c3e40e48a2a47.png",
    caption: "Follow on Instagram for Exam Guidance & Short Tricks 👉",
    link: "https://www.instagram.com/abhasingh1909?stkn=aWpxamhjN3YwNWQw",
    btnText: "Follow Now"
  },
  {
    url: "https://i.postimg.cc/sfQj4nsN/IMG-20260528-111712.jpg",
    caption: "Download Selection Way App for Complete Test Series 👉",
    link: "https://telepack.cloud/app/s/c47512f16582ed50",
    btnText: "Download Now"
  },
  {
    url: "https://i.postimg.cc/hPgknKj9/IMG-20261009-045320-475.jpg",
    caption: "Quality Education for All - By Pandey Ji UP⁴³",
    link: "",
    btnText: ""
  },
  {
    url: "https://i.postimg.cc/bwZ3c5QN/IMG-20261008-124426-447.jpg",
    caption: "Scan QR Code for Direct App Download 👆",
    link: "",
    btnText: ""
  }
];

export const BannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEFAULT_BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? DEFAULT_BANNERS.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % DEFAULT_BANNERS.length);
  };

  const current = DEFAULT_BANNERS[currentIndex];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-lg bg-zinc-950 mb-6 group border border-amber-500/20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Banner Viewport */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 flex items-center justify-center overflow-hidden bg-black">
        {current.url.endsWith('.mp4') ? (
          <video
            src={current.url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={current.url}
            alt={current.caption || 'Course Banner'}
            className="w-full h-full object-contain sm:object-cover transition-opacity duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://i.postimg.cc/7PF6SP6R/file-000000009290821187ff34aaef4ccaf2.png';
            }}
          />
        )}

        {/* Bottom Overlay Info & Action */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 flex items-center justify-between gap-3 text-white">
          <p className="text-xs sm:text-sm font-semibold truncate drop-shadow max-w-[70%]">
            {current.caption || '⚡ 𝐎𝐖𝐍𝐄𝐑 ➛ 𝐏𝐀ⲛDЕY 𝐉𝐈 UP⁴³'}
          </p>
          {current.link && current.btnText && (
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
            >
              {current.btnText}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Nav Controls */}
      <button
        type="button"
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer z-10"
        title="Previous banner"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer z-10"
        title="Next banner"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Pagination indicators */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {DEFAULT_BANNERS.map((_, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === currentIndex ? 'w-6 bg-amber-500' : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Download, FileText, Printer, CheckCircle } from 'lucide-react';
import { downloadFullOriginalPdf } from '../utils/pdf';

interface PdfModalProps {
  url: string;
  title: string;
  fileSize?: string;
  chapterName?: string;
  courseName?: string;
  onClose: () => void;
}

export const PdfModal: React.FC<PdfModalProps> = ({
  url,
  title,
  fileSize,
  chapterName = 'General Chapter',
  courseName = 'Course Material',
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    url
  )}&embedded=true`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFullOriginalPdf(url, title || 'Study_Document', courseName, chapterName);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const handlePrint = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-amber-400 truncate" title={title}>
              {title} (PDF)
            </h2>
            {fileSize && (
              <span className="text-[11px] text-zinc-400 font-medium">
                Size: <span className="text-emerald-400 font-bold">{fileSize}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Download Complete PDF (Questions + Sheets) */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Download full original PDF with questions & solution sheets"
          >
            {downloading ? (
              <CheckCircle className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>
              {downloading ? 'Saving to Phone...' : `Download Offline PDF ${fileSize ? `(${fileSize})` : ''}`}
            </span>
          </button>

          {/* Open in new tab / Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg active:scale-95 transition-all cursor-pointer"
            title="Open original in Browser"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Close modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg active:scale-95 transition-all cursor-pointer"
            title="Close Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main PDF Viewport with Watermark Overlay */}
      <div className="relative flex-1 w-full h-full bg-zinc-950 overflow-hidden">
        {/* Subtle Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 watermark-overlay opacity-25 select-none" />

        <iframe
          src={googleViewerUrl}
          title={title}
          className="w-full h-full border-0 bg-white"
          allow="autoplay"
        />
      </div>
    </div>
  );
};

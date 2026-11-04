import React from 'react';
import { AlertTriangle, MessageCircle, Check } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
        <div className="flex items-center justify-center gap-2 text-amber-500 font-extrabold text-base sm:text-lg mb-3 pb-2 border-b border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span>Disclaimer / Notice</span>
        </div>

        <div className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 space-y-2.5 my-4">
          <p>
            यह ऐप/वेबसाइट केवल <b>Educational Purpose (शैक्षणिक उद्देश्य)</b> के लिए बनाई गई है। इस ऐप/वेबसाइट को सभी विद्यार्थियों के लिए <b>Free</b> रखा गया है और किसी भी व्यक्ति से इसके लिए कोई शुल्क नहीं लिया जाता है।
          </p>
          <p>
            इस ऐप/वेबसाइट पर उपलब्ध Content, <b>Gagan Sir Team</b> का है। यदि Gagan Sir Team या किसी अन्य संबंधित अधिकारधारी को किसी Content को लेकर कोई समस्या या आपत्ति है, तो कृपया हमसे संपर्क करें। शिकायत प्राप्त होने पर संबंधित Content को हटा दिया जाएगा।
          </p>
          <div className="pt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Thank You ❤️<br />
            Content: Gagan Sir Team<br />
            Developer: Pandey Ji UP⁴³
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <a
            href="https://share.google/8i0ZeYWx3Ymc3SCRe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Admin
          </a>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            I Understand (OK)
          </button>
        </div>
      </div>
    </div>
  );
};

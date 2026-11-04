// In-memory size cache
const sizeCache = new Map<string, string>();

// Concurrency queue for resolving PDF sizes
type QueueItem = {
  url: string;
  resolve: (val: string) => void;
};
const queue: QueueItem[] = [];
let activeWorkers = 0;
const MAX_CONCURRENT = 4;

function processQueue() {
  if (activeWorkers >= MAX_CONCURRENT || queue.length === 0) return;
  const item = queue.shift();
  if (!item) return;

  activeWorkers++;
  fetch(`/api/pdf-size?url=${encodeURIComponent(item.url)}`)
    .then(res => res.json())
    .then(data => {
      const formatted = data.formatted || 'PDF';
      sizeCache.set(item.url, formatted);
      try {
        localStorage.setItem(`pdf_size_${item.url}`, formatted);
      } catch {}
      item.resolve(formatted);
    })
    .catch(() => {
      item.resolve('PDF');
    })
    .finally(() => {
      activeWorkers--;
      processQueue();
    });
}

/**
 * Returns cached size or fetches real size in MB
 */
export function getCachedOrFetchPdfSize(url: string): Promise<string> {
  if (!url) return Promise.resolve('');

  // 1. Check in-memory cache
  if (sizeCache.has(url)) {
    return Promise.resolve(sizeCache.get(url)!);
  }

  // 2. Check localStorage cache
  try {
    const saved = localStorage.getItem(`pdf_size_${url}`);
    if (saved) {
      sizeCache.set(url, saved);
      return Promise.resolve(saved);
    }
  } catch {}

  // 3. Queue request
  return new Promise<string>((resolve) => {
    queue.push({ url, resolve });
    processQueue();
  });
}

/**
 * Downloads the complete original PDF directly into the student's mobile storage
 * with stylish "PANDEY JI FREE CONTENT PROVIDER" cover page prepended at Page 1.
 * Uses application/pdf Blob to ensure Android saves it directly in Downloads
 * and associates it with offline PDF Viewers instead of opening in Chrome.
 */
export async function downloadFullOriginalPdf(
  url: string,
  title: string,
  course: string = 'Course Material',
  chapter: string = 'General Chapter'
): Promise<void> {
  const safeAscii = (
    title
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^\_+|\_+$/g, '')
      .slice(0, 50) || 'Pandey_Ji_Notes'
  );
  const fileName = `${safeAscii}.pdf`;

  const downloadEndpoint = `/api/download-pdf?url=${encodeURIComponent(url)}&title=${encodeURIComponent(
    title
  )}&course=${encodeURIComponent(course)}&chapter=${encodeURIComponent(chapter)}`;

  // Notify UI of download starting
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: {
        message: `📥 Downloading "${safeAscii.slice(0, 24)}..." for offline reading...`,
        type: 'info'
      }
    })
  );

  try {
    // Strategy 1: Fetch through local proxy with Cover Page and convert to direct application/pdf Blob
    const response = await fetch(downloadEndpoint);
    if (response.ok) {
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      }, 3000);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `✅ PDF saved in device Downloads! Open anytime offline in PDF Viewer.`,
            type: 'success'
          }
        })
      );
      return;
    }
  } catch (err) {
    console.warn('Proxy download failed, trying direct blob fetch:', err);
  }

  // Strategy 2: Direct URL fetch fallback (e.g. static Vercel deployment)
  try {
    const directRes = await fetch(url);
    if (directRes.ok) {
      const blob = await directRes.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      }, 3000);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `✅ Original PDF saved to device for offline study!`,
            type: 'success'
          }
        })
      );
      return;
    }
  } catch (directErr) {
    console.warn('Direct fetch failed, falling back to direct link click:', directErr);
  }

  // Strategy 3: Standard anchor download fallback
  const a = document.createElement('a');
  a.href = downloadEndpoint;
  a.download = fileName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 1500);

  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: {
        message: `📥 PDF download initiated in your browser!`,
        type: 'info'
      }
    })
  );
}


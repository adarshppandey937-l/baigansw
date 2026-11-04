import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const API_BASE = "https://gdgoenkaratia.com/api";

// In-memory cache for fast lookups
const sizeCache = new Map<string, { size: number; formatted: string; timestamp: number }>();
const apiCache = new Map<string, { data: any; timestamp: number }>();

app.use(express.json());

// CORS headers for all local routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper: Always format in MB as requested ("sbhi ka size mb me show ho")
function formatBytesToMb(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.00 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// 1. API: Fast PDF / File Size Detection Endpoint (Always in MB)
app.get('/api/pdf-size', async (req: Request, res: Response) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check cache (valid for 1 hour)
  const cached = sizeCache.get(fileUrl);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return res.json({ size: cached.size, formatted: cached.formatted, fromCache: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    // Try HEAD request first
    let response = await fetch(fileUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    let contentLength = response.headers.get('content-length');

    // If HEAD failed or blocked, try Range request
    if (!contentLength || response.status === 405 || response.status === 403 || !response.ok) {
      const rangeController = new AbortController();
      const rangeTimeout = setTimeout(() => rangeController.abort(), 7000);

      const rangeRes = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: rangeController.signal
      });
      clearTimeout(rangeTimeout);

      const contentRange = rangeRes.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match && match[1]) {
          contentLength = match[1];
        }
      }
      if (!contentLength) {
        contentLength = rangeRes.headers.get('content-length');
      }
    }

    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const formatted = formatBytesToMb(bytes);
      sizeCache.set(fileUrl, { size: bytes, formatted, timestamp: Date.now() });
      return res.json({ size: bytes, formatted, fromCache: false });
    }

    return res.json({ size: null, formatted: 'PDF', fromCache: false });
  } catch (err: any) {
    return res.json({ size: null, formatted: 'PDF', error: err.message });
  }
});

// 2. API: Download Complete Original PDF with Stylish "PANDEY JI FREE CONTENT PROVIDER" First Page
app.get('/api/download-pdf', async (req: Request, res: Response) => {
  const fileUrl = req.query.url as string;
  let title = (req.query.title as string) || 'Document';
  let course = (req.query.course as string) || 'Course Content';
  let chapter = (req.query.chapter as string) || 'General Chapter';

  if (!fileUrl) {
    return res.status(400).send('PDF URL is required');
  }

  // Clean filename for safe downloading on user phones/tablets
  let cleanTitle = title.replace(/[^a-zA-Z0-9_\-\u0900-\u097F\s.]/g, '').trim().replace(/\s+/g, '_');
  if (!cleanTitle.toLowerCase().endsWith('.pdf')) {
    cleanTitle += '.pdf';
  }

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf, */*'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Failed to fetch original PDF from server');
    }

    const originalBuffer = await upstream.arrayBuffer();

    try {
      // Load original PDF using pdf-lib
      const pdfDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });

      // Embed fonts
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Insert Page 0: Stylish Cover Page for Offline Mobile Reading
      const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]); // A4 Size
      const { width, height } = coverPage.getSize();

      // Outer Decorative Border
      coverPage.drawRectangle({
        x: 18,
        y: 18,
        width: width - 36,
        height: height - 36,
        borderColor: rgb(0.98, 0.52, 0.12), // Saffron border
        borderWidth: 2,
        color: rgb(1, 1, 1)
      });

      // Top Header Saffron Banner
      coverPage.drawRectangle({
        x: 20,
        y: height - 170,
        width: width - 40,
        height: 150,
        color: rgb(0.98, 0.52, 0.12)
      });

      // Banner Branding Text
      coverPage.drawText('PANDEY JI UP43', {
        x: 40,
        y: height - 65,
        size: 26,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      coverPage.drawText('FREE CONTENT PROVIDER - NOT FOR SALE', {
        x: 40,
        y: height - 95,
        size: 13,
        font: fontBold,
        color: rgb(1, 0.95, 0.6)
      });

      coverPage.drawText('Official Offline Study Material, Question Sheets & Solutions', {
        x: 40,
        y: height - 120,
        size: 10.5,
        font: fontRegular,
        color: rgb(1, 1, 1)
      });

      coverPage.drawText('100% Free Education For All Students • No Fees Ever', {
        x: 40,
        y: height - 145,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      // Verification Badge Box
      let currentY = height - 230;
      coverPage.drawRectangle({
        x: 35,
        y: currentY,
        width: width - 70,
        height: 44,
        borderColor: rgb(0.2, 0.65, 0.3),
        borderWidth: 1.5,
        color: rgb(0.94, 0.99, 0.95)
      });

      coverPage.drawText('CERTIFIED FREE STUDY MATERIAL • COMPLETE QUESTION SHEET', {
        x: 50,
        y: currentY + 26,
        size: 10.5,
        font: fontBold,
        color: rgb(0.1, 0.55, 0.2)
      });

      coverPage.drawText('Downloaded for offline viewing. Full original lecture notes attached from Page 2.', {
        x: 50,
        y: currentY + 10,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2)
      });

      // Course Details Card Box
      currentY -= 170;
      coverPage.drawRectangle({
        x: 35,
        y: currentY,
        width: width - 70,
        height: 155,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.99)
      });

      coverPage.drawText('COURSE & DOCUMENT DETAILS:', {
        x: 50,
        y: currentY + 130,
        size: 12,
        font: fontBold,
        color: rgb(0.95, 0.45, 0.05)
      });

      coverPage.drawText(`Course Name:   ${course.slice(0, 60)}`, {
        x: 50,
        y: currentY + 105,
        size: 10,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15)
      });

      coverPage.drawText(`Chapter/Topic:  ${chapter.slice(0, 60)}`, {
        x: 50,
        y: currentY + 80,
        size: 10,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25)
      });

      coverPage.drawText(`Lecture/Sheet:  ${title.slice(0, 60)}`, {
        x: 50,
        y: currentY + 55,
        size: 10,
        font: fontBold,
        color: rgb(0.85, 0.35, 0)
      });

      coverPage.drawText(`Downloaded on: ${new Date().toLocaleDateString('en-GB')}  |  Original Pages: ${pdfDoc.getPageCount() - 1}`, {
        x: 50,
        y: currentY + 30,
        size: 9,
        font: fontRegular,
        color: rgb(0.45, 0.45, 0.45)
      });

      // Offline Reading & Study Guidelines Card
      currentY -= 140;
      coverPage.drawRectangle({
        x: 35,
        y: currentY,
        width: width - 70,
        height: 125,
        borderColor: rgb(0.88, 0.88, 0.88),
        borderWidth: 1,
        color: rgb(1, 1, 1)
      });

      coverPage.drawText('IMPORTANT INSTRUCTIONS FOR STUDENTS:', {
        x: 50,
        y: currentY + 102,
        size: 11,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      });

      coverPage.drawText('1. Complete teacher questions, board solutions & practice sheets are from Page 2.', {
        x: 50,
        y: currentY + 80,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });

      coverPage.drawText('2. This PDF is saved in your device storage - open anytime offline without internet.', {
        x: 50,
        y: currentY + 60,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });

      coverPage.drawText('3. Strictly for personal educational use. Selling this PDF is strictly prohibited.', {
        x: 50,
        y: currentY + 40,
        size: 9,
        font: fontRegular,
        color: rgb(0.7, 0.15, 0.15)
      });

      coverPage.drawText('4. Dedicated support by Pandey Ji UP43 - Keep studying and achieve your dream!', {
        x: 50,
        y: currentY + 20,
        size: 9,
        font: fontBold,
        color: rgb(0.15, 0.55, 0.2)
      });

      // Motivational Quote Card Box
      currentY -= 95;
      coverPage.drawRectangle({
        x: 35,
        y: currentY,
        width: width - 70,
        height: 80,
        color: rgb(0.98, 0.96, 0.9)
      });

      coverPage.drawText('"Mehnat itni khamoshi se karo ki safalta shor macha de!"', {
        x: 50,
        y: currentY + 48,
        size: 11,
        font: fontBold,
        color: rgb(0.85, 0.4, 0)
      });

      coverPage.drawText('Join Official WhatsApp Channel & Download Selection Way App for mock tests.', {
        x: 50,
        y: currentY + 24,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });

      // Watermark in background of cover page
      coverPage.drawText('PANDEY JI UP43 - FREE CONTENT', {
        x: width / 2 - 180,
        y: height / 2 - 40,
        size: 24,
        font: fontBold,
        color: rgb(0.98, 0.52, 0.12),
        opacity: 0.12,
        rotate: degrees(30)
      });

      // Bottom Footer Bar
      coverPage.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: 38,
        color: rgb(0.15, 0.15, 0.15)
      });

      coverPage.drawText('Developer: Pandey Ji UP43  |  Content: Gagan Sir Team  |  100% Free Educational Portal', {
        x: 40,
        y: 33,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.9, 0.9, 0.9)
      });

      const finalPdfBytes = await pdfDoc.save();

      // Ensure clean ASCII filename for older Android/mobile file managers + UTF-8 RFC 5987 for modern browsers
      const baseName = cleanTitle.replace(/\.pdf$/i, '');
      const safeAscii = baseName
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^\_+|\_+$/g, '')
        .slice(0, 50) || 'Pandey_Ji_Notes';
      const safeFilename = `${safeAscii}.pdf`;
      const utf8Filename = encodeURIComponent(baseName.trim() + '.pdf');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`
      );
      res.setHeader('Content-Length', finalPdfBytes.byteLength.toString());
      res.setHeader('Content-Transfer-Encoding', 'binary');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(Buffer.from(finalPdfBytes));

    } catch (pdfErr) {
      console.warn('Cover page prepend failed, falling back to original raw PDF:', pdfErr);
      const baseName = cleanTitle.replace(/\.pdf$/i, '');
      const safeAscii = baseName
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^\_+|\_+$/g, '')
        .slice(0, 50) || 'Pandey_Ji_Notes';
      const safeFilename = `${safeAscii}.pdf`;
      const utf8Filename = encodeURIComponent(baseName.trim() + '.pdf');

      // Fallback: send raw original PDF directly with valid download headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`
      );
      res.setHeader('Content-Length', originalBuffer.byteLength.toString());
      res.setHeader('Content-Transfer-Encoding', 'binary');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(Buffer.from(originalBuffer));
    }

  } catch (err: any) {
    console.error('PDF download error:', err);
    if (!res.headersSent) {
      res.status(500).send('Download failed');
    }
  }
});

// 3. API: Courses API Proxy with Caching
app.all('/api/courses-proxy', async (req: Request, res: Response) => {
  const endpoint = (req.query.endpoint as string) || '';
  const targetUrl = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  // Check cache for GET requests (5 minutes)
  const cacheKey = `${req.method}_${targetUrl}_${JSON.stringify(req.body || {})}`;
  if (req.method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return res.json(cached.data);
    }
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*'
    };
    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers
    };

    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    if (req.method === 'GET' && response.ok) {
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch upstream API', details: err.message });
  }
});

// 4. API: Smart Video & HLS Stream Proxy
// Rewrites M3U8 relative URLs so that all sub-playlists and TS segments play with full CORS
app.get('/api/stream-proxy', async (req: Request, res: Response) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).send('Video URL required');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*'
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(videoUrl, { headers });

    const contentType = upstream.headers.get('content-type') || '';
    const isM3U8 = videoUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('apple');

    // If it's an M3U8 playlist, rewrite relative URLs to absolute proxy URLs
    if (isM3U8 && upstream.ok) {
      const text = await upstream.text();
      const baseUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/') + 1);

      const rewrittenLines = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          return line;
        }
        let absoluteSegmentUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          try {
            absoluteSegmentUrl = new URL(trimmed, baseUrl).href;
          } catch {
            absoluteSegmentUrl = `${baseUrl}${trimmed}`;
          }
        }
        return `/api/stream-proxy?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      const rewrittenM3U8 = rewrittenLines.join('\n');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(rewrittenM3U8);
    }

    // Binary stream (MP4, TS chunks, etc.)
    res.status(upstream.status);
    upstream.headers.forEach((val, key) => {
      const k = key.toLowerCase();
      if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'].includes(k)) {
        res.setHeader(key, val);
      }
    });
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err: any) {
    console.error('Stream proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Stream proxy failure');
    }
  }
});

async function main() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Course Content Server running on port ${PORT}`);
  });
}

main().catch(console.error);

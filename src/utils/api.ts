import { BatchItem, TopicFolder } from '../types';

const DIRECT_API_BASE = "https://gdgoenkaratia.com/api";
const LOCAL_PROXY_BASE = "/api/courses-proxy";

// In-memory runtime cache for batch lists and details
const memoryCache = new Map<string, { data: any; timestamp: number }>();

export async function fetchWithFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cacheKey = `${options.method || 'GET'}_${endpoint}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120000) { // 2 minute cache
    return cached.data as T;
  }

  // Strategy 1: Try local server proxy first (cleanest, handles CORS and caching)
  try {
    const proxyUrl = `${LOCAL_PROXY_BASE}?endpoint=${encodeURIComponent(endpoint)}`;
    const res = await fetch(proxyUrl, options);
    if (res.ok) {
      const data = await res.json();
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    }
  } catch (err) {
    console.warn('Local proxy attempt failed, trying direct API:', err);
  }

  // Strategy 2: Direct API fetch
  try {
    const directUrl = `${DIRECT_API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(directUrl, options);
    if (res.ok) {
      const data = await res.json();
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    }
  } catch (err) {
    console.warn('Direct fetch attempt failed:', err);
  }

  // Strategy 3: CORS proxy fallback
  try {
    const directUrl = `${DIRECT_API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(corsProxyUrl, options);
    if (res.ok) {
      const data = await res.json();
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    }
  } catch (err) {
    console.error('All fetch strategies failed for endpoint:', endpoint, err);
  }

  throw new Error(`Failed to load data from ${endpoint}`);
}

export async function getBatches(): Promise<BatchItem[]> {
  const json = await fetchWithFallback<any>('/courses/');
  return json?.data || json || [];
}

export async function getBatchDetails(batchId: string): Promise<BatchItem> {
  const json = await fetchWithFallback<any>(`/courses/${batchId}`);
  return json?.data || json || {};
}

export async function getBatchClasses(batchId: string): Promise<TopicFolder[]> {
  const json = await fetchWithFallback<any>(`/courses/${batchId}/classes?populate=full`);
  return json?.data?.classes || json?.classes || json?.data || [];
}

export async function getTodaysClasses(batchId: string): Promise<any[]> {
  try {
    const json = await fetchWithFallback<any>(`/courses/${batchId}/todays-classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return json?.data?.classes || json?.classes || [];
  } catch {
    return [];
  }
}

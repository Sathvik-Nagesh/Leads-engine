/**
 * Website Fetcher
 *
 * Fetches website content with:
 * - SSRF protection (always)
 * - Size limits
 * - Timeout
 * - Redirect following
 * - HTTPS detection
 * - Fallback: Jina Reader (if configured)
 *
 * Does NOT use Playwright by default — headless is an escalation step.
 */

import { ssrfGuard, SSRFError } from '@/lib/security/ssrf-guard';
import { env } from '@/lib/env';

export interface FetchResult {
  url: string;                // original URL
  finalUrl: string;           // after redirects
  html: string;               // raw HTML
  statusCode: number;
  httpsEnabled: boolean;
  sslValid: boolean;
  redirectChain: string[];
  loadTimeMs: number;
  contentLength: number;
  error?: string;
  usedJina?: boolean;
  usedHeadless?: boolean;
}

export interface FetchOptions {
  timeout?: number;
  maxBytes?: number;
  followRedirects?: boolean;
  allowJinaFallback?: boolean;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: env.FETCHER_TIMEOUT_MS,
  maxBytes: env.FETCHER_MAX_BYTES,
  followRedirects: true,
  allowJinaFallback: true,
};

/**
 * Fetch a website. Always SSRF-checked.
 * Returns a FetchResult even on error (with error field set).
 */
export async function fetchWebsite(
  rawUrl: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const redirectChain: string[] = [];

  // Ensure URL has scheme
  let url = rawUrl.trim();
  if (!url.startsWith('http')) url = 'https://' + url;

  // SSRF check
  let safeUrl: string;
  try {
    safeUrl = await ssrfGuard(url);
  } catch (err) {
    return makeErrorResult(url, url, String(err), startTime, redirectChain);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout);

    let response: Response;
    let finalUrl = safeUrl;

    try {
      response = await fetch(safeUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': env.FETCHER_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: opts.followRedirects ? 'follow' : 'manual',
      });
      finalUrl = response.url || safeUrl;
    } finally {
      clearTimeout(timer);
    }

    // Track redirects (Node.js fetch doesn't expose chain directly)
    if (finalUrl !== safeUrl) redirectChain.push(finalUrl);

    const httpsEnabled = finalUrl.startsWith('https://');
    const sslValid = httpsEnabled; // If fetch succeeded over HTTPS, cert is valid

    // Check content type
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html') && !contentType.includes('text')) {
      // Not HTML — return minimal result
      return {
        url,
        finalUrl,
        html: '',
        statusCode: response.status,
        httpsEnabled,
        sslValid,
        redirectChain,
        loadTimeMs: Date.now() - startTime,
        contentLength: 0,
        error: `Non-HTML content type: ${contentType}`,
      };
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return makeErrorResult(url, finalUrl, 'No response body', startTime, redirectChain);
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > opts.maxBytes) {
          reader.cancel();
          chunks.push(value.slice(0, opts.maxBytes - (totalBytes - value.length)));
          break;
        }
        chunks.push(value);
      }
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(
      mergeUint8Arrays(chunks)
    );

    return {
      url,
      finalUrl,
      html,
      statusCode: response.status,
      httpsEnabled,
      sslValid,
      redirectChain,
      loadTimeMs: Date.now() - startTime,
      contentLength: totalBytes,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = errMsg.includes('abort') || errMsg.includes('timeout');

    // If it looks like a JS-heavy site (timeout with empty body) and Jina is available,
    // try Jina fallback
    if (isTimeout && opts.allowJinaFallback && env.JINA_API_KEY && env.JINA_BASE_URL) {
      return fetchViaJina(url, startTime);
    }

    return makeErrorResult(url, url, errMsg, startTime, redirectChain);
  }
}

async function fetchViaJina(url: string, startTime: number): Promise<FetchResult> {
  try {
    const jinaUrl = `${env.JINA_BASE_URL}/${encodeURIComponent(url)}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Authorization': `Bearer ${env.JINA_API_KEY}`,
        'Accept': 'text/html',
        'X-Return-Format': 'html',
      },
      signal: AbortSignal.timeout(30_000),
    });

    const html = await response.text();

    return {
      url,
      finalUrl: url,
      html,
      statusCode: response.status,
      httpsEnabled: url.startsWith('https://'),
      sslValid: true,
      redirectChain: [],
      loadTimeMs: Date.now() - startTime,
      contentLength: html.length,
      usedJina: true,
    };
  } catch (err) {
    return makeErrorResult(url, url, `Jina fallback failed: ${String(err)}`, startTime, []);
  }
}

function makeErrorResult(
  url: string,
  finalUrl: string,
  error: string,
  startTime: number,
  redirectChain: string[]
): FetchResult {
  return {
    url,
    finalUrl,
    html: '',
    statusCode: 0,
    httpsEnabled: false,
    sslValid: false,
    redirectChain,
    loadTimeMs: Date.now() - startTime,
    contentLength: 0,
    error,
  };
}

function mergeUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    merged.set(arr, offset);
    offset += arr.length;
  }
  return merged;
}

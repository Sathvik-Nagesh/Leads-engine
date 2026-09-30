/**
 * SSRF Guard
 *
 * Protects the website fetcher from Server-Side Request Forgery attacks.
 * Blocks all requests to private/internal IP ranges, localhost,
 * cloud metadata endpoints, and any other disallowed targets.
 *
 * All fetched URLs MUST pass through ssrfGuard() before any HTTP request.
 */

import { parse as parseUrl } from 'url';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// CIDR ranges that are always blocked (private / loopback / link-local / cloud metadata)
const BLOCKED_CIDRS = [
  // Loopback
  { range: [0x7f000000, 0x7fffffff], bits: 8 },   // 127.0.0.0/8
  // Link-local
  { range: [0xa9fe0000, 0xa9feffff], bits: 16 },  // 169.254.0.0/16
  // Private
  { range: [0x0a000000, 0x0affffff], bits: 8 },   // 10.0.0.0/8
  { range: [0xac100000, 0xac1fffff], bits: 12 },  // 172.16.0.0/12
  { range: [0xc0a80000, 0xc0a8ffff], bits: 16 },  // 192.168.0.0/16
  // Unique-local (IPv6 equivalent handled separately)
  // Multicast
  { range: [0xe0000000, 0xefffffff], bits: 4 },   // 224.0.0.0/4
  // Reserved
  { range: [0xf0000000, 0xffffffff], bits: 4 },   // 240.0.0.0/4
  // Unspecified
  { range: [0x00000000, 0x00000000], bits: 32 },  // 0.0.0.0
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',    // GCP metadata
  '169.254.169.254',             // AWS/GCP/Azure metadata IP
  'fd00:ec2::254',               // AWS metadata IPv6
  '::1',                         // IPv6 loopback
  'ip-ranges.amazonaws.com',
]);

const BLOCKED_HOSTNAME_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /\.internal$/i,
  /\.local$/i,
  /\.localhost$/i,
];

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIP(ip: string): boolean {
  // IPv6 check (simplified)
  if (ip.includes(':')) {
    return (
      ip === '::1' ||
      ip.startsWith('fc') ||
      ip.startsWith('fd') ||
      ip.startsWith('fe80')
    );
  }

  const ipInt = ipToInt(ip);
  return BLOCKED_CIDRS.some(({ range }) => ipInt >= range[0] && ipInt <= range[1]);
}

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Validate a URL against SSRF rules.
 * Throws SSRFError if the URL is disallowed.
 * Returns the normalized URL if allowed.
 */
export async function ssrfGuard(rawUrl: string): Promise<string> {
  // 1. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFError(`Invalid URL: ${rawUrl}`);
  }

  // 2. Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SSRFError(
      `Disallowed protocol: ${parsed.protocol}. Only http/https are allowed.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Blocked hostnames (exact)
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SSRFError(`Blocked hostname: ${hostname}`);
  }

  // 4. Blocked hostname patterns
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SSRFError(`Blocked hostname pattern match: ${hostname}`);
    }
  }

  // 5. DNS resolution check
  try {
    const { address } = await dnsLookup(hostname);
    if (isPrivateIP(address)) {
      throw new SSRFError(
        `Hostname ${hostname} resolves to private/internal IP: ${address}`
      );
    }
  } catch (err) {
    if (err instanceof SSRFError) throw err;
    // DNS failure — don't block, let the HTTP request fail naturally
    // (better to have a connection error than to be overly restrictive)
  }

  // 6. Block default ports for non-web services
  const port = parsed.port ? parseInt(parsed.port, 10) : null;
  const DISALLOWED_PORTS = new Set([22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017]);
  if (port && DISALLOWED_PORTS.has(port)) {
    throw new SSRFError(`Blocked port: ${port}`);
  }

  return parsed.toString();
}

/**
 * Synchronous hostname pre-check (no DNS lookup).
 * Use this as a fast first gate before async ssrfGuard.
 */
export function ssrfPreCheck(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFError(`Invalid URL: ${rawUrl}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SSRFError(`Disallowed protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SSRFError(`Blocked hostname: ${hostname}`);
  }

  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SSRFError(`Blocked hostname: ${hostname}`);
    }
  }
}

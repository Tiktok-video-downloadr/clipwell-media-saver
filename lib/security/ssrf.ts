import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_V4_RANGES: Array<[string, number]> = [
  ["127.0.0.0", 8],
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
  ["100.64.0.0", 10],
  ["192.0.0.0", 24],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
];

function ipToLong(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const target = ipToLong(ip);
  return BLOCKED_V4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipToLong(base) & mask) === (target & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export async function assertSafeToFetch(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("Not a valid URL.");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new SsrfBlockedError("Only http/https URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError("URLs with embedded credentials are not allowed.");
  }

  const hostname = parsed.hostname;

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new SsrfBlockedError("Loopback hosts are not allowed.");
  }

  if (net.isIP(hostname)) {
    if (net.isIP(hostname) === 4 && isBlockedV4(hostname)) {
      throw new SsrfBlockedError("Requests to private/reserved IP ranges are blocked.");
    }
    if (net.isIP(hostname) === 6 && isBlockedV6(hostname)) {
      throw new SsrfBlockedError("Requests to private/reserved IP ranges are blocked.");
    }
    return parsed;
  }

  const [v4, v6] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
  ]);

  const addresses: string[] = [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : []),
  ];

  if (addresses.length === 0) {
    throw new SsrfBlockedError("Could not resolve host.");
  }

  for (const addr of addresses) {
    if (net.isIP(addr) === 4 && isBlockedV4(addr)) {
      throw new SsrfBlockedError("Requests to private/reserved IP ranges are blocked.");
    }
    if (net.isIP(addr) === 6 && isBlockedV6(addr)) {
      throw new SsrfBlockedError("Requests to private/reserved IP ranges are blocked.");
    }
  }

  return parsed;
}

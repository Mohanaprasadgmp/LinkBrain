import { isIPv4, isIPv6 } from "node:net";

/**
 * SSRF protection: pure, dependency-free checks over URLs and IP addresses.
 *
 * No network access happens in this file — `fetch-page.ts` is the caller
 * that resolves DNS and asks these functions whether the result is safe to
 * connect to, both for the initial request and for every redirect hop.
 *
 * Known limitation (documented, not silently glossed over): these checks
 * validate a DNS answer *before* connecting, but don't pin the eventual TCP
 * connection to that exact resolved address. A sufficiently well-timed
 * DNS-rebinding attack — the attacker's resolver returning a public address
 * for this check and a private one moments later, when the underlying fetch
 * does its own resolution — isn't fully closed by this alone. Closing that
 * completely needs a custom connection-level dispatcher pinning the IP used
 * here; that's disproportionate hardening for a personal single-user app's
 * link-preview feature, so it's called out here instead of quietly shipped
 * as if the gap didn't exist.
 */

export const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function isAllowedProtocol(protocol: string): boolean {
  return ALLOWED_PROTOCOLS.has(protocol);
}

/**
 * Cheap pre-DNS rejection of the obviously-local hostnames. This is a
 * fast path and defense-in-depth, not the authoritative check — the
 * resolved-IP checks below are what actually matters, since any hostname
 * (not just these) can resolve to a private address.
 */
export function isObviouslyLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  return lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local");
}

// --- IPv4 ---

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

interface Ipv4Range {
  base: string;
  bits: number;
}

/**
 * Every non-globally-routable IPv4 block: loopback, private (RFC 1918),
 * link-local, CGNAT, documentation/test ranges, multicast, and reserved.
 */
const BLOCKED_IPV4_RANGES: Ipv4Range[] = [
  { base: "0.0.0.0", bits: 8 }, // "this network"
  { base: "10.0.0.0", bits: 8 }, // private
  { base: "100.64.0.0", bits: 10 }, // carrier-grade NAT
  { base: "127.0.0.0", bits: 8 }, // loopback
  { base: "169.254.0.0", bits: 16 }, // link-local
  { base: "172.16.0.0", bits: 12 }, // private
  { base: "192.0.0.0", bits: 24 }, // IETF protocol assignments
  { base: "192.0.2.0", bits: 24 }, // documentation (TEST-NET-1)
  { base: "192.168.0.0", bits: 16 }, // private
  { base: "198.18.0.0", bits: 15 }, // benchmarking
  { base: "198.51.100.0", bits: 24 }, // documentation (TEST-NET-2)
  { base: "203.0.113.0", bits: 24 }, // documentation (TEST-NET-3)
  { base: "224.0.0.0", bits: 4 }, // multicast
  { base: "240.0.0.0", bits: 4 }, // reserved
  { base: "255.255.255.255", bits: 32 }, // broadcast
];

function isIpv4InRange(ip: string, range: Ipv4Range): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(range.base);
  const mask = range.bits === 0 ? 0 : (~0 << (32 - range.bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((range) => isIpv4InRange(ip, range));
}

// --- IPv6 ---

/**
 * Expands a valid IPv6 address (as returned by Node's DNS resolver — already
 * syntactically valid, so this doesn't need to handle arbitrary malformed
 * input) into 8 hex groups, resolving `::` compression and an embedded
 * IPv4 tail (e.g. `::ffff:192.168.1.1`).
 */
function expandIpv6Groups(ip: string): string[] {
  const withoutZone = ip.split("%")[0];

  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(":");
  const tail = normalized.slice(lastColon + 1);
  if (tail.includes(".")) {
    const ipv4Int = ipv4ToInt(tail);
    const hi = ((ipv4Int >>> 16) & 0xffff).toString(16);
    const lo = (ipv4Int & 0xffff).toString(16);
    normalized = `${normalized.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  if (normalized.includes("::")) {
    const [head, tail2] = normalized.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail2 ? tail2.split(":") : [];
    const missing = 8 - headParts.length - tailParts.length;
    return [...headParts, ...Array(Math.max(missing, 0)).fill("0"), ...tailParts];
  }

  return normalized.split(":");
}

function ipv6ToBigInt(ip: string): bigint {
  const groups = expandIpv6Groups(ip);
  let result = BigInt(0);
  for (const group of groups) {
    result = (result << BigInt(16)) | BigInt(parseInt(group || "0", 16));
  }
  return result;
}

interface Ipv6Range {
  base: bigint;
  bits: number;
}

function ipv6Range(hex: string, bits: number): Ipv6Range {
  return { base: ipv6ToBigInt(hex), bits };
}

const IPV4_MAPPED_PREFIX = ipv6ToBigInt("::ffff:0:0");

// Note: ::ffff:0:0/96 (IPv4-mapped) is deliberately NOT in this list — an
// IPv4-mapped address's safety depends entirely on the IPv4 it embeds
// (::ffff:8.8.8.8 is public, ::ffff:127.0.0.1 isn't), which is checked
// separately below rather than blocking the whole /96 outright.
const BLOCKED_IPV6_RANGES: Ipv6Range[] = [
  ipv6Range("::", 128), // unspecified
  ipv6Range("::1", 128), // loopback
  ipv6Range("64:ff9b::", 96), // NAT64
  ipv6Range("100::", 64), // discard-only
  ipv6Range("2001:db8::", 32), // documentation
  ipv6Range("fc00::", 7), // unique local (private)
  ipv6Range("fe80::", 10), // link-local
  ipv6Range("ff00::", 8), // multicast
];

function isIpv6InRange(ipBig: bigint, range: Ipv6Range): boolean {
  const shift = BigInt(128 - range.bits);
  return ipBig >> shift === range.base >> shift;
}

export function isBlockedIpv6(ip: string): boolean {
  const big = ipv6ToBigInt(ip);

  if (BLOCKED_IPV6_RANGES.some((range) => isIpv6InRange(big, range))) return true;

  // IPv4-mapped addresses carry a real IPv4 destination — validate that too.
  if (big >> BigInt(32) === IPV4_MAPPED_PREFIX >> BigInt(32)) {
    const ipv4Int = Number(big & BigInt(0xffffffff));
    const embeddedIpv4 = [
      (ipv4Int >>> 24) & 0xff,
      (ipv4Int >>> 16) & 0xff,
      (ipv4Int >>> 8) & 0xff,
      ipv4Int & 0xff,
    ].join(".");
    return isBlockedIpv4(embeddedIpv4);
  }

  return false;
}

/** Dispatches to the IPv4 or IPv6 checker based on the address family. */
export function isBlockedIp(ip: string): boolean {
  if (isIPv4(ip)) return isBlockedIpv4(ip);
  if (isIPv6(ip)) return isBlockedIpv6(ip);
  // Not a recognisable IP literal at all — treat as unsafe rather than guess.
  return true;
}

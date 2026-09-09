import { describe, expect, it } from "vitest";

import {
  isAllowedProtocol,
  isBlockedIp,
  isBlockedIpv4,
  isBlockedIpv6,
  isObviouslyLocalHostname,
} from "./ssrf-guard";

describe("isAllowedProtocol", () => {
  it("allows http and https", () => {
    expect(isAllowedProtocol("http:")).toBe(true);
    expect(isAllowedProtocol("https:")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAllowedProtocol("file:")).toBe(false);
    expect(isAllowedProtocol("ftp:")).toBe(false);
    expect(isAllowedProtocol("javascript:")).toBe(false);
    expect(isAllowedProtocol("data:")).toBe(false);
  });
});

describe("isObviouslyLocalHostname", () => {
  it("flags localhost and its subdomains", () => {
    expect(isObviouslyLocalHostname("localhost")).toBe(true);
    expect(isObviouslyLocalHostname("LOCALHOST")).toBe(true);
    expect(isObviouslyLocalHostname("api.localhost")).toBe(true);
    expect(isObviouslyLocalHostname("my-machine.local")).toBe(true);
  });

  it("does not flag ordinary public hostnames", () => {
    expect(isObviouslyLocalHostname("example.com")).toBe(false);
    expect(isObviouslyLocalHostname("docs.aws.amazon.com")).toBe(false);
  });
});

describe("isBlockedIpv4", () => {
  it("blocks loopback", () => {
    expect(isBlockedIpv4("127.0.0.1")).toBe(true);
    expect(isBlockedIpv4("127.255.255.255")).toBe(true);
  });

  it("blocks private ranges", () => {
    expect(isBlockedIpv4("10.0.0.1")).toBe(true);
    expect(isBlockedIpv4("172.16.0.1")).toBe(true);
    expect(isBlockedIpv4("172.31.255.255")).toBe(true);
    expect(isBlockedIpv4("192.168.1.1")).toBe(true);
  });

  it("blocks link-local", () => {
    expect(isBlockedIpv4("169.254.1.1")).toBe(true);
  });

  it("blocks carrier-grade NAT and documentation ranges", () => {
    expect(isBlockedIpv4("100.64.0.1")).toBe(true);
    expect(isBlockedIpv4("192.0.2.1")).toBe(true);
    expect(isBlockedIpv4("198.51.100.1")).toBe(true);
    expect(isBlockedIpv4("203.0.113.1")).toBe(true);
  });

  it("allows ordinary public addresses", () => {
    expect(isBlockedIpv4("8.8.8.8")).toBe(false);
    expect(isBlockedIpv4("1.1.1.1")).toBe(false);
    expect(isBlockedIpv4("93.184.216.34")).toBe(false);
  });

  it("does not block a public address adjacent to a private range", () => {
    // 172.32.0.0 is just outside the 172.16.0.0/12 private block.
    expect(isBlockedIpv4("172.32.0.1")).toBe(false);
    // 11.0.0.0 is just outside the 10.0.0.0/8 private block.
    expect(isBlockedIpv4("11.0.0.1")).toBe(false);
  });
});

describe("isBlockedIpv6", () => {
  it("blocks loopback and unspecified", () => {
    expect(isBlockedIpv6("::1")).toBe(true);
    expect(isBlockedIpv6("::")).toBe(true);
  });

  it("blocks unique-local and link-local", () => {
    expect(isBlockedIpv6("fc00::1")).toBe(true);
    expect(isBlockedIpv6("fd12:3456:789a::1")).toBe(true);
    expect(isBlockedIpv6("fe80::1")).toBe(true);
  });

  it("blocks an IPv4-mapped private address via the embedded IPv4 check", () => {
    expect(isBlockedIpv6("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIpv6("::ffff:192.168.1.1")).toBe(true);
  });

  it("allows an IPv4-mapped public address", () => {
    expect(isBlockedIpv6("::ffff:8.8.8.8")).toBe(false);
  });

  it("allows an ordinary public IPv6 address", () => {
    expect(isBlockedIpv6("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
  });
});

describe("isBlockedIp", () => {
  it("dispatches to the right family checker", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });

  it("treats an unparseable value as unsafe", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

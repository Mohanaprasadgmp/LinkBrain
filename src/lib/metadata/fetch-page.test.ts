import { promises as dns } from "node:dns";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPage } from "./fetch-page";

vi.mock("node:dns", () => ({
  promises: { lookup: vi.fn() },
}));

/**
 * `dns.lookup` is overloaded (its return type depends on the `options`
 * shape); `fetch-page.ts` only ever calls the `{ all: true }` form, so the
 * mock is narrowed to that one overload rather than the ambiguous general
 * signature `vi.mocked(dns.lookup)` would otherwise infer.
 */
type LookupAllFn = (
  hostname: string,
  options: { all: true },
) => Promise<{ address: string; family: number }[]>;

const mockLookup = vi.mocked(dns.lookup as unknown as LookupAllFn);

function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

describe("fetchPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockLookup.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a non-http(s) protocol without ever calling fetch or DNS", async () => {
    const result = await fetchPage("file:///etc/passwd");

    expect(result).toEqual({ ok: false, reason: "invalid-url" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejects an unparseable URL", async () => {
    const result = await fetchPage("not a url at all");
    expect(result).toEqual({ ok: false, reason: "invalid-url" });
  });

  it("rejects an obviously-local hostname without a DNS lookup", async () => {
    const result = await fetchPage("http://localhost:3000/");

    expect(result).toEqual({ ok: false, reason: "blocked-address" });
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

    const result = await fetchPage("http://internal.example.com/");

    expect(result).toEqual({ ok: false, reason: "blocked-address" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("succeeds for a public address returning HTML", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(htmlResponse("<html><title>Hi</title></html>"));

    const result = await fetchPage("https://example.com/page");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain("<title>Hi</title>");
      expect(result.finalUrl).toBe("https://example.com/page");
    }
  });

  it("follows a redirect to another public address", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock
      .mockResolvedValueOnce(redirectResponse("https://example.com/final"))
      .mockResolvedValueOnce(htmlResponse("<html><title>Final</title></html>"));

    const result = await fetchPage("https://example.com/start");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/final");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a redirect that points at a private address, without following it", async () => {
    mockLookup.mockImplementation(async (hostname: string) => {
      if (hostname === "example.com") return [{ address: "93.184.216.34", family: 4 }];
      return [{ address: "127.0.0.1", family: 4 }];
    });
    fetchMock.mockResolvedValueOnce(redirectResponse("http://internal.local/secret"));

    const result = await fetchPage("https://example.com/start");

    expect(result).toEqual({ ok: false, reason: "blocked-address" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after too many redirects", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    let call = 0;
    fetchMock.mockImplementation(async () => redirectResponse(`https://example.com/hop-${++call}`));

    const result = await fetchPage("https://example.com/start");

    expect(result).toEqual({ ok: false, reason: "network-error" });
    expect(fetchMock.mock.calls.length).toBeLessThan(20);
  });

  it("rejects a non-HTML content type", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(
      new Response("%PDF-1.4", { status: 200, headers: { "content-type": "application/pdf" } }),
    );

    const result = await fetchPage("https://example.com/file.pdf");
    expect(result).toEqual({ ok: false, reason: "not-html" });
  });

  it("reports an HTTP error status", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));

    const result = await fetchPage("https://example.com/missing");
    expect(result).toEqual({ ok: false, reason: "http-error" });
  });

  it("reports a network failure", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await fetchPage("https://example.com/down");
    expect(result).toEqual({ ok: false, reason: "network-error" });
  });

  it("reports a timeout when the request is aborted", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    const result = await fetchPage("https://example.com/slow");
    expect(result).toEqual({ ok: false, reason: "timeout" });
  });

  it("rejects a response larger than the size cap", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(3 * 1024 * 1024)); // 3 MB > 2 MB cap
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(
      new Response(oversized, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const result = await fetchPage("https://example.com/huge");
    expect(result).toEqual({ ok: false, reason: "too-large" });
  });
});

import { describe, expect, it } from "vitest";

import { extractPageText } from "./extract-page-text";

describe("extractPageText", () => {
  it("extracts body text and strips scripts/styles", () => {
    const html = `<html><head><style>body{color:red}</style></head>
      <body>
        <script>alert('hi')</script>
        <nav>Home | About</nav>
        <main><h1>Real Title</h1><p>Real paragraph content.</p></main>
        <footer>Copyright 2026</footer>
      </body></html>`;

    const text = extractPageText(html);

    expect(text).toContain("Real Title");
    expect(text).toContain("Real paragraph content.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("Home | About");
    expect(text).not.toContain("Copyright");
  });

  it("collapses whitespace", () => {
    const html = "<body><p>Line one</p>\n\n\n<p>   Line   two   </p></body>";
    const text = extractPageText(html);
    expect(text).not.toMatch(/\s{2,}/);
  });

  it("returns null for empty content", () => {
    expect(extractPageText("<html><head></head><body></body></html>")).toBeNull();
  });

  it("returns null rather than throwing on malformed input", () => {
    expect(() => extractPageText("<<<not really html")).not.toThrow();
  });

  it("truncates content past the character limit", () => {
    const longText = "word ".repeat(3000); // ~15,000 chars
    const html = `<body><p>${longText}</p></body>`;

    const text = extractPageText(html);

    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThan(7000);
    expect(text!.endsWith("…")).toBe(true);
  });
});

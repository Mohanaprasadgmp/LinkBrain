import type { Metadata, Viewport } from "next";

import { THEME_SCRIPT, ThemeProvider } from "@/components/theme/theme-provider";
import { SITE } from "@/config/site";
import { instrumentSerif, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Page titles become e.g. "Projects · LinkBrain".
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1815" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full`}
      /*
       * THEME_SCRIPT mutates the class and colorScheme of this element before
       * React hydrates, which React would otherwise report as a mismatch.
       */
      suppressHydrationWarning
    >
      <head>
        {/*
         * Runs before first paint so the correct theme is applied to the very
         * first frame. `dangerouslySetInnerHTML` is the documented way to emit
         * a blocking inline script; the content is a local constant, never
         * user input.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

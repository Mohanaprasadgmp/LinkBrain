import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LinkStoreProvider } from "@/store/link-store";

/**
 * The workspace chrome: sidebar (desktop) + topbar, wrapping every route
 * inside the `(workspace)` route group.
 *
 * `LinkStoreProvider` is mounted here rather than in the root layout, so that
 * a future `(auth)` route group — sign in, sign up — never pulls in link
 * state it doesn't need.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LinkStoreProvider>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LinkStoreProvider>
  );
}

import { AppHeader } from "@/components/layout/app-header";
import { AppNav } from "@/components/layout/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {/* The bottom padding keeps content clear of the tab bar. */}
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-8 pb-24"
      >
        {children}
      </main>
      <AppNav />
    </>
  );
}

import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-8"
      >
        {children}
      </main>
    </>
  );
}

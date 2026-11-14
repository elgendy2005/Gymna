import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader minimal />
      <main
        id="main"
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10"
      >
        <div
          className="pointer-events-none absolute start-1/2 top-[-14rem] size-[30rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[110px] rtl:translate-x-1/2"
          aria-hidden
        />
        <div className="relative flex w-full justify-center">{children}</div>
      </main>
    </>
  );
}

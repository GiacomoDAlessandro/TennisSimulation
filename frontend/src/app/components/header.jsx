import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-70"
        >
          Tennis Visualizer
        </Link>
        <Link
          href="/why"
          className="text-base font-bold tracking-tight text-zinc-900 transition-opacity hover:opacity-70"
        >
          Why
        </Link>
      </div>
    </header>
  );
}

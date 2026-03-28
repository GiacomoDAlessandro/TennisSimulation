import Link from "next/link";
import Header from "./components/header.jsx";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <Link
              href="/matchsimulator"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
            >
              View ATP Matches
            </Link>
            <button
              type="button"
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Upload My Matches
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

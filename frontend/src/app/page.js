"use client";

import React from "react";
import dynamic from "next/dynamic";

const TennisCourt = dynamic(() => import("./components/TennisCourt"), {
  ssr: false,
});

class CourtErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-50 p-4 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-100">
          <div className="font-semibold">TennisCourt failed to render.</div>
          <div className="mt-1 break-words opacity-90">
            {String(this.state.error?.message ?? this.state.error)}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-100 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500" />
            <div className="leading-tight">
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tennis
              </div>
              <div className="text-base font-semibold tracking-tight">
                Analytics
              </div>
            </div>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Minimal UI initialized
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tennis Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            A simple starting point for exploring match data, serve patterns,
            rally outcomes, and player tendencies.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
              Dashboard coming soon
            </div>
            <div className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-medium text-zinc-700 dark:border-white/15 dark:bg-black dark:text-zinc-200">
              Connect to backend next
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Preview
              </div>
              <div className="text-lg font-semibold tracking-tight">
                Tennis Court
              </div>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Surface: <span className="font-medium">hard</span>
            </div>
          </div>

          <div className="mt-5 flex justify-center overflow-auto rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900/40">
            <CourtErrorBoundary>
              <TennisCourt surface="hard" />
            </CourtErrorBoundary>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Serve directions", desc: "Track T / body / wide split." },
            { title: "Rally outcomes", desc: "Winner vs. forced/unforced error." },
            { title: "Shot types", desc: "Forehand, backhand, volley, etc." },
            { title: "Surface filter", desc: "Hard / clay / grass breakdowns." },
            { title: "Player lookup", desc: "Pull match lists by player name." },
            { title: "Charts", desc: "Add Recharts visualizations easily." },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="text-base font-semibold">{card.title}</div>
              <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {card.desc}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

"use client";

import {useMemo} from "react";
import {buildMatchAnalytics} from "../lib/matchAnalytics.js";

const ENDING_LABELS = [
  ["winners", "Winners"],
  ["forcedErrorsDrawn", "Forced errors drawn"],
  ["unforcedErrorsDrawn", "Unforced errors drawn"],
  ["aces", "Aces"],
  ["unreturnables", "Unreturnables"],
  ["doubleFaults", "Double faults"],
];

function CountBar({label, count, total}) {
  const width = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 shrink-0 truncate text-zinc-500" title={label}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-indigo-500" style={{width: `${width}%`}}/>
      </div>
      <span className="w-6 text-right font-medium tabular-nums text-zinc-700">{count}</span>
    </div>
  );
}

export default function MatchAnalytics({snapshot}) {
  const analytics = useMemo(() => buildMatchAnalytics(
    snapshot?.points?.slice(0, snapshot.completedPointCount) || [],
    [snapshot?.match?.player1_hand, snapshot?.match?.player2_hand],
    [snapshot?.match?.player1, snapshot?.match?.player2],
  ), [snapshot]);

  return (
    <aside className="w-full rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm xl:w-[340px] xl:shrink-0" aria-live="polite">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Match analytics</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">Through {analytics.pointsCompleted} completed point{analytics.pointsCompleted === 1 ? "" : "s"}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Live</span>
      </div>

      {analytics.pointsCompleted === 0 ? (
        <p className="rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-500">Finish the first point to start building match stats.</p>
      ) : (
        <div className="space-y-4">
          {analytics.players.map((player, index) => {
            const topShots = Object.entries(player.shotTypes).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const rallyDirectionTotal = Object.values(player.shotDirections).reduce((sum, count) => sum + count, 0);
            return (
              <section key={`${player.name}-${index}`} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="truncate text-xs font-semibold text-zinc-800" title={player.name}>{player.name}</h4>
                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">{player.pointsWon}/{player.pointsPlayed} points</span>
                </div>

                <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Shot profile</h5>
                {topShots.length ? topShots.map(([label, count]) => <CountBar key={label} label={label.replace(" groundstroke", "")} count={count} total={rallyDirectionTotal}/>) : <p className="text-[10px] text-zinc-400">No rally shots charted yet.</p>}
                <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] text-zinc-500">
                  {[["Forehand side", "FH side"], ["Middle", "Middle"], ["Backhand side", "BH side"]].map(([key, label]) => (
                    <span key={key} className="rounded bg-zinc-50 px-1.5 py-1 text-center">{label} <b className="text-zinc-700">{player.shotDirections[key]}</b></span>
                  ))}
                </div>

                <h5 className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Points won by</h5>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-600">
                  {ENDING_LABELS.map(([key, label]) => <div key={key} className="flex justify-between gap-1"><span>{label}</span><b className="tabular-nums text-zinc-800">{player.pointEndings[key]}</b></div>)}
                </div>
              </section>
            );
          })}

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Point wins by rally length</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(analytics.rallyLengths).map(([bucket, stats]) => (
                <div key={bucket} className="rounded-lg bg-zinc-50 p-2 text-center">
                  <p className="text-[10px] text-zinc-500">{bucket} shots</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-800">{stats.points}</p>
                  <p className="text-[9px] text-zinc-400">charted points</p>
                  <div className="mt-1 border-t border-zinc-200 pt-1 text-[9px] tabular-nums text-zinc-500">
                    {analytics.players[0].name.split(" ")[0]} {stats.wins[0]} · {analytics.players[1].name.split(" ")[0]} {stats.wins[1]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      <p className="mt-3 text-[9px] leading-relaxed text-zinc-400">Stats use charted shots; direction is relative to the receiver’s forehand or backhand side.</p>
    </aside>
  );
}


"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import TennisCourt from "./TennisCourt";
import {API_BASE} from "../../lib/api";
import {formatPointScore, getReplayFrame} from "../lib/pointReplay";
import {STAGE_H, STAGE_W} from "../lib/courtConstants";

export default function PointReplay({matchId, surface = "hard", children}) {
  const [points, setPoints] = useState([]);
  const [match, setMatch] = useState(null);
  const [pointIndex, setPointIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const speed = 700;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestShotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/getMatchPoints/${encodeURIComponent(matchId)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load match points (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPoints(Array.isArray(data?.points) ? data.points : []);
        setMatch(data?.match ?? null);
        if (!data?.match) setError("Match metadata was not found.");
        else if (!Array.isArray(data?.points) || data.points.length === 0) setError("No charted points are available for this match.");
      })
      .catch((err) => { if (!cancelled) setError(err.message || "Failed to load point sequence."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [matchId]);

  const point = points[pointIndex] ?? null;
  const players = useMemo(() => [match?.player1 || "Player 1", match?.player2 || "Player 2"], [match]);
  const playerHands = useMemo(() => [match?.player1_hand, match?.player2_hand], [match]);
  const replayFrame = useMemo(
    () => point ? getReplayFrame(point, playerHands) : {shots: [], events: [], unparsed: [], complete: true},
    [point, playerHands]
  );
  const visibleShot = replayFrame.shots[visibleCount - 1] ?? null;

  useEffect(() => {
    latestShotRef.current?.scrollIntoView({block: "nearest", behavior: "smooth"});
  }, [pointIndex, visibleCount]);

  function setPoint(nextIndex) {
    setPointIndex(Math.max(0, Math.min(points.length - 1, nextIndex)));
    setVisibleCount(0);
  }

  const advance = useCallback(() => {
    if (!point) return;
    if (visibleCount < replayFrame.shots.length) setVisibleCount((count) => count + 1);
    else if (pointIndex < points.length - 1) {
      setPointIndex((index) => index + 1);
      setVisibleCount(0);
    } else setPlaying(false);
  }, [point, visibleCount, replayFrame.shots.length, pointIndex, points.length]);

  const goToPreviousShot = useCallback(() => {
    setPlaying(false);
    if (visibleCount > 0) {
      setVisibleCount((count) => count - 1);
      return;
    }
    if (pointIndex > 0) {
      const previousFrame = getReplayFrame(points[pointIndex - 1], playerHands);
      setPointIndex((index) => index - 1);
      setVisibleCount(previousFrame.shots.length);
    }
  }, [visibleCount, pointIndex, points, playerHands]);

  useEffect(() => {
    if (!playing || !point) return undefined;
    const timer = window.setTimeout(advance, speed);
    return () => window.clearTimeout(timer);
  }, [playing, speed, advance, point]);

  const renderLayout = (court, summary) => typeof children === "function"
    ? children({court, summary})
    : <section className="flex w-full flex-col items-center gap-3 xl:flex-row xl:items-start xl:justify-center xl:gap-5">{court}{summary}</section>;

  if (loading) return renderLayout(
    <div className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-200/70 text-sm text-zinc-500" style={{width: STAGE_W * 0.58, height: STAGE_H * 0.58}}>Loading court…</div>,
    <aside className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300 shadow-sm xl:w-56">Loading point-by-point charting…</aside>
  );
  if (error) return renderLayout(
    <div className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-200/70 text-sm text-zinc-500" style={{width: STAGE_W * 0.58, height: STAGE_H * 0.58}}>Replay unavailable</div>,
    <aside className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-amber-200 shadow-sm xl:w-56">{error}</aside>
  );
  if (!point) return null;

  const server = Number(point.server) === 1 ? players[0] : players[1];
  const winner = Number(point.winner) === 1 ? players[0] : Number(point.winner) === 2 ? players[1] : "Unknown";
  const revealed = replayFrame.shots.slice(0, visibleCount);
  const eventsVisible = visibleCount >= replayFrame.shots.length;
  const visibleServeFault = visibleShot?.kind === "serve" && visibleShot.outcome
    && !["Ace", "Unreturnable serve", "Let"].includes(visibleShot.outcome);
  const isDoubleFault = visibleServeFault && visibleShot.attempt === 2
    && Number(point.winner) !== Number(point.server)
    && !replayFrame.shots.some((shot) => shot.kind === "rally");
  const pointEndMessage = visibleServeFault
    ? isDoubleFault ? "Point ends: Double fault" : visibleShot.attempt === 1 ? "Serve missed" : "Fault"
    : visibleShot?.outcome ? `Point ends: ${visibleShot.outcome}` : null;

  const court = (
    <div className="flex shrink-0 flex-col items-center">
      <TennisCourt surface={surface} courtScale={0.58} replayShots={replayFrame.shots} replayVisibleCount={visibleCount}/>
      <p className="mt-1 max-w-sm text-center text-[10px] text-zinc-500">Shot locations are estimates from charting codes.</p>
    </div>
  );
  const summary = (
      <aside className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-left text-zinc-100 shadow-sm xl:w-56" aria-live="polite">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-white">Point {pointIndex + 1}<span className="font-normal text-zinc-400"> / {points.length}</span></h4>
            <p className="mt-1 text-[11px] text-zinc-300">{formatPointScore(point)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous shot" title="Previous shot" onClick={goToPreviousShot} disabled={visibleCount === 0 && pointIndex === 0} className="h-8 w-8 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-30">‹</button>
            <button type="button" aria-label={playing ? "Pause replay" : "Play replay"} title={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)} className="h-8 w-8 rounded-lg bg-white text-xs text-zinc-900 hover:bg-zinc-200">{playing ? "Ⅱ" : "▶"}</button>
            <button type="button" aria-label="Next shot" title="Next shot" onClick={advance} className="h-8 w-8 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700">›</button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-300">Server: {server}<br/>Point winner: {winner}</p>
        <div className="my-3 h-px bg-zinc-700"/>
        <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Point summary</h5>
        {revealed.length === 0 ? <p className="mt-2 text-xs text-zinc-300">Tap play or next to follow each shot.</p> : (
          <ol className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {revealed.map((shot, index) => <li key={`${shot.index}-${index}`} ref={index === revealed.length - 1 ? latestShotRef : null} className={`text-xs leading-snug ${index === revealed.length - 1 ? "font-medium text-white" : "text-zinc-400"}`}>
              <span className="mr-1 text-zinc-500">{index + 1}.</span>{shot.label}{shot.direction ? ` · ${shot.direction}` : ""}<span className={`block pl-4 text-[11px] ${index === revealed.length - 1 ? "text-zinc-300" : "text-zinc-500"}`}>{shot.player ? players[shot.player - 1] : "Player unknown"}{shot.outcome ? ` · ${shot.outcome}` : ""}{shot.markers.length ? ` · ${shot.markers.join(", ")}` : ""}</span>
            </li>)}
          </ol>
        )}
        {eventsVisible && replayFrame.events.map((event, index) => <p key={`${event.code}-${index}`} className="mt-2 text-xs text-indigo-300">{event.label}</p>)}
        {replayFrame.shots.length === 0 && replayFrame.events.length === 0 && <p className="mt-2 text-xs text-amber-300">No shot sequence was recorded for this point.</p>}
        {pointEndMessage && <p className="mt-2 rounded-md bg-zinc-700 px-2 py-1.5 text-xs text-amber-200">{pointEndMessage}</p>}
        {replayFrame.unparsed.length > 0 && <p className="mt-2 text-xs text-amber-300">Unrecognized codes: {replayFrame.unparsed.join(" ")}</p>}
      </aside>
  );
  return renderLayout(court, summary);
}

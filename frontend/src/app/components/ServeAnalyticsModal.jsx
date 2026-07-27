"use client";

import {useEffect, useMemo, useState} from "react";
import {XIcon} from "@phosphor-icons/react";
import {API_BASE} from "../../lib/api";
import {SERVE_COLORS} from "../lib/courtUtils";
import {
    SERVE_DIRECTIONS,
    buildServeAnalytics,
    flattenServesFromPoints,
    formatDirection,
    getDirectionShare,
    getOutcomeShares,
} from "../lib/serveStats";

const SIDES = [
    {value: "D", label: "Deuce"},
    {value: "A", label: "Ad"},
];

const FAULT_COLOR = "#dc2626";

function SegmentedControl({options, value, onChange, ariaLabel}) {
    return (
        <div
            className="flex border-b border-zinc-200"
            role="tablist"
            aria-label={ariaLabel}
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        className={`-mb-px px-3 pb-2 pt-1 text-sm font-medium transition-colors ${
                            active
                                ? "border-b-2 border-zinc-900 text-zinc-900"
                                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-800"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function PctCell({pct, showBar = false}) {
    return (
        <div className="flex min-w-0 flex-col items-end gap-1">
            {showBar ? (
                <div className="h-1 w-full max-w-[4.5rem] overflow-hidden rounded-sm bg-zinc-100">
                    <div
                        className="h-full rounded-sm bg-zinc-400"
                        style={{width: `${Math.min(100, Math.max(0, pct))}%`}}
                    />
                </div>
            ) : null}
            <span className="tabular-nums text-zinc-800">{pct}%</span>
        </div>
    );
}

function OutcomePct({pct, color}) {
    return (
        <div className="flex items-center justify-end gap-1.5">
            <span
                className="inline-block size-1.5 shrink-0 rounded-full"
                style={{backgroundColor: color}}
                aria-hidden
            />
            <span className="tabular-nums text-zinc-700">{pct}%</span>
        </div>
    );
}

export default function ServeAnalyticsModal({
    open,
    onClose,
    matchId,
    playerName,
    surface = "hard",
    points: pointsProp = null,
}) {
    const [side, setSide] = useState("D");
    const [fetchedPoints, setFetchedPoints] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (pointsProp != null) {
            setLoading(false);
            return;
        }
        if (!matchId || !playerName) return;

        let cancelled = false;
        setLoading(true);

        fetch(`${API_BASE}/getPlayerServes/${matchId}/${encodeURIComponent(playerName)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) {
                    setFetchedPoints(Array.isArray(data?.points) ? data.points : []);
                }
            })
            .catch(() => {
                if (!cancelled) setFetchedPoints([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, matchId, playerName, pointsProp]);

    const points = pointsProp != null ? pointsProp : fetchedPoints;

    const analytics = useMemo(() => {
        return buildServeAnalytics(flattenServesFromPoints(points));
    }, [points]);

    const outcomeColors = useMemo(() => {
        const palette = SERVE_COLORS[String(surface).toLowerCase()] || SERVE_COLORS.hard;
        return {
            Ace: palette.Ace === "#ffffff" ? "#ca8a04" : palette.Ace,
            Unreturnable: palette.Unreturnable === "black" ? "#18181b" : palette.Unreturnable,
            in_play: palette.in_play === "#ffffff" || palette.in_play === "green"
                ? (palette.in_play === "green" ? "#16a34a" : "#a1a1aa")
                : palette.in_play,
            fault: FAULT_COLOR,
        };
    }, [surface]);

    if (!open) return null;

    const sideStats = analytics.bySide[side];
    const rows = SERVE_DIRECTIONS.map((direction) => {
        const share = getDirectionShare(sideStats, direction);
        const outcomes = getOutcomeShares(analytics.bySideDirection[side]?.[direction]);
        return {direction, share, outcomes};
    });

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-xl sm:p-5"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="serve-analytics-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
                    aria-label="Close"
                >
                    <XIcon size={16}/>
                </button>

                <div className="pr-8">
                    <h2 id="serve-analytics-title" className="text-sm font-semibold text-zinc-900">
                        Serve analytics
                    </h2>
                    <p className="text-xs text-zinc-500">{playerName}</p>
                </div>

                {loading ? (
                    <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>
                ) : sideStats.total === 0 ? (
                    <p className="py-10 text-center text-sm text-zinc-500">No serve data for this selection.</p>
                ) : (
                    <div className="mt-3 space-y-3">
                        <SegmentedControl
                            options={SIDES}
                            value={side}
                            onChange={setSide}
                            ariaLabel="Serve side"
                        />

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[320px] border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-zinc-200 text-[11px] text-zinc-500">
                                        <th className="pb-2 pr-2 text-left font-medium">Dir</th>
                                        <th className="pb-2 px-1 text-right font-medium">Share</th>
                                        <th className="pb-2 px-1 text-right font-medium">Ace</th>
                                        <th className="pb-2 px-1 text-right font-medium">Unret.</th>
                                        <th className="pb-2 px-1 text-right font-medium">In play</th>
                                        <th className="pb-2 pl-1 text-right font-medium">Fault</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(({direction, share, outcomes}) => (
                                        <tr
                                            key={direction}
                                            className="border-b border-zinc-100 last:border-b-0"
                                        >
                                            <td className="py-2.5 pr-2 font-medium text-zinc-900">
                                                {formatDirection(direction)}
                                                <span className="ml-1 font-normal tabular-nums text-zinc-400">
                                                    {share.count}
                                                </span>
                                            </td>
                                            <td className="px-1 py-2.5">
                                                <PctCell pct={share.pct} showBar/>
                                            </td>
                                            <td className="px-1 py-2.5">
                                                <OutcomePct pct={outcomes.Ace.pct} color={outcomeColors.Ace}/>
                                            </td>
                                            <td className="px-1 py-2.5">
                                                <OutcomePct
                                                    pct={outcomes.Unreturnable.pct}
                                                    color={outcomeColors.Unreturnable}
                                                />
                                            </td>
                                            <td className="px-1 py-2.5">
                                                <OutcomePct
                                                    pct={outcomes.in_play.pct}
                                                    color={outcomeColors.in_play}
                                                />
                                            </td>
                                            <td className="py-2.5 pl-1">
                                                <OutcomePct pct={outcomes.fault.pct} color={outcomeColors.fault}/>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="tabular-nums text-[11px] text-zinc-400">
                            {sideStats.total} serves
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

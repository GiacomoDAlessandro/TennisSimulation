"use client";

import {useEffect, useMemo, useState} from "react";
import {XIcon} from "@phosphor-icons/react";
import {API_BASE} from "../../lib/api";
import {
    SERVE_DIRECTIONS,
    buildServeAnalytics,
    flattenServesFromPoints,
    formatDirection,
    getDirectionShare,
    getOutcomeShares,
} from "../lib/serveStats";

const SIDES = [{value: "D", label: "Deuce"}, {value: "A", label: "Ad"},];

function Tab({active, onClick, children}) {
    return (<button
            type="button"
            onClick={onClick}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
        >
            {children}
        </button>);
}

function Row({label, count, pct, active}) {
    return (<div
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-zinc-100" : ""}`}>
            <span className="font-medium text-zinc-800">{label}</span>
            <span className="text-zinc-600">
                {pct}% <span className="text-zinc-400">({count})</span>
            </span>
        </div>);
}

export default function ServeAnalyticsModal({open, onClose, matchId, playerName}) {
    const [side, setSide] = useState("D");
    const [direction, setDirection] = useState("wide");
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !matchId || !playerName) return;

        let cancelled = false;
        setLoading(true);

        fetch(`${API_BASE}/getPlayerServes/${matchId}/${encodeURIComponent(playerName)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) {
                    setPoints(Array.isArray(data?.points) ? data.points : []);
                }
            })
            .catch(() => {
                if (!cancelled) setPoints([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, matchId, playerName]);

    const analytics = useMemo(() => {
        return buildServeAnalytics(flattenServesFromPoints(points));
    }, [points]);

    if (!open) return null;

    const sideStats = analytics.bySide[side];
    const sideLabel = SIDES.find((s) => s.value === side)?.label ?? side;
    const dirShare = getDirectionShare(sideStats, direction);
    const outcomes = getOutcomeShares(analytics.bySideDirection[side]?.[direction]);

    return (<div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="w-full items-start max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="serve-analytics-title"
            >

                <div className="flex flex-1 flex-col items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className=" ml-auto rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                        aria-label="Close"
                    >
                        <XIcon size={18}/>
                    </button>
                    <h2 id="serve-analytics-title" className="text-base font-semibold text-zinc-900">
                        Serve analytics
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500 mb-5">{playerName}</p>
                </div>


                {loading ? (
                    <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>) : sideStats.total === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">No serve data for this match.</p>) : (<>
                        <div className="mb-3 flex flex-wrap gap-2">
                            {SIDES.map((s) => (
                                <Tab key={s.value} active={side === s.value} onClick={() => setSide(s.value)}>
                                    {s.label}
                                </Tab>))}
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {SERVE_DIRECTIONS.map((d) => (
                                <Tab key={d} active={direction === d} onClick={() => setDirection(d)}>
                                    {formatDirection(d)}
                                </Tab>))}
                        </div>

                        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-3xl font-semibold text-zinc-900">{dirShare.pct}%</p>
                            <p className="mt-1 text-sm text-zinc-600">
                                of <span className="font-medium text-zinc-800">{sideLabel}</span> serves went{" "}
                                <span className="font-medium text-zinc-800">{formatDirection(direction)}</span>
                                {" "}({dirShare.count} / {dirShare.total})
                            </p>
                        </div>

                        <div className="mb-4 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Direction split · {sideLabel}
                            </p>
                            {SERVE_DIRECTIONS.map((d) => {
                                const share = getDirectionShare(sideStats, d);
                                return (<Row
                                        key={d}
                                        label={formatDirection(d)}
                                        count={share.count}
                                        pct={share.pct}
                                        active={d === direction}
                                    />);
                            })}
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Outcomes · {sideLabel} {formatDirection(direction)}
                            </p>
                            <Row label="Ace" count={outcomes.Ace.count} pct={outcomes.Ace.pct}/>
                            <Row label="Unreturnable" count={outcomes.Unreturnable.count}
                                 pct={outcomes.Unreturnable.pct}/>
                            <Row label="In play" count={outcomes.in_play.count} pct={outcomes.in_play.pct}/>
                            <Row label="Fault" count={outcomes.fault.count} pct={outcomes.fault.pct}/>
                        </div>
                    </>)}
            </div>
        </div>);
}

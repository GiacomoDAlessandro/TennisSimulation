"use client";
import { COURT_W, COURT_H, SIDE_PAD } from "../lib/courtConstants";
import React, {useEffect, useState} from "react";
import {Line, Rect, Stage, Layer, Circle, Group} from "react-konva";
import ShotLayer from './ShotLayer'
import {SERVE_COLORS} from "../lib/courtUtils";

/** Extra out area past the right outer boundary */
const RIGHT_OUT = 50;
const STAGE_W = SIDE_PAD + COURT_W + RIGHT_OUT;
const STAGE_H = COURT_H;
const GRASS_STRIPE_COUNT = 14;
const GRASS_STRIPE_W = COURT_W / GRASS_STRIPE_COUNT;
/** Single opacity for all mowing stripes (one layer — avoids stronger look inside vs outside) */
const GRASS_STRIPE_OPACITY = 0.22;

const pctX = (value) => (value / COURT_W) * 100;
const pctY = (value) => (value / COURT_H) * 100;
const courtX = (percent) => (percent / 100) * COURT_W;
const courtY = (percent) => (percent / 100) * COURT_H;

//Percentage based coordinates so I can change the size of the court and have it look the same
const NET_Y_PCT = pctY(435);
const POST_R_PCT = pctX(5);
const POST_GAP_PCT = pctX(30);

const DOUBLES_LEFT_X_PCT = pctX(45);
const DOUBLES_RIGHT_X_PCT = pctX(405);
const SINGLES_LEFT_X_PCT = pctX(90);
const SINGLES_RIGHT_X_PCT = pctX(360);
const COURT_INNER_X_PCT = pctX(45);
const COURT_INNER_Y_PCT = pctY(45);
const COURT_INNER_W_PCT = pctX(360);
const COURT_INNER_H_PCT = pctY(780);

const UMP_W_PCT = pctX(34);
const UMP_H_PCT = pctY(37);
const UMP_INNER_X_PCT = pctX(3);
const UMP_INNER_Y_PCT = pctY(5);
const UMP_INNER_W_PCT = pctX(28);
const UMP_INNER_H_PCT = pctY(26);
const BENCH_GAP_PCT = pctY(14);
const BENCH_W_PCT = pctX(25);
const BENCH_H_PCT = pctY(44);

function BenchFacingCourt({x, y, sl}) {
    const w = courtX(BENCH_W_PCT);
    const h = courtY(BENCH_H_PCT);
    return (
        <Group x={x} y={y}>
            <Rect width={w} height={h} fill={sl.benchSeat} cornerRadius={2}/>
            <Rect
                x={w - courtX(pctX(6))}
                y={courtY(pctY(2))}
                width={courtX(pctX(4))}
                height={h - courtY(pctY(4))}
                fill={sl.benchLeg}
                opacity={0.9}
                cornerRadius={1}
            />
            {/* open / seat side toward court (+x) */}
            <Rect
                x={w - courtX(pctX(2))}
                y={courtY(pctY(4))}
                width={courtX(pctX(2))}
                height={h - courtY(pctY(8))}
                fill={sl.towel}
                opacity={0.55}
                cornerRadius={1}
            />
        </Group>
    );
}

export default function TennisCourt({
                                        surface = "hard",
                                        scale = 1,
                                        courtScale = 1,
                                        fitViewport = false,
                                        matchId = "",
                                        playerName ="",
                                        pointTypeFilter = "serve",
                                        serveOutcomeFilter = "all",
                                        pressureFilter = "all",
                                    }) {
    const [mounted, setMounted] = useState(false);
    const [fitScale, setFitScale] = useState(0.72);
    const [serveStats, setServeStats] = useState({
        aces: 0,
        unreturnables: 0,
        inPlay: 0,
        faults: 0,
    });
    const [legendHover, setLegendHover] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !fitViewport) return;

        const update = () => {
            const vv = window.visualViewport;
            const vh = vv?.height ?? window.innerHeight;
            const vw = vv?.width ?? window.innerWidth;
            const reservedY = 160;
            const reservedX = 56;
            const maxH = Math.max(240, vh - reservedY);
            const maxW = Math.max(200, vw - reservedX);
            const next = Math.min(maxH / STAGE_H, maxW / STAGE_W, 1);
            setFitScale(Math.max(0.38, next * 0.98));
        };

        update();
        window.addEventListener("resize", update);
        window.visualViewport?.addEventListener("resize", update);
        window.visualViewport?.addEventListener("scroll", update);
        return () => {
            window.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("scroll", update);
        };
    }, [mounted, fitViewport]);

    const rawS = fitViewport ? fitScale : scale * courtScale;
    const s = Math.min(Math.max(rawS, 0.2), 2);

    const courtColors = {
        hard: {
            court: "#1d30a8",
            lines: "#ffffff",
            posts: "#22331e",
            outArea: "#30592f",
            sideLine: {
                benchSeat: "#1e3a5f",
                benchLeg: "#0f172a",
                umpire: "#0f172a",
                towel: "#e2e8f0",
                umpireAccent: "#0f172a"
            },
        },
        clay: {
            court: "#c8622a",
            lines: "#ffffff",
            posts: "#3f6b35",
            outArea: "#c8622a",
            sideLine: {
                benchSeat: "#f5f0e8",
                benchLeg: "#7a4a32",
                umpire: "#5c4033",
                umpireAccent: "#faf8f5",
                towel: "#ffffff",
            },
        },
        grass: {
            court: "#4a7c3f",
            lines: "#ffffff",
            posts: "#8B5A2B",
            outArea: "#4a7c3f",
            sideLine: {
                benchSeat: "#134e1a",
                benchLeg: "#0a2810",
                umpire: "#052e16",
                umpireAccent: "#295e40",
                towel: "#ecfdf5",
            },
        },
    };

    const colors = courtColors[surface.toLowerCase()];
    const sl = colors.sideLine;
    const legendColors = SERVE_COLORS[surface.toLowerCase()] || SERVE_COLORS.hard;

    const OX = SIDE_PAD;
    const doublesLeft = OX + courtX(DOUBLES_LEFT_X_PCT);
    const courtLines = [
        //left singles line
        [courtX(SINGLES_LEFT_X_PCT), courtY(pctY(45)), courtX(SINGLES_LEFT_X_PCT), courtY(pctY(825))],
        //right singles line
        [courtX(SINGLES_RIGHT_X_PCT), courtY(pctY(45)), courtX(SINGLES_RIGHT_X_PCT), courtY(pctY(825))],
        //center service line
        [courtX(pctX(225)), courtY(pctY(225)), courtX(pctX(225)), courtY(pctY(615))],
        //far center baseline little line
        [courtX(pctX(225)), courtY(pctY(45)), courtX(pctX(225)), courtY(pctY(53))],
        //near center baseline little line
        [courtX(pctX(225)), courtY(pctY(817)), courtX(pctX(225)), courtY(pctY(825))],
        //left doubles line
        [courtX(DOUBLES_LEFT_X_PCT), courtY(pctY(45)), courtX(DOUBLES_LEFT_X_PCT), courtY(pctY(825))],
        //right doubles line
        [courtX(DOUBLES_RIGHT_X_PCT), courtY(pctY(45)), courtX(DOUBLES_RIGHT_X_PCT), courtY(pctY(825))],
        //Far baseline
        [courtX(DOUBLES_LEFT_X_PCT), courtY(pctY(45)), courtX(DOUBLES_RIGHT_X_PCT), courtY(pctY(45))],
        //Near baseline
        [courtX(DOUBLES_LEFT_X_PCT), courtY(pctY(825)), courtX(DOUBLES_RIGHT_X_PCT), courtY(pctY(825))],
        //Near Service line
        [courtX(SINGLES_LEFT_X_PCT), courtY(pctY(615)), courtX(SINGLES_RIGHT_X_PCT), courtY(pctY(615))],
        //Far Service line
        [courtX(SINGLES_LEFT_X_PCT), courtY(pctY(225)), courtX(SINGLES_RIGHT_X_PCT), courtY(pctY(225))],
    ];

    if (!mounted) {
        return (
            <div
                className="rounded-xl bg-zinc-200/40"
                style={{width: STAGE_W * s, height: STAGE_H * s}}
                aria-hidden
            />
        );
    }

    /* Left post center (world): (doublesLeft, NET_Y). Gap before umpire. */
    const postLeftTangent = doublesLeft - courtX(POST_R_PCT);
    const umpireW = courtX(UMP_W_PCT);
    const umpireH = courtY(UMP_H_PCT);
    const umpireRight = postLeftTangent - courtX(POST_GAP_PCT);
    const umpireX = umpireRight - umpireW;
    const umpireY = courtY(NET_Y_PCT) - umpireH / 2;

    const benchGap = courtY(BENCH_GAP_PCT);
    const benchH = courtY(BENCH_H_PCT);
    const farBenchY = umpireY - benchGap - benchH;
    const nearBenchY = umpireY + umpireH + benchGap;
    const benchX = umpireX;

    return (
        <div className="flex flex-col items-center gap-2">
            <Stage width={STAGE_W * s} height={STAGE_H * s}>
                <Layer scaleX={s} scaleY={s}>
                <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={colors.outArea}/>
                {surface.toLowerCase() === "grass" &&
                    Array.from({length: Math.ceil(STAGE_W / GRASS_STRIPE_W)}).map((_, i) => {
                        const stripeX = i * GRASS_STRIPE_W;
                        const stripeW = Math.min(GRASS_STRIPE_W, STAGE_W - stripeX);
                        return (
                            <Rect
                                key={`grass-strip-${i}`}
                                x={stripeX}
                                y={0}
                                width={stripeW}
                                height={STAGE_H}
                                fill={i % 2 === 0 ? "#5f934f" : "#3f6f36"}
                                opacity={GRASS_STRIPE_OPACITY}
                            />
                        );
                    })}

                <Group x={SIDE_PAD}>
                    <Rect x={0} y={0} width={COURT_W} height={COURT_H} fill={colors.outArea}/>
                    <Rect
                        x={courtX(COURT_INNER_X_PCT)}
                        y={courtY(COURT_INNER_Y_PCT)}
                        width={courtX(COURT_INNER_W_PCT)}
                        height={courtY(COURT_INNER_H_PCT)}
                        fill={colors.court}
                    />
                    {surface.toLowerCase() === "grass" &&
                        Array.from({length: GRASS_STRIPE_COUNT}).map((_, i) => {
                            return (
                                <Rect
                                    key={`grass-court-strip-${i}`}
                                    x={i * GRASS_STRIPE_W}
                                    y={0}
                                    width={GRASS_STRIPE_W}
                                    height={COURT_H}
                                    fill={i % 2 === 0 ? "#5f934f" : "#3f6f36"}
                                    opacity={0.4}
                                />
                            );
                        })}

                    {/*Various out lines*/}
                    {courtLines.map((points, i) => (
                        <Line key={i} points={points} stroke={colors.lines} strokeWidth={2}/>
                    ))}

                    {/*Net*/}
                    <Line
                        points={[
                            courtX(DOUBLES_LEFT_X_PCT),
                            courtY(NET_Y_PCT),
                            courtX(DOUBLES_RIGHT_X_PCT),
                            courtY(NET_Y_PCT),
                        ]}
                        stroke={colors.lines}
                        strokeWidth={2}
                        dash={[8, 3]}
                    />
                    {/*Left post*/}
                    <Circle
                        x={courtX(DOUBLES_LEFT_X_PCT)}
                        y={courtY(NET_Y_PCT)}
                        radius={courtX(POST_R_PCT)}
                        fill={colors.posts}
                    />
                    {/*Right Post*/}
                    <Circle
                        x={courtX(DOUBLES_RIGHT_X_PCT)}
                        y={courtY(NET_Y_PCT)}
                        radius={courtX(POST_R_PCT)}
                        fill={colors.posts}
                    />
                </Group>

                <Group>
                    <BenchFacingCourt x={benchX} y={farBenchY} sl={sl}/>
                    <BenchFacingCourt x={benchX} y={nearBenchY} sl={sl}/>

                    <Group x={umpireX} y={umpireY}>
                        <Rect
                            x={0}
                            y={0}
                            width={umpireW}
                            height={umpireH}
                            fill={sl.umpire}
                            cornerRadius={3}
                        />
                        <Rect
                            x={courtX(UMP_INNER_X_PCT)}
                            y={courtY(UMP_INNER_Y_PCT)}
                            width={courtX(UMP_INNER_W_PCT)}
                            height={courtY(UMP_INNER_H_PCT)}
                            fill={sl.umpireAccent}
                            cornerRadius={2}
                        />
                    </Group>
                </Group>
                </Layer>
                <ShotLayer
                    s={s}
                    matchId={matchId}
                    playerName={playerName}
                    surface={surface}
                    onStatsChange={setServeStats}
                    pointTypeFilter={pointTypeFilter}
                    serveOutcomeFilter={serveOutcomeFilter}
                    pressureFilter={pressureFilter}
                />
            </Stage>
            <div className="relative flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-700">
                <span
                    className="inline-flex items-center gap-1"
                    onMouseEnter={() => setLegendHover({label: "Aces", value: serveStats.aces})}
                    onMouseLeave={() => setLegendHover(null)}
                >
                    <span className="h-2.5 w-2.5 rounded-full border border-zinc-400" style={{backgroundColor: legendColors.Ace}}/>
                    Ace
                </span>
                <span
                    className="inline-flex items-center gap-1"
                    onMouseEnter={() => setLegendHover({label: "Unreturnables", value: serveStats.unreturnables})}
                    onMouseLeave={() => setLegendHover(null)}
                >
                    <span className="h-2.5 w-2.5 rounded-full border border-zinc-400" style={{backgroundColor: legendColors.Unreturnable}}/>
                    Unreturnable
                </span>
                <span
                    className="inline-flex items-center gap-1"
                    onMouseEnter={() => setLegendHover({label: "In play", value: serveStats.inPlay})}
                    onMouseLeave={() => setLegendHover(null)}
                >
                    <span className="h-2.5 w-2.5 rounded-full border border-zinc-400" style={{backgroundColor: legendColors.in_play}}/>
                    In play
                </span>
                <span
                    className="inline-flex items-center gap-1"
                    onMouseEnter={() => setLegendHover({label: "Faults / errors", value: serveStats.faults})}
                    onMouseLeave={() => setLegendHover(null)}
                >
                    <span className="h-2.5 w-2.5 rounded-full border border-zinc-400 bg-red-500"/>
                    Fault / error
                </span>
                {legendHover && (
                    <div className="pointer-events-none absolute -top-9 rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 shadow-md">
                        {legendHover.label}: {legendHover.value}
                    </div>
                )}
            </div>
        </div>
    );
}

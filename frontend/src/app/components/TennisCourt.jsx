"use client";

import React, {useEffect, useState} from "react";
import {Line, Rect, Stage, Layer, Circle, Group} from "react-konva";

const COURT_W = 450;
const COURT_H = 870;
const SIDE_PAD = 70;
/** Extra out area past the right outer boundary */
const RIGHT_OUT = 50;
const STAGE_W = SIDE_PAD + COURT_W + RIGHT_OUT;
const STAGE_H = COURT_H;

const NET_Y = 435;
//Right post size
const POST_R = 5;
//Distance of umpire stand from net post
const POST_GAP = 30;

function BenchFacingCourt({x, y, sl}) {
    const w = 25;
    const h = 44;
    return (
        <Group x={x} y={y}>
            <Rect width={w} height={h} fill={sl.benchSeat} cornerRadius={2}/>
            <Rect
                x={w - 6}
                y={2}
                width={4}
                height={h - 4}
                fill={sl.benchLeg}
                opacity={0.9}
                cornerRadius={1}
            />
            {/* open / seat side toward court (+x) */}
            <Rect
                x={w - 2}
                y={4}
                width={2}
                height={h - 8}
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
    fitViewport = false,
}) {
    const [mounted, setMounted] = useState(false);
    const [fitScale, setFitScale] = useState(0.72);

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

    const rawS = fitViewport ? fitScale : scale;
    const s = Math.min(Math.max(rawS, 0.2), 2);

    const courtColors = {
        hard: {
            court: "#4a90d9",
            lines: "#ffffff",
            posts: "#22331e",
            outArea: "#2e572d",
            sideLine: {
                benchSeat: "#1e3a5f",
                benchLeg: "#0f172a",
                umpire: "#0f172a",
                umpireAccent: "#2563eb",
                towel: "#e2e8f0",
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

    const OX = SIDE_PAD;
    const doublesLeft = OX + 45;
    const courtLines = [
        //left singles line
        [90, 45, 90, 825],
        //right singles line
        [360, 45, 360, 825],
        //center service line
        [225, 225, 225, 615],
        //far center baseline little line
        [225, 45, 225, 53],
        //near center baseline little line
        [225, 817, 225, 825],
        //left doubles line
        [45, 45, 45, 825],
        //right doubles line
        [405, 45, 405, 825],
        //Far baseline
        [45, 45, 405, 45],
        //Near baseline
        [45, 825, 405, 825],
        //Near Service line
        [90, 615, 360, 615],
        //Far Service line
        [90, 225, 360, 225],
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
    const postLeftTangent = doublesLeft - POST_R;
    const umpireW = 34;
    const umpireH = 37;
    const umpireRight = postLeftTangent - POST_GAP;
    const umpireX = umpireRight - umpireW;
    const umpireY = NET_Y - umpireH / 2;

    const benchGap = 14;
    const benchH = 44;
    const farBenchY = umpireY - benchGap - benchH;
    const nearBenchY = umpireY + umpireH + benchGap;
    const benchX = umpireX;

    return (
        <Stage width={STAGE_W * s} height={STAGE_H * s}>
            <Layer scaleX={s} scaleY={s}>
                <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={colors.outArea}/>

                <Group x={SIDE_PAD}>
                    <Rect x={0} y={0} width={COURT_W} height={COURT_H} fill={colors.outArea}/>
                    <Rect x={45} y={45} width={360} height={780} fill={colors.court}/>

                    {/*Various out lines*/}
                    {courtLines.map((points, i) => (
                        <Line key={i} points={points} stroke={colors.lines} strokeWidth={2}/>
                    ))}

                    {/*Net*/}
                    <Line
                        points={[45, 435, 405, 435]}
                        stroke={colors.lines}
                        strokeWidth={2}
                        dash={[8, 3]}
                    />
                    {/*Left post*/}
                    <Circle x={45} y={435} radius={POST_R} fill={colors.posts}/>
                    {/*Right Post*/}
                    <Circle x={405} y={435} radius={POST_R} fill={colors.posts}/>
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
                            x={3}
                            y={5}
                            width={28}
                            height={26}
                            fill={sl.umpireAccent}
                            cornerRadius={2}
                        />
                    </Group>
                </Group>
            </Layer>
        </Stage>
    );
}

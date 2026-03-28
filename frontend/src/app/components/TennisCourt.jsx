"use client";

import React, {useEffect, useState} from "react";
import {Line, Rect, Stage, Layer, Circle} from "react-konva";

const STAGE_W = 450;
const STAGE_H = 870;

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
        hard: {court: "#4a90d9", lines: "#ffffff", posts: "#22331e", outArea: "#2e572d"},
        clay: {court: "#c8622a", lines: "#ffffff", posts: "#3f6b35", outArea: "#c8622a"},
        grass: {court: "#4a7c3f", lines: "#ffffff", posts: "#8B5A2B", outArea: "#4a7c3f"},
    };

    const colors = courtColors[surface.toLowerCase()];
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

    return (
        <Stage width={STAGE_W * s} height={STAGE_H * s}>
            <Layer scaleX={s} scaleY={s}>
                <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill={colors.outArea}/>
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
                <Circle x={45} y={435} radius={5} fill={colors.posts}/>
                {/*Right Post*/}
                <Circle x={405} y={435} radius={5} fill={colors.posts}/>
            </Layer>
        </Stage>
    );
}


"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const STAGE_W = 450;
const STAGE_H = 870;

const TennisCourt = dynamic(() => import("../components/TennisCourt.jsx"), {
  ssr: false,
});

export default function MatchCourtShell(props) {
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const vw = vv?.width ?? window.innerWidth;
      const reservedY = 160;
      const reservedX = 56;
      const maxH = Math.max(240, vh - reservedY);
      const maxW = Math.max(200, vw - reservedX);
      const next = Math.min(maxH / STAGE_H, maxW / STAGE_W, 1);
      setScale(Math.max(0.38, next * 0.98));
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
  }, []);

  return <TennisCourt {...props} scale={scale} />;
}

import {getServeSide} from "./courtUtils.js";

const SHOT_TYPES = {
  f: "Forehand groundstroke", b: "Backhand groundstroke", r: "Forehand slice", s: "Backhand slice",
  v: "Forehand volley", z: "Backhand volley", o: "Overhead / smash", p: "Backhand overhead / smash",
  u: "Forehand drop shot", y: "Backhand drop shot", l: "Forehand lob", m: "Backhand lob",
  t: "Trick shot", q: "Unknown shot type", h: "Forehand half-volley", i: "Backhand half-volley",
  j: "Forehand swinging volley", k: "Backhand swinging volley",
};
const SERVE_DIRECTIONS = {0: "Unknown", 4: "Wide", 5: "Body", 6: "T"};
const DIRECTIONS = {
  0: "Unknown direction",
  1: "Forehand side (right-handed) / backhand side (left-handed)",
  2: "Middle of court",
  3: "Backhand side (right-handed) / forehand side (left-handed)",
};
const SHOT_DEPTHS = {7: "Short", 8: "Medium-depth", 9: "Deep"};
const OUTCOMES = {
  "*": "Winner", "#": "Forced error", "@": "Unforced error", "!": "Shank",
  n: "Net error", d: "Deep error", w: "Wide error", x: "Wide and deep error", g: "Foot fault",
  e: "Unknown error", V: "Time violation",
};
const MARKERS = {
  "+": "Approach / serve-and-volley", "^": "Stop volley / drop volley", "-": "Shot taken at net",
  "=": "Shot taken at baseline", ";": "Net cord",
};
const SERVE_FAULTS = new Set(["n", "d", "w", "x", "g", "e", "V", "!"]);
const PENALTIES = {
  P: "Point penalty against server",
  Q: "Point penalty against returner",
};

function addOutcome(shot, code, kind) {
  const description = code === "#" && kind === "serve" ? "Unreturnable serve" : OUTCOMES[code];
  if (!description) return;
  shot.outcome = shot.outcome ? `${shot.outcome} / ${description}` : description;
}

function parseSequence(raw, attempt) {
  const text = typeof raw === "string" ? raw.trim() : "";
  const shots = [];
  const events = [];
  const unparsed = [];
  if (!text) return {shots, events, unparsed};

  if (text === "P" || text === "Q") {
    events.push({label: PENALTIES[text], code: text});
    return {shots, events, unparsed};
  }
  if (text === "S" || text === "R") {
    events.push({label: text === "S" ? "Uncharted point awarded to server" : "Uncharted point awarded to returner", code: text});
    return {shots, events, unparsed};
  }

  let index = 0;
  let letCount = 0;
  while (text[index] === "c") { letCount += 1; index += 1; }
  const serveCode = text[index];
  if (SERVE_DIRECTIONS[serveCode]) {
    if (letCount) {
      for (let letIndex = 0; letIndex < letCount; letIndex += 1) {
        shots.push({
          kind: "serve", label: "Let serve", player: null,
          direction: SERVE_DIRECTIONS[serveCode], directionCode: serveCode,
          outcome: "Let", markers: ["Let"], attempt,
        });
      }
    }
    const serve = {
      kind: "serve", label: `${attempt === 2 ? "Second" : "First"} serve`, player: null,
      direction: SERVE_DIRECTIONS[serveCode], directionCode: serveCode, outcome: null,
      markers: [], attempt,
    };
    index += 1;
    if (text[index] === "+") { serve.markers.push(MARKERS["+"]); index += 1; }
    if (text[index] === "*") {
      serve.outcome = "Ace";
      index += 1;
    } else if (text[index] === "#") {
      serve.outcome = "Unreturnable serve";
      index += 1;
    } else if (SERVE_FAULTS.has(text[index])) {
      addOutcome(serve, text[index], "serve");
      index += 1;
    }
    shots.push(serve);
  } else if (letCount) {
    events.push({label: `${letCount} let${letCount === 1 ? "" : "s"} before the recorded serve`, code: "c"});
  } else if (SERVE_FAULTS.has(text[0])) {
    const serve = {
      kind: "serve", label: `${attempt === 2 ? "Second" : "First"} serve`, player: null,
      direction: "Unknown", directionCode: "0", outcome: null, markers: [], attempt,
    };
    addOutcome(serve, text[0], "serve");
    shots.push(serve);
    index = 1;
  }

  let current = null;
  let isFirstRallyShot = true;
  const flush = () => {
    if (current) shots.push(current);
    current = null;
  };
  for (; index < text.length; index += 1) {
    const code = text[index];
    if (SHOT_TYPES[code]) {
      flush();
      current = {
        kind: "rally", label: SHOT_TYPES[code], player: null, direction: null,
        typeCode: code, directionCode: null, returnDepth: null, outcome: null, markers: [], attempt,
        isServiceReturn: isFirstRallyShot,
      };
      isFirstRallyShot = false;
    } else if (code >= "0" && code <= "3") {
      if (current && current.directionCode == null) {
        current.direction = DIRECTIONS[code];
        current.directionCode = code;
      } else if (current) unparsed.push(code);
      else unparsed.push(code);
    } else if (SHOT_DEPTHS[code]) {
      // Official codes use 7/8/9 for service-return depth. Some chart rows
      // also attach those depth digits to later rally shots; retain and plot
      // the annotation on the immediately preceding shot instead of dropping it.
      if (current && current.directionCode != null && current.returnDepth == null) current.returnDepth = SHOT_DEPTHS[code];
      else unparsed.push(code);
    } else if (MARKERS[code]) {
      if (current) current.markers.push(MARKERS[code]);
      else if (shots.length) shots[shots.length - 1].markers.push(MARKERS[code]);
      else unparsed.push(code);
    } else if (OUTCOMES[code]) {
      if (current) addOutcome(current, code, "rally");
      else if (shots.length && shots.at(-1).kind === "serve") addOutcome(shots.at(-1), code, "serve");
      else unparsed.push(code);
    } else if (code === "C") {
      events.push({label: "Play stopped for an incorrect challenge", code});
    } else if (code === " ") {
      continue;
    } else {
      unparsed.push(code);
    }
  }
  flush();
  return {shots, events, unparsed};
}

export function parsePoint(point) {
  const first = typeof point?.first === "string" ? point.first.trim() : "";
  const second = typeof point?.second === "string" ? point.second.trim() : "";
  const hadFirstFault = Boolean(second);
  const firstParsed = parseSequence(first, 1);
  const secondParsed = hadFirstFault ? parseSequence(second, 2) : {shots: [], events: [], unparsed: []};
  const firstServes = firstParsed.shots.filter((shot) => shot.kind === "serve");
  const secondSequence = secondParsed.shots;
  const allShots = hadFirstFault
    ? [...firstServes, ...secondSequence]
    : firstParsed.shots;
  if (hadFirstFault) {
    const firstServe = allShots.find((shot) => shot.kind === "serve" && shot.attempt === 1);
    if (firstServe && !firstServe.outcome) firstServe.outcome = "Fault";
  }

  const server = Number(point?.server);
  let nextHitter = server === 1 ? 2 : 1;
  for (const shot of allShots) {
    if (shot.kind === "serve") shot.player = server || null;
    else {
      shot.player = nextHitter;
      nextHitter = nextHitter === 1 ? 2 : 1;
    }
  }
  const unparsed = [...firstParsed.unparsed, ...secondParsed.unparsed];
  return {
    shots: allShots,
    events: [...firstParsed.events, ...secondParsed.events],
    unparsed,
    complete: unparsed.length === 0,
  };
}

const COURT = {left: 90, right: 360, center: 225, net: 435, nearService: 615, farService: 255, nearBase: 825, farBase: 45};

function stableJitter(point, index, axis, range) {
  const seedText = `${point?.match_id ?? ""}:${point?.point_number ?? ""}:${point?.score ?? ""}:${index}:${axis}`;
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  const normalized = (seed >>> 0) / 4294967295;
  return (normalized - 0.5) * range;
}

function sideAtStart(point) {
  const totalGames = Number(point?.game1 ?? 0) + Number(point?.game2 ?? 0);
  // The chart gives match slots, not the camera's starting end. Use player 1
  // near initially, then approximate the end changes from completed games.
  let nearSlot = Math.floor((totalGames + 1) / 2) % 2 === 0 ? 1 : 2;
  const isTiebreak = (Number(point?.game1) === 6 && Number(point?.game2) === 6)
    || (Number(point?.game1) === 3 && Number(point?.game2) === 3);
  if (isTiebreak) {
    const tieScore = String(point?.score || "0-0").split("-").map(Number);
    const tiePoints = tieScore.length === 2 ? tieScore[0] + tieScore[1] : 0;
    if (Number.isFinite(tiePoints) && Math.floor(tiePoints / 6) % 2 === 1) nearSlot = nearSlot === 1 ? 2 : 1;
  }
  return {nearSlot};
}

export function getPointServeSide(point) {
  const score = String(point?.score || "0-0");
  const isTiebreak = (Number(point?.game1) === 6 && Number(point?.game2) === 6)
    || (Number(point?.game1) === 3 && Number(point?.game2) === 3);

  if (!isTiebreak) return getServeSide(score) || "D";

  // In a tiebreak, the first point is served from deuce; the side then
  // alternates in pairs (ad, ad, deuce, deuce, ...).
  const tiePoints = score.split("-").reduce((sum, value) => {
    const parsed = Number(value);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  return tiePoints % 4 === 0 || tiePoints % 4 === 3 ? "D" : "A";
}

function serveCourtX(serveSide, hitterNear, direction) {
  const deuce = serveSide === "D";
  // The diagonally opposite service box is left of center for a near-side
  // deuce serve and right of center for a near-side ad serve (reversed at the far end).
  const targetRight = deuce !== hitterNear;
  if (direction === "Wide") return targetRight ? 325 : 125;
  if (direction === "T") return targetRight ? 250 : 200;
  if (direction === "Body") return targetRight ? 290 : 160;
  return targetRight ? 280 : 170;
}

function shotTarget(shot, point, previous, index, playerHands) {
  const {nearSlot} = sideAtStart(point);
  const hitterNear = Number(shot.player) === nearSlot;
  const targetNear = !hitterNear;
  if (shot.kind === "serve") {
    const serveSide = getPointServeSide(point);
    const deuce = serveSide === "D";
    const targetRight = deuce !== hitterNear;
    const minX = targetRight ? COURT.center + 2 : COURT.left + 2;
    const maxX = targetRight ? COURT.right - 2 : COURT.center - 2;
    let x = serveCourtX(serveSide, hitterNear, shot.direction) + stableJitter(point, index, "serve-x", 20);
    let y = (hitterNear ? 325 : 545) + stableJitter(point, index, "serve-y", 20);
    const outcome = shot.outcome || "";
    if (outcome.includes("Net error")) y = COURT.net;
    else if (outcome.includes("Wide and net error")) {
      x = (x < COURT.center ? COURT.left - 8 : COURT.right + 8) + stableJitter(point, index, "serve-wide", 8);
      y = COURT.net;
    } else if (outcome.includes("Wide error")) {
      x = (x < COURT.center ? COURT.left - 8 : COURT.right + 8) + stableJitter(point, index, "serve-wide", 8);
    } else if (outcome.includes("Deep error")) {
      y = (hitterNear ? COURT.nearBase + 8 : COURT.farBase - 8) + stableJitter(point, index, "serve-deep", 8);
    } else {
      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(COURT.farBase, Math.min(COURT.nearBase, y));
    }
    return {x, y};
  }

  // Sackmann directions identify the hitter-relative court side. On the
  // opposite end of the court, screen left/right reverses.
  const code = Number(shot.directionCode);
  const isLeftHanded = String(playerHands?.[Number(shot.player) - 1] || "R").toUpperCase() === "L";
  const forehandOnRight = hitterNear !== isLeftHanded;
  // Code 1 is a right-hander's forehand side or a left-hander's backhand
  // side; those correspond to the same screen side from either end.
  const directionOneOnRight = isLeftHanded ? !forehandOnRight : forehandOnRight;
  const targetRight = code === 1 ? directionOneOnRight : code === 3 ? !directionOneOnRight : null;
  let x = targetRight == null ? COURT.center : targetRight ? COURT.right - 35 : COURT.left + 35;
  const targetBase = targetNear ? COURT.nearBase : COURT.farBase;
  const targetService = targetNear ? COURT.nearService : COURT.farService;
  const fraction = shot.returnDepth === "Short" ? 0.42
    : shot.returnDepth === "Medium-depth" ? 0.68
      : shot.returnDepth === "Deep" ? 0.88 : 0.78;
  let y = COURT.net + (targetBase - COURT.net) * fraction;
  // Keep the service line in the calculation to distinguish the charted
  // return-depth buckets from ordinary rally shots.
  const returnDepthY = shot.returnDepth === "Short" ? (COURT.net + targetService) / 2
    : shot.returnDepth === "Medium-depth" ? (targetService + targetBase) / 2 : y;
  y = shot.returnDepth ? returnDepthY : y;

  // Charted errors describe where the ball finishes. Keep regular landings
  // inside the singles court, but let explicit errors scatter just beyond it.
  const outcome = shot.outcome || "";
  if (outcome.includes("Net error")) {
    y = COURT.net;
  } else {
    x += stableJitter(point, index, "x", 20);
    y += stableJitter(point, index, "y", 20);
    if (outcome.includes("Wide and deep error")) {
      x = (x < COURT.center ? COURT.left - 8 : COURT.right + 8) + stableJitter(point, index, "wide", 8);
      y = (targetNear ? COURT.nearBase + 8 : COURT.farBase - 8) + stableJitter(point, index, "deep", 8);
    } else if (outcome.includes("Wide error")) {
      x = (x < COURT.center ? COURT.left - 8 : COURT.right + 8) + stableJitter(point, index, "wide", 8);
      y = Math.max(COURT.farBase, Math.min(COURT.nearBase, y));
    } else if (outcome.includes("Deep error")) {
      x = Math.max(COURT.left, Math.min(COURT.right, x));
      y = (targetNear ? COURT.nearBase + 8 : COURT.farBase - 8) + stableJitter(point, index, "deep", 8);
    } else {
      x = Math.max(COURT.left, Math.min(COURT.right, x));
      y = Math.max(COURT.farBase, Math.min(COURT.nearBase, y));
    }
  }
  return {x, y, fromX: previous?.x ?? COURT.center};
}

export function getReplayFrame(point, playerHands = []) {
  const parsed = parsePoint(point);
  let previous = null;
  const shots = parsed.shots.map((shot, index) => {
    const target = shotTarget(shot, point, previous, index, playerHands);
    const {nearSlot} = sideAtStart(point);
    const servingNear = Number(point?.server) === nearSlot;
    const deuceServe = getPointServeSide(point) === "D";
    const serverRight = deuceServe === servingNear;
    const serverPosition = {
      x: serverRight ? COURT.center + 48 : COURT.center - 48,
      y: servingNear ? COURT.nearBase + 12 : COURT.farBase - 12,
    };
    const missedServe = shot.kind === "serve" && Boolean(shot.outcome)
      && !["Ace", "Unreturnable serve", "Let"].includes(shot.outcome);
    const from = shot.kind === "serve" ? serverPosition : previous || serverPosition;
    const showPath = !missedServe && (shot.kind === "serve" || previous !== null);
    if (!missedServe) previous = target;
    return {...shot, index, x: target.x, y: target.y, fromX: from.x, fromY: from.y, showPath};
  });
  return {...parsed, shots};
}

export function formatPointScore(point) {
  return `Set ${point?.set1 ?? "?"}-${point?.set2 ?? "?"} · Games ${point?.game1 ?? "?"}-${point?.game2 ?? "?"} · ${point?.score ?? "?"}`;
}

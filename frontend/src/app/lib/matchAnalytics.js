import {parsePoint} from "./pointReplay.js";

const RALLY_BUCKETS = ["0-2", "3-6", "7+"];

function directionGroup(shot, playerHands) {
  const code = Number(shot.directionCode);
  if (code === 2 || code === 0) return code === 2 ? "Middle" : "Unknown";
  if (code !== 1 && code !== 3) return "Unknown";

  const receiver = Number(shot.player) === 1 ? 2 : 1;
  const receiverIsLeftHanded = String(playerHands?.[receiver - 1] || "R").toUpperCase() === "L";
  const toForehand = code === 1 ? !receiverIsLeftHanded : receiverIsLeftHanded;
  return toForehand ? "Forehand side" : "Backhand side";
}

function pointEndingCategory(shots) {
  const ending = shots.at(-1);
  if (!ending) return null;
  if (ending.outcome === "Winner") return "winners";
  if (ending.outcome === "Forced error") return "forcedErrorsDrawn";
  if (ending.outcome === "Unforced error") return "unforcedErrorsDrawn";
  if (ending.outcome === "Ace") return "aces";
  if (ending.outcome === "Unreturnable serve") return "unreturnables";
  if (ending.kind === "serve" && ending.attempt === 2) return "doubleFaults";
  return "other";
}

export function buildMatchAnalytics(points = [], playerHands = [], playerNames = []) {
  const players = [1, 2].map((slot) => ({
    name: playerNames[slot - 1] || `Player ${slot}`,
    pointsWon: 0,
    pointsPlayed: 0,
    shotTypes: {},
    shotDirections: {"Forehand side": 0, Middle: 0, "Backhand side": 0, Unknown: 0},
    pointEndings: {
      winners: 0,
      forcedErrorsDrawn: 0,
      unforcedErrorsDrawn: 0,
      aces: 0,
      unreturnables: 0,
      doubleFaults: 0,
      other: 0,
    },
  }));
  const rallyLengths = Object.fromEntries(RALLY_BUCKETS.map((bucket) => [bucket, {
    points: 0,
    wins: [0, 0],
  }]));

  for (const point of points) {
    const winner = Number(point?.winner);
    const parsed = parsePoint(point);
    const rallyShots = parsed.shots.filter((shot) => shot.kind === "rally");
    for (const player of players) player.pointsPlayed += 1;
    if (winner === 1 || winner === 2) players[winner - 1].pointsWon += 1;

    for (const shot of rallyShots) {
      const player = players[Number(shot.player) - 1];
      if (!player) continue;
      player.shotTypes[shot.label] = (player.shotTypes[shot.label] || 0) + 1;
      const direction = directionGroup(shot, playerHands);
      player.shotDirections[direction] += 1;
    }

    const endingCategory = pointEndingCategory(parsed.shots);
    if (endingCategory && (winner === 1 || winner === 2)) {
      players[winner - 1].pointEndings[endingCategory] += 1;
    }

    const bucket = rallyShots.length <= 2 ? "0-2" : rallyShots.length <= 6 ? "3-6" : "7+";
    rallyLengths[bucket].points += 1;
    if (winner === 1 || winner === 2) rallyLengths[bucket].wins[winner - 1] += 1;
  }

  return {pointsCompleted: points.length, players, rallyLengths};
}


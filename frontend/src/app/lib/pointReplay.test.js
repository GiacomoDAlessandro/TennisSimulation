import test from "node:test";
import assert from "node:assert/strict";
import {formatPointScore, getPointServeSide, getReplayFrame, parsePoint} from "./pointReplay.js";

test("parses serve and rally shots in chart order and assigns alternating players", () => {
  const point = {server: 1, first: "4f2b1f3*", second: "", score: "15-0", set1: 0, set2: 0, game1: 0, game2: 0};
  const parsed = parsePoint(point);
  assert.deepEqual(parsed.shots.map((shot) => shot.kind), ["serve", "rally", "rally", "rally"]);
  assert.deepEqual(parsed.shots.map((shot) => shot.player), [1, 2, 1, 2]);
  assert.equal(parsed.shots[0].direction, "Wide");
  assert.equal(parsed.shots.at(-1).outcome, "Winner");
  assert.deepEqual(parsed.unparsed, []);
});

test("keeps a first serve fault and parses the second-serve rally", () => {
  const parsed = parsePoint({server: 2, first: "6n", second: "5f18b2@", score: "30-15"});
  assert.equal(parsed.shots[0].attempt, 1);
  assert.equal(parsed.shots[0].outcome, "Net error");
  assert.equal(parsed.shots[1].attempt, 2);
  assert.equal(parsed.shots[1].direction, "Body");
  assert.equal(parsed.shots[1].player, 2);
  assert.equal(parsed.shots[2].player, 1);
  assert.equal(parsed.shots.at(-1).outcome, "Unforced error");
});

test("represents aces, let markers, incomplete strings, and unknown symbols", () => {
  const ace = parsePoint({server: 1, first: "c6*", second: ""});
  assert.equal(ace.shots[0].outcome, "Let");
  assert.equal(ace.shots[1].outcome, "Ace");
  assert.ok(ace.shots[0].markers.includes("Let"));
  assert.equal(parsePoint({server: 1, first: "S", second: ""}).events[0].label, "Uncharted point awarded to server");
  assert.equal(parsePoint({server: 1, first: "n", second: ""}).shots[0].outcome, "Net error");
  const unknown = parsePoint({server: 1, first: "4f1`", second: ""});
  assert.deepEqual(unknown.unparsed, ["`"]);
  assert.equal(unknown.complete, false);
});

test("uses tutorial meanings for direction, return depth, court markers and special codes", () => {
  const parsed = parsePoint({server: 1, first: "4f37b;-2C", second: ""});
  assert.equal(parsed.shots[1].direction, "Backhand side (right-handed) / forehand side (left-handed)");
  assert.equal(parsed.shots[1].returnDepth, "Short");
  assert.ok(parsed.shots[2].markers.includes("Net cord"));
  assert.ok(parsed.shots[2].markers.includes("Shot taken at net"));
  assert.equal(parsed.events[0].label, "Play stopped for an incorrect challenge");
  assert.deepEqual(parsed.unparsed, []);

  const penalty = parsePoint({server: 1, first: "P", second: ""});
  assert.equal(penalty.events[0].label, "Point penalty against server");
  assert.equal(parsePoint({server: 2, first: "Q", second: ""}).events[0].label, "Point penalty against returner");
  assert.equal(parsePoint({server: 1, first: "R", second: ""}).events[0].label, "Uncharted point awarded to returner");
});

test("builds approximate replay coordinates and readable scoreboard text", () => {
  const point = {server: 1, first: "4f2b1*", second: "", score: "0-0", set1: 1, set2: 0, game1: 2, game2: 3};
  const frame = getReplayFrame(point);
  assert.equal(frame.shots.length, 3);
  assert.ok(frame.shots.every((shot) => Number.isFinite(shot.x) && Number.isFinite(shot.y)));
  assert.equal(formatPointScore(point), "Set 1-0 · Games 2-3 · 0-0");
});

test("uses the point-start score side for lets and both serve attempts", () => {
  const letPoint = {server: 1, first: "c6*", second: "", score: "15-0", game1: 0, game2: 0};
  const letFrame = getReplayFrame(letPoint);
  assert.equal(letFrame.shots.length, 2);
  assert.equal(letFrame.shots[0].label, "Let serve");
  assert.equal(letFrame.shots[0].outcome, "Let");
  assert.equal(letFrame.shots[1].label, "First serve");
  assert.equal(letFrame.shots[1].outcome, "Ace");
  assert.deepEqual(letFrame.shots[0].markers, ["Let"]);
  assert.equal(letFrame.shots[0].y, getReplayFrame({...letPoint, first: "6*"}).shots[0].y);
  assert.ok(letFrame.shots.every((shot) => shot.x > 225));

  const faultPoint = {server: 1, first: "6n", second: "4f1*", score: "30-15", game1: 0, game2: 0};
  const faultFrame = getReplayFrame(faultPoint);
  const serves = faultFrame.shots.filter((shot) => shot.kind === "serve");
  assert.deepEqual(serves.map((shot) => shot.attempt), [1, 2]);
  assert.equal(serves[0].fromY, serves[1].fromY);
});

test("follows the two-point service-side pattern in tiebreaks", () => {
  const sides = [0, 1, 2, 3, 4, 5, 6, 7].map((total) => getPointServeSide({
    score: `${Math.floor(total / 2)}-${Math.ceil(total / 2)}`,
    game1: 6,
    game2: 6,
  }));
  assert.deepEqual(sides, ["D", "A", "A", "D", "D", "A", "A", "D"]);
  assert.equal(getPointServeSide({score: "40-AD", game1: 4, game2: 3}), "A");
  assert.equal(getPointServeSide({score: "AD-40", game1: 4, game2: 3}), "A");
  assert.equal(getPointServeSide({score: "2-0", game1: 3, game2: 3}), "A");
  assert.deepEqual(["0-0", "15-0", "30-0", "40-0", "15-15", "40-15", "40-30"]
    .map((score) => getPointServeSide({score, game1: 0, game2: 0})),
  ["D", "A", "D", "A", "D", "D", "A"]);
});

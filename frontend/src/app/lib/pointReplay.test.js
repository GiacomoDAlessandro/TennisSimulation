import test from "node:test";
import assert from "node:assert/strict";
import {formatPointScore, getReplayFrame, parsePoint} from "./pointReplay.js";

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
  assert.equal(ace.shots[0].outcome, "Ace");
  assert.ok(ace.shots[0].markers.includes("Let"));
  assert.equal(parsePoint({server: 1, first: "S", second: ""}).events[0].label, "Uncharted point awarded to server");
  assert.equal(parsePoint({server: 1, first: "n", second: ""}).shots[0].outcome, "Net error");
  const unknown = parsePoint({server: 1, first: "4f1`", second: ""});
  assert.deepEqual(unknown.unparsed, ["`"]);
  assert.equal(unknown.complete, false);
});

test("uses tutorial meanings for direction, return depth, court markers and special codes", () => {
  const parsed = parsePoint({server: 1, first: "4f37b;-2C", second: ""});
  assert.equal(parsed.shots[1].direction, "Right-hander backhand / left-hander forehand side");
  assert.equal(parsed.shots[1].returnDepth, "Short return");
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

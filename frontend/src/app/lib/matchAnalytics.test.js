import test from "node:test";
import assert from "node:assert/strict";

test("aggregates charted shots and point outcomes through completed points", async () => {
  const analyticsModule = await import("./matchAnalytics.js").catch(() => ({}));
  assert.equal(typeof analyticsModule.buildMatchAnalytics, "function");

  const result = analyticsModule.buildMatchAnalytics([
    {server: 1, winner: 2, first: "4f1b2f3*", second: ""},
    {server: 2, winner: 1, first: "6f3@", second: ""},
  ], ["R", "R"], ["Player One", "Player Two"]);

  assert.equal(result.pointsCompleted, 2);
  assert.equal(result.players[0].pointsWon, 1);
  assert.equal(result.players[1].pointsWon, 1);
  assert.equal(result.players[1].shotTypes["Forehand groundstroke"], 2);
  assert.equal(result.players[0].shotTypes["Forehand groundstroke"], 1);
  assert.equal(result.players[1].pointEndings.winners, 1);
  assert.equal(result.players[0].pointEndings.unforcedErrorsDrawn, 1);
  assert.equal(result.rallyLengths["3-6"].points, 1);
  assert.equal(result.rallyLengths["0-2"].points, 1);
});

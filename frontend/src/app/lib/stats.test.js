import test from "node:test";
import assert from "node:assert/strict";
import {
    compareTwoRates,
    fishersExact,
    linearTrend,
    mannKendall,
    twoProportionZTest,
    wilsonInterval,
} from "./stats.js";

test("wilsonInterval 8/10 matches published 95% bounds", () => {
    const {low, high, center} = wilsonInterval(8, 10, 1.96);
    assert.ok(Math.abs(low - 0.4902) < 0.002);
    assert.ok(Math.abs(high - 0.9433) < 0.002);
    assert.ok(center > low && center < high);
});

test("twoProportionZTest equal rates is inconclusive", () => {
    const {z, pValue} = twoProportionZTest(50, 100, 50, 100);
    assert.equal(z, 0);
    assert.ok(pValue > 0.99);
});

test("twoProportionZTest large difference has small p", () => {
    const {pValue} = twoProportionZTest(40, 100, 80, 100);
    assert.ok(pValue < 0.001);
});

test("fishersExact small table", () => {
    const {pValue} = fishersExact(1, 8, 7, 8);
    assert.ok(pValue < 0.05);
    assert.ok(pValue > 0);
});

test("compareTwoRates uses fisher below n=30", () => {
    const r = compareTwoRates(2, 10, 8, 10);
    assert.equal(r.method, "fisher");
    assert.ok(r.pValue != null);
});

test("compareTwoRates uses z-test at n>=30", () => {
    const r = compareTwoRates(20, 40, 28, 40);
    assert.equal(r.method, "z");
    assert.ok(r.pValue != null);
});

test("linearTrend recovers y=2x+1", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 2 * x + 1);
    const t = linearTrend(xs, ys);
    assert.ok(Math.abs(t.slope - 2) < 1e-9);
    assert.ok(Math.abs(t.intercept - 1) < 1e-9);
    assert.ok(Math.abs(t.r2 - 1) < 1e-9);
    assert.ok(t.pValue < 0.01);
});

test("mannKendall increasing series", () => {
    const mk = mannKendall([1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(mk.direction, "increasing");
    assert.ok(mk.pValue < 0.05);
});

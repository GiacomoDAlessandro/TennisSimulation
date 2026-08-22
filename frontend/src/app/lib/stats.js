const INV_SQRT2 = 1 / Math.SQRT2;

function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const y =
        1 -
        (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
            0.254829592) *
            t *
            Math.exp(-a * a));
    return sign * y;
}

export function normalCdf(z) {
    return 0.5 * (1 + erf(z * INV_SQRT2));
}

export function normalTwoTailedP(z) {
    if (!Number.isFinite(z)) return null;
    return Math.min(1, 2 * (1 - normalCdf(Math.abs(z))));
}

export function wilsonInterval(successes, n, z = 1.96) {
    const s = Number(successes);
    const nn = Number(n);
    if (!Number.isFinite(s) || !Number.isFinite(nn) || nn <= 0) {
        return {low: null, high: null, center: null};
    }
    const p = s / nn;
    const z2 = z * z;
    const denom = 1 + z2 / nn;
    const center = (p + z2 / (2 * nn)) / denom;
    const margin =
        (z * Math.sqrt((p * (1 - p)) / nn + z2 / (4 * nn * nn))) / denom;
    return {
        center,
        low: Math.max(0, center - margin),
        high: Math.min(1, center + margin),
    };
}

export function twoProportionZTest(s1, n1, s2, n2) {
    const a = Number(s1);
    const na = Number(n1);
    const b = Number(s2);
    const nb = Number(n2);
    if (![a, na, b, nb].every(Number.isFinite) || na <= 0 || nb <= 0) {
        return {z: null, pValue: null};
    }
    const p1 = a / na;
    const p2 = b / nb;
    const pooled = (a + b) / (na + nb);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / na + 1 / nb));
    if (se === 0) return {z: 0, pValue: 1};
    const z = (p2 - p1) / se;
    return {z, pValue: normalTwoTailedP(z)};
}

const logFactCache = [0];

function logFact(n) {
    const k = Math.floor(n);
    if (k < 0) return Number.NEGATIVE_INFINITY;
    while (logFactCache.length <= k) {
        const i = logFactCache.length;
        logFactCache.push(logFactCache[i - 1] + Math.log(i));
    }
    return logFactCache[k];
}

function logChoose(n, k) {
    if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
    return logFact(n) - logFact(k) - logFact(n - k);
}

function hypergeomLogP(k, N, K, n) {
    return logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n);
}

export function fishersExact(s1, n1, s2, n2) {
    const a = Math.round(Number(s1));
    const na = Math.round(Number(n1));
    const c = Math.round(Number(s2));
    const nb = Math.round(Number(n2));
    if (![a, na, c, nb].every(Number.isFinite) || na <= 0 || nb <= 0) {
        return {pValue: null};
    }
    const b = na - a;
    const d = nb - c;
    if (b < 0 || d < 0) return {pValue: null};

    const N = a + b + c + d;
    const K = a + c;
    const n = a + b;
    const lo = Math.max(0, n - (N - K));
    const hi = Math.min(n, K);
    const observedLog = hypergeomLogP(a, N, K, n);
    let total = 0;
    let extreme = 0;
    for (let k = lo; k <= hi; k++) {
        const lp = hypergeomLogP(k, N, K, n);
        const p = Math.exp(lp);
        total += p;
        if (lp <= observedLog + 1e-12) extreme += p;
    }
    const pValue = total > 0 ? Math.min(1, extreme / total) : null;
    return {pValue};
}

export function compareTwoRates(s1, n1, s2, n2, {smallN = 30} = {}) {
    const na = Number(n1);
    const nb = Number(n2);
    if (Math.min(na, nb) < smallN) {
        const fisher = fishersExact(s1, n1, s2, n2);
        return {method: "fisher", pValue: fisher.pValue, z: null};
    }
    const ztest = twoProportionZTest(s1, n1, s2, n2);
    return {method: "z", pValue: ztest.pValue, z: ztest.z};
}

export function linearTrend(xs, ys) {
    const pairs = [];
    const nIn = Math.min(xs?.length ?? 0, ys?.length ?? 0);
    for (let i = 0; i < nIn; i++) {
        const x = Number(xs[i]);
        const y = Number(ys[i]);
        if (Number.isFinite(x) && Number.isFinite(y)) pairs.push([x, y]);
    }
    const n = pairs.length;
    if (n < 3) {
        return {slope: null, intercept: null, r2: null, pValue: null, n};
    }
    const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
    const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
    let sxx = 0;
    let sxy = 0;
    let sst = 0;
    for (const [x, y] of pairs) {
        const dx = x - mx;
        const dy = y - my;
        sxx += dx * dx;
        sxy += dx * dy;
        sst += dy * dy;
    }
    if (sxx === 0) {
        return {slope: 0, intercept: my, r2: null, pValue: null, n};
    }
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    let sse = 0;
    for (const [x, y] of pairs) {
        const pred = intercept + slope * x;
        const e = y - pred;
        sse += e * e;
    }
    const r2 = sst === 0 ? 1 : 1 - sse / sst;
    const df = n - 2;
    const mse = df > 0 ? sse / df : 0;
    const seSlope = Math.sqrt(mse / sxx);
    const t = seSlope === 0 ? (slope === 0 ? 0 : Infinity) : slope / seSlope;
    return {
        slope,
        intercept,
        r2,
        pValue: Number.isFinite(t) ? normalTwoTailedP(t) : 0,
        n,
        t,
    };
}

function sign(v) {
    if (v > 0) return 1;
    if (v < 0) return -1;
    return 0;
}

export function mannKendall(ys) {
    const vals = (ys || []).map(Number).filter(Number.isFinite);
    const n = vals.length;
    if (n < 3) {
        return {S: null, tau: null, pValue: null, direction: "none", n};
    }
    let S = 0;
    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            S += sign(vals[j] - vals[i]);
        }
    }
    const varS = (n * (n - 1) * (2 * n + 5)) / 18;
    let z = 0;
    if (S > 0) z = (S - 1) / Math.sqrt(varS);
    else if (S < 0) z = (S + 1) / Math.sqrt(varS);
    else z = 0;
    const pValue = normalTwoTailedP(z);
    let direction = "none";
    if (pValue != null && pValue < 0.05) {
        direction = S > 0 ? "increasing" : "decreasing";
    }
    const denom = (n * (n - 1)) / 2;
    const tau = denom ? S / denom : 0;
    return {S, tau, z, pValue, direction, n};
}

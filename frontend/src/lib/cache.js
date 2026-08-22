const DEFAULT_TTL_MS = 60 * 60 * 1000;

function safeParse(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Read a localStorage cache entry.
 * @returns {{ data: any, fresh: boolean } | null}
 */
export function readCache(key, ttlMs = DEFAULT_TTL_MS) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== "object" || !("savedAt" in parsed)) {
        return null;
    }
    const age = Date.now() - Number(parsed.savedAt);
    if (!Number.isFinite(age) || age < 0) return null;
    return {
        data: parsed.data,
        fresh: age < ttlMs,
    };
}

export function writeCache(key, data) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            key,
            JSON.stringify({savedAt: Date.now(), data})
        );
    } catch {
        // Quota / private mode — ignore
    }
}

export const PLAYERS_CACHE_KEY = "tennis_players_v2";
export const PLAYERS_TTL_MS = 24 * 60 * 60 * 1000;

export function matchesCacheKey(playerName, surface) {
    return `tennis_matches_v1:${playerName}|${surface || "*"}`;
}

export const MATCHES_TTL_MS = 60 * 60 * 1000;

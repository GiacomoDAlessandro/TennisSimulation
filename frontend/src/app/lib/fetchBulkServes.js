import {API_BASE} from "../../lib/api";

/** Keep each bulk URL short and under host timeouts (Render ~30s). */
export const BULK_MATCH_CHUNK_SIZE = 15;

export function chunkIds(ids, size = BULK_MATCH_CHUNK_SIZE) {
    const out = [];
    for (let i = 0; i < ids.length; i += size) {
        out.push(ids.slice(i, i + size));
    }
    return out;
}

/**
 * Fetch serve points for one chunk of match_ids.
 * @returns {Promise<{points: array, match_count: number}>}
 */
export async function fetchServesChunk(playerName, surface, matchIds) {
    const encName = encodeURIComponent(playerName);
    const params = new URLSearchParams();
    if (surface) params.set("surface", surface);
    if (matchIds?.length) params.set("match_ids", matchIds.join(","));
    const qs = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${API_BASE}/getPlayerServesBulk/${encName}${qs}`);
    if (!res.ok) {
        throw new Error(`getPlayerServesBulk failed (${res.status})`);
    }
    const data = await res.json();
    return {
        points: Array.isArray(data?.points) ? data.points : [],
        match_count: Number(data?.match_count) || 0,
    };
}

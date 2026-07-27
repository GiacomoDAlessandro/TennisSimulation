const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE = rawApiUrl
    ? rawApiUrl.replace(/\/$/, "")
    : "http://127.0.0.1:8000";
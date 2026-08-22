export function filterPlayers(list, query) {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((name) =>
        String(name).toLowerCase().split(/\s+/).some((part) => part.startsWith(q))
    );
}

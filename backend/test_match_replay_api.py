import os
import unittest
from unittest.mock import patch

os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "unit-test-key")

import main


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, data):
        self.table_name = table
        self.data = data
        self.filters = {}
        self.selected = None
        self.order_by = None

    def select(self, columns):
        self.selected = columns
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def order(self, key):
        self.order_by = key
        return self

    def range(self, start, end):
        self.range_args = (start, end)
        return self

    def execute(self):
        rows = [row for row in self.data[self.table_name] if all(row.get(k) == v for k, v in self.filters.items())]
        if self.order_by:
            rows.sort(key=lambda row: row[self.order_by])
        start, end = getattr(self, "range_args", (0, len(rows) - 1))
        return FakeResult(rows[start:end + 1])


class FakeSupabase:
    def __init__(self, data):
        self.data = data
        self.queries = []

    def table(self, name):
        query = FakeQuery(name, self.data)
        self.queries.append(query)
        return query


class MatchReplayApiTests(unittest.TestCase):
    def test_endpoint_returns_all_servers_raw_sequences_and_ordered_points(self):
        db = FakeSupabase({
            "matches": [{"match_id": "match-1", "player1": "A", "player2": "B", "surface": "Hard", "tournament": "Open", "round": "F"}],
            "points": [
                {"match_id": "match-1", "point_number": 2, "server": 2, "winner": 1, "game_number": 1, "score": "15-0", "set1": 0, "set2": 0, "game1": 0, "game2": 0, "first": "6n", "second": "5f2b1*"},
                {"match_id": "match-1", "point_number": 1, "server": 1, "winner": 1, "game_number": 1, "score": "0-0", "set1": 0, "set2": 0, "game1": 0, "game2": 0, "first": "4*", "second": None},
            ],
        })
        with patch.object(main, "supabase", db), patch.object(main, "execute_with_limit", lambda fn: fn()):
            result = main.get_all_match_points("match-1")

        self.assertEqual(result["match"]["player1"], "A")
        self.assertEqual([p["point_number"] for p in result["points"]], [1, 2])
        self.assertEqual([p["server"] for p in result["points"]], [1, 2])
        self.assertEqual(result["points"][1]["first"], "6n")
        self.assertIn("first, second", db.queries[-1].selected)
        self.assertEqual(db.queries[-1].filters, {"match_id": "match-1"})

    def test_unknown_match_returns_empty_replay(self):
        db = FakeSupabase({"matches": [], "points": []})
        with patch.object(main, "supabase", db), patch.object(main, "execute_with_limit", lambda fn: fn()):
            self.assertEqual(main.get_all_match_points("missing"), {"match": None, "points": []})


if __name__ == "__main__":
    unittest.main()

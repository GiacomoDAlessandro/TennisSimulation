alter table public.matches
  add column if not exists player1_hand text,
  add column if not exists player2_hand text;

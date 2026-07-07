-- TurtleTrader AI — Supabase Schema
-- Run this in your Supabase SQL editor

-- Scan results (cached daily signals)
create table if not exists scan_results (
  id           bigserial primary key,
  symbol       text not null,
  company      text,
  sector       text,
  scan_date    date not null,
  market_trend text,
  signal       text not null,
  ai_score     numeric(6,2),
  confidence   numeric(5,4),
  entry_price  numeric(12,2),
  stop_loss    numeric(12,2),
  atr          numeric(12,4),
  breakout_level numeric(12,2),
  reasons      jsonb,
  scores       jsonb,
  created_at   timestamptz default now(),
  unique(symbol, scan_date)
);

-- Positions (portfolio)
create table if not exists positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  symbol       text not null,
  company      text,
  quantity     integer not null,
  avg_price    numeric(12,2) not null,
  stop_loss    numeric(12,2),
  entry_date   date not null,
  status       text not null default 'OPEN',
  exit_price   numeric(12,2),
  exit_date    date,
  final_pnl    numeric(15,2),
  created_at   timestamptz default now()
);

-- Watchlists
create table if not exists watchlists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  created_at   timestamptz default now(),
  unique(user_id, name)
);

create table if not exists watchlist_items (
  id           uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  symbol       text not null,
  added_at     timestamptz default now(),
  unique(watchlist_id, symbol)
);

-- User settings
create table if not exists user_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  capital      numeric(15,2) default 100000,
  risk_percent numeric(5,2)  default 1.0,
  broker       text,
  updated_at   timestamptz default now()
);

-- Indexes
create index if not exists idx_scan_date_signal  on scan_results(scan_date, signal);
create index if not exists idx_scan_score        on scan_results(scan_date, ai_score desc);
create index if not exists idx_positions_user    on positions(user_id, status);

-- Row Level Security
alter table positions      enable row level security;
alter table watchlists     enable row level security;
alter table watchlist_items enable row level security;
alter table user_settings  enable row level security;

create policy "users own positions"      on positions      for all using (auth.uid() = user_id);
create policy "users own watchlists"     on watchlists     for all using (auth.uid() = user_id);
create policy "users own settings"       on user_settings  for all using (auth.uid() = user_id);
create policy "scan_results public read" on scan_results   for select using (true);

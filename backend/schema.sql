create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text not null unique,
  username text,
  role text not null default 'viewer' check (role in ('creator', 'viewer', 'advertiser')),
  subscribers_count bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.users(id) on delete cascade,
  cid text not null,
  title text not null,
  description text default '',
  ads_enabled boolean not null default true,
  total_views bigint not null default 0,
  total_watch_time bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  subscriber_id uuid not null references public.users(id) on delete cascade,
  creator_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_unique unique(subscriber_id, creator_id),
  constraint subscriptions_self_guard check (subscriber_id <> creator_id)
);

create table if not exists public.views (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  viewer_wallet text not null,
  viewer_fingerprint text,
  watch_seconds int not null default 0 check (watch_seconds >= 0),
  settled boolean not null default false,
  timestamp timestamptz not null default timezone('utc', now())
);

create table if not exists public.ad_campaigns (
  id uuid primary key default uuid_generate_v4(),
  advertiser_wallet text not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  budget numeric(20, 6) not null check (budget >= 0),
  remaining_budget numeric(20, 6) not null check (remaining_budget >= 0),
  reward_per_view numeric(20, 6) not null check (reward_per_view > 0),
  active boolean not null default true,
  ad_video_cid text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.banner_campaigns (
  id uuid primary key default uuid_generate_v4(),
  advertiser_wallet text not null,
  tier text not null check (tier in ('1m', '3m', '6m')),
  fixed_price numeric(20, 6) not null check (fixed_price > 0),
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  distributed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.settlements (
  id uuid primary key default uuid_generate_v4(),
  creator_wallet text not null,
  amount numeric(20, 6) not null,
  platform_fee numeric(20, 6) not null default 0,
  tx_hash text,
  settlement_type text not null default 'video_ad',
  campaign_id uuid,
  timestamp timestamptz not null default timezone('utc', now())
);

create index if not exists idx_videos_creator_id on public.videos(creator_id);
create index if not exists idx_views_video_id on public.views(video_id);
create index if not exists idx_views_settled on public.views(settled);
create index if not exists idx_ad_campaigns_video_id on public.ad_campaigns(video_id);
create index if not exists idx_settlements_timestamp on public.settlements(timestamp desc);

alter table public.users enable row level security;
alter table public.videos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.views enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.banner_campaigns enable row level security;
alter table public.settlements enable row level security;

drop policy if exists "Public read users" on public.users;
drop policy if exists "Public read videos" on public.videos;
drop policy if exists "Public read ad campaigns" on public.ad_campaigns;
drop policy if exists "Public read banner campaigns" on public.banner_campaigns;
drop policy if exists "Public read settlements" on public.settlements;

create policy "Public read users" on public.users for select using (true);
create policy "Public read videos" on public.videos for select using (true);
create policy "Public read ad campaigns" on public.ad_campaigns for select using (true);
create policy "Public read banner campaigns" on public.banner_campaigns for select using (true);
create policy "Public read settlements" on public.settlements for select using (true);

-- McMusic Hub v2 — session-scoped schema
-- Adapts McJukebox's proven queue_items/RPC pattern (status state machine,
-- advisory locks + FOR UPDATE SKIP LOCKED, double-precision position)
-- rather than reinventing queue-concurrency handling from scratch. The
-- admin PIN system (skip/remove/reorder) from McJukebox is deliberately
-- NOT included here — a real, considered choice, not an oversight.
--
-- Replaces queue_members / hub_config / queue_state from the original
-- AirPlay-relay design entirely. Those can be dropped once this is live.

create table if not exists mcmusic_hub.sessions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  mode text not null default 'open' check (mode in ('open', 'battle')),
  created_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now()
);
-- "Active" is derived at query time from last_heartbeat_at recency, never
-- stored as a separate flag — see the reference query at the bottom.

create type mcmusic_hub.item_source as enum ('plex', 'youtube', 'spotify');
create type mcmusic_hub.item_status as enum ('queued', 'playing', 'played');

create table if not exists mcmusic_hub.queue_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references mcmusic_hub.sessions(id) on delete cascade,
  status mcmusic_hub.item_status not null default 'queued',
  source mcmusic_hub.item_source not null,
  source_id text not null,
  title text not null,
  artist text,
  thumbnail_url text,
  duration_seconds integer,
  position double precision not null,
  added_by text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
-- position is double precision (not integer), matching McJukebox — lets a
-- future reorder feature insert between two existing positions without
-- renumbering anything else, even though no reorder UI exists yet.

create index if not exists queue_items_session_status_position_idx
  on mcmusic_hub.queue_items (session_id, status, position);

-- ---------------------------------------------------------------------
-- add_to_queue_item — mirrors McJukebox's version, scoped to a session:
-- the duplicate-check and position calculation only look within this
-- session_id, so the same song can be queued independently in two
-- different simultaneous gatherings without colliding.
-- ---------------------------------------------------------------------
create or replace function mcmusic_hub.add_to_queue_item(
  p_session_id uuid,
  p_source mcmusic_hub.item_source,
  p_source_id text,
  p_title text,
  p_artist text,
  p_thumbnail_url text,
  p_duration_seconds integer,
  p_added_by text
) returns mcmusic_hub.queue_items
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
declare
  dupe_count int;
  last_position double precision;
  new_row mcmusic_hub.queue_items;
begin
  if length(p_added_by) < 1 then
    raise exception 'added_by is required.';
  end if;

  -- Serializes concurrent adds of the SAME song in the SAME session, so
  -- the duplicate-check below can't race.
  perform pg_advisory_xact_lock(hashtext(p_session_id::text || ':' || p_source_id));

  select count(*) into dupe_count from mcmusic_hub.queue_items
  where session_id = p_session_id and source_id = p_source_id and status in ('queued', 'playing');
  if dupe_count > 0 then
    raise exception 'That song is already in the queue.';
  end if;

  select max(position) into last_position
  from mcmusic_hub.queue_items
  where session_id = p_session_id and status = 'queued';

  insert into mcmusic_hub.queue_items (
    session_id, source, source_id, title, artist, thumbnail_url, duration_seconds,
    position, added_by, status
  )
  values (
    p_session_id, p_source, p_source_id, p_title, p_artist, p_thumbnail_url, p_duration_seconds,
    coalesce(last_position, 0) + 1, p_added_by, 'queued'
  )
  returning * into new_row;

  return new_row;
end;
$$;

-- ---------------------------------------------------------------------
-- start_if_idle — starts the next queued item for a session, only if
-- nothing is already playing in that same session. Advisory lock is
-- scoped to session_id, so one gathering's queue advancing never blocks
-- another's — a real difference from McJukebox, which only ever had one
-- global queue and used a single fixed lock key.
-- ---------------------------------------------------------------------
create or replace function mcmusic_hub.start_if_idle(p_session_id uuid) returns mcmusic_hub.queue_items
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
declare
  next_item mcmusic_hub.queue_items;
begin
  perform pg_advisory_xact_lock(hashtext('mcmusic_hub_queue_advance:' || p_session_id::text));

  if exists (select 1 from mcmusic_hub.queue_items where session_id = p_session_id and status = 'playing') then
    return null;
  end if;

  select * into next_item
  from mcmusic_hub.queue_items
  where session_id = p_session_id and status = 'queued'
  order by position asc limit 1
  for update skip locked;

  if next_item.id is not null then
    update mcmusic_hub.queue_items
    set status = 'playing', started_at = now()
    where id = next_item.id
    returning * into next_item;
  end if;

  if next_item.id is null then
    return null;
  end if;
  return next_item;
end;
$$;

-- ---------------------------------------------------------------------
-- complete_and_advance — marks a finished item played, then starts the
-- next queued item in the SAME session. Same pg_advisory_xact_lock +
-- FOR UPDATE SKIP LOCKED pattern as McJukebox's already-proven version —
-- this is exactly the piece that protects against two near-simultaneous
-- "advance" calls racing each other.
-- ---------------------------------------------------------------------
create or replace function mcmusic_hub.complete_and_advance(p_session_id uuid, p_finished_item_id uuid) returns mcmusic_hub.queue_items
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
declare
  next_item mcmusic_hub.queue_items;
  affected int;
begin
  perform pg_advisory_xact_lock(hashtext('mcmusic_hub_queue_advance:' || p_session_id::text));

  update mcmusic_hub.queue_items
  set status = 'played', completed_at = now()
  where id = p_finished_item_id and session_id = p_session_id and status = 'playing';

  get diagnostics affected = row_count;

  if affected = 0 then
    select * into next_item from mcmusic_hub.queue_items where session_id = p_session_id and status = 'playing' limit 1;
    if next_item.id is null then
      return null;
    end if;
    return next_item;
  end if;

  select * into next_item
  from mcmusic_hub.queue_items
  where session_id = p_session_id and status = 'queued'
  order by position asc
  limit 1
  for update skip locked;

  if next_item.id is not null then
    update mcmusic_hub.queue_items
    set status = 'playing', started_at = now()
    where id = next_item.id
    returning * into next_item;
  end if;

  if next_item.id is null then
    return null;
  end if;
  return next_item;
end;
$$;

-- ---------------------------------------------------------------------
-- remove_own_queue_item — lets a guest remove their own still-queued
-- item. Nothing to do with admin control (declined above) — this is
-- just an "undo a misclick" capability, gated only by matching added_by.
-- ---------------------------------------------------------------------
create or replace function mcmusic_hub.remove_own_queue_item(p_item_id uuid, p_added_by text) returns void
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
begin
  delete from mcmusic_hub.queue_items
  where id = p_item_id and added_by = p_added_by and status = 'queued';
end;
$$;

-- ---------------------------------------------------------------------
-- register_session / heartbeat_session — Player calls register_session
-- once on launch, then heartbeat_session on an interval. Needed now that
-- sessions has no direct-write policy (see below) — matching McJukebox's
-- real pattern of RLS blocking everything except SELECT, with writes
-- only possible through SECURITY DEFINER functions.
-- ---------------------------------------------------------------------
create or replace function mcmusic_hub.register_session(p_display_name text, p_mode text) returns mcmusic_hub.sessions
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
declare
  new_row mcmusic_hub.sessions;
begin
  if p_mode not in ('open', 'battle') then
    raise exception 'Invalid mode.';
  end if;
  insert into mcmusic_hub.sessions (display_name, mode)
  values (p_display_name, p_mode)
  returning * into new_row;
  return new_row;
end;
$$;

create or replace function mcmusic_hub.heartbeat_session(p_session_id uuid) returns void
language plpgsql security definer
set search_path to 'mcmusic_hub', 'public'
as $$
begin
  update mcmusic_hub.sessions set last_heartbeat_at = now() where id = p_session_id;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS — tightened to match McJukebox's actual, hardened pattern: only a
-- SELECT policy exists on either table. Every write goes through one of
-- the SECURITY DEFINER functions above and nothing else — matching the
-- real reason McJukebox's queueClient.ts comment says "RLS denies direct
-- insert/update/delete." Without this, the duplicate-check and advisory
-- lock inside those functions could be bypassed entirely by writing to
-- the tables directly. Battle Mode's concealment is still enforced
-- client-side (Remote decides what to render based on mode + whether
-- added_by matches its own typed name), not at this layer — that
-- part remains a deliberately accepted trade-off (see the v2 design doc).
-- ---------------------------------------------------------------------
alter table mcmusic_hub.sessions enable row level security;
alter table mcmusic_hub.queue_items enable row level security;

create policy "Allow anon read sessions" on mcmusic_hub.sessions
  for select using (true);

create policy "Allow anon read queue_items" on mcmusic_hub.queue_items
  for select using (true);

alter publication supabase_realtime add table mcmusic_hub.sessions;
alter publication supabase_realtime add table mcmusic_hub.queue_items;

-- ---------------------------------------------------------------------
-- Reference queries — not stored anywhere, just how the derived state
-- above actually gets read in practice.
-- ---------------------------------------------------------------------

-- Active sessions, for Remote's "which gathering do you want to join" list:
-- select * from mcmusic_hub.sessions
-- where last_heartbeat_at > now() - interval '30 seconds'
-- order by created_at desc;

-- Now playing, for a given session:
-- select * from mcmusic_hub.queue_items
-- where session_id = '<session-id>' and status = 'playing'
-- limit 1;

-- Up next (queued, in order), for a given session:
-- select * from mcmusic_hub.queue_items
-- where session_id = '<session-id>' and status = 'queued'
-- order by position asc;

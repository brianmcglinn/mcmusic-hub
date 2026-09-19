import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

// McMusic Hub v2 — session-scoped adaptation of McJukebox's
// useJukeboxPlayback. Same queue-consumption shape (register once, poll +
// realtime-subscribe, advance via RPC), with session_id threaded through
// every call so multiple Google TVs can each run their own independent
// gathering without interfering with one another.

const HEARTBEAT_INTERVAL_MS = 20000;
const SAFETY_POLL_INTERVAL_MS = 15000;

// Same phantom-row defense as McJukebox's useJukeboxPlayback: a Postgres
// function that declares a row-typed variable and never SELECTs into it
// (nothing matched) can still return that variable as a real JSON object
// with every field null, rather than a genuine SQL NULL. That object is
// truthy in JS, so `data ?? null` alone won't catch it — check for a real
// id specifically.
function normalizeQueueItem(data: any): QueueItem | null {
  if (!data || !data.id) return null;
  return data as QueueItem;
}

export function useSessionQueue(displayName: string, mode: 'open' | 'battle') {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);
  // False until the very first "what's actually playing" check has
  // completed — without this the app can briefly render a stale/leftover
  // item the instant that first check resolves, before correcting a
  // moment later.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // True for the whole round-trip between a song ending and the next
  // state actually landing — advance() is async, so without this the
  // just-finished song keeps rendering, looking frozen, for as long as
  // that round-trip takes.
  const [advancing, setAdvancing] = useState(false);

  // Register this Player as a fresh session the moment it launches. Each
  // launch is a new session/gathering by design — no kiosk mode, no
  // persistent lock-in, so there's no reason to try to resume a previous
  // one.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('register_session', {
        p_display_name: displayName,
        p_mode: mode,
      });
      if (error || !data) {
        console.error('[useSessionQueue] register_session failed:', error);
        return;
      }
      setSessionId(data.id);
    })();
  }, [displayName, mode]);

  // Heartbeat — keeps this session "active" for Remote's session picker.
  // A closed/crashed Player just stops heartbeating; nothing needs to
  // explicitly mark it inactive.
  useEffect(() => {
    if (!sessionId) return;
    const heartbeat = setInterval(() => {
      supabase.rpc('heartbeat_session', { p_session_id: sessionId });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeat);
  }, [sessionId]);

  // Queue consumption — same shape as McJukebox's useJukeboxPlayback,
  // scoped to this session_id throughout.
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const { data: playing } = await supabase
        .from('queue_items')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'playing')
        .maybeSingle();

      if (playing) {
        setNowPlaying(playing);
      } else {
        const { data } = await supabase.rpc('start_if_idle', { p_session_id: sessionId });
        setNowPlaying(normalizeQueueItem(data));
      }
      setHasLoadedOnce(true);
    })();

    const channel = supabase
      .channel(`mcmusic-hub-playback-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'mcmusic_hub',
          table: 'queue_items',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if ((payload.new as QueueItem).status !== 'queued') return;
          const { data: playing } = await supabase
            .from('queue_items')
            .select('id')
            .eq('session_id', sessionId)
            .eq('status', 'playing')
            .maybeSingle();
          if (!playing) {
            const { data } = await supabase.rpc('start_if_idle', { p_session_id: sessionId });
            const normalized = normalizeQueueItem(data);
            if (normalized) setNowPlaying(normalized);
          }
        }
      )
      .subscribe();

    // Safety net — realtime can drop silently on network blips.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('queue_items')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'playing')
        .maybeSingle();
      const normalized = normalizeQueueItem(data);
      setNowPlaying((prev) => (normalized?.id !== prev?.id ? normalized : prev));
    }, SAFETY_POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [sessionId]);

  const advance = async () => {
    if (!nowPlaying || !sessionId) return;
    setAdvancing(true);
    const { data, error } = await supabase.rpc('complete_and_advance', {
      p_session_id: sessionId,
      p_finished_item_id: nowPlaying.id,
    });
    if (error) {
      console.error('[useSessionQueue] complete_and_advance RPC error:', error);
    }
    setNowPlaying(normalizeQueueItem(data));
    setAdvancing(false);
  };

  return { sessionId, nowPlaying, advance, hasLoadedOnce, advancing };
}

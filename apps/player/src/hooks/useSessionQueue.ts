import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

const HEARTBEAT_INTERVAL_MS = 20000;
const SAFETY_POLL_INTERVAL_MS = 15000;

function normalizeQueueItem(data: any): QueueItem | null {
  if (!data || !data.id) return null;
  return data as QueueItem;
}

export function useSessionQueue(displayName: string, mode: 'open' | 'battle') {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [advancing, setAdvancing] = useState(false);

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

  useEffect(() => {
    if (!sessionId) return;
    const heartbeat = setInterval(async () => {
      const { error } = await supabase.rpc('heartbeat_session', { p_session_id: sessionId });
      if (error) {
        console.error('[useSessionQueue] heartbeat_session failed:', error);
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeat);
  }, [sessionId]);

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
    console.log(`[useSessionQueue] advance() called: finishing item ${nowPlaying.id} ("${nowPlaying.title}")`);
    setAdvancing(true);
    const { data, error } = await supabase.rpc('complete_and_advance', {
      p_session_id: sessionId,
      p_finished_item_id: nowPlaying.id,
    });
    console.log('[useSessionQueue] complete_and_advance raw response:', JSON.stringify({ data, error }));
    if (error) {
      console.error('[useSessionQueue] complete_and_advance RPC error:', error);
    }
    const normalized = normalizeQueueItem(data);
    console.log('[useSessionQueue] normalizeQueueItem result:', JSON.stringify(normalized));
    setNowPlaying(normalized);
    setAdvancing(false);
  };

  return { sessionId, nowPlaying, advance, hasLoadedOnce, advancing };
}

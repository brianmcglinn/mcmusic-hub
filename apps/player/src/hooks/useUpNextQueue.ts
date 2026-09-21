import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

// Session-scoped adaptation of McJukebox's useUpNextQueue — same shape,
// with sessionId threaded through both queries and the realtime filter so
// each gathering only ever sees its own queue.
export function useUpNextQueue(sessionId: string | null, limit = 6) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [totalQueued, setTotalQueued] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const fetchQueue = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('queue_items')
          .select('*')
          .eq('session_id', sessionId)
          .eq('status', 'queued')
          .order('position', { ascending: true })
          .limit(limit),
        supabase
          .from('queue_items')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'queued'),
      ]);
      setItems(data ?? []);
      setTotalQueued(count ?? 0);
    };
    fetchQueue();

    const channel = supabase
      .channel(`up-next-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'mcmusic_hub',
          table: 'queue_items',
          filter: `session_id=eq.${sessionId}`,
        },
        fetchQueue
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, limit]);

  return { items, totalQueued };
}

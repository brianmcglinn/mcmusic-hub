import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueueItem } from '../types';

// Remote's OWN version — read-only, shows both 'playing' and 'queued'
// items for display. Not to be confused with Player's useSessionQueue,
// which consumes/advances the queue; this one only ever watches it.
export function useSessionQueue(sessionId: string | null) {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const fetchQueue = async () => {
      const { data } = await supabase
        .from('queue_items')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['playing', 'queued'])
        .order('position', { ascending: true });
      setItems(data ?? []);
    };
    fetchQueue();

    const channel = supabase
      .channel(`remote-queue-${sessionId}`)
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
  }, [sessionId]);

  return items;
}

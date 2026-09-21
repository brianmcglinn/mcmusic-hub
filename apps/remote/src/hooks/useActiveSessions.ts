import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';

const ACTIVE_WINDOW_MS = 60000;
const POLL_INTERVAL_MS = 5000;

export function useActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .gte('last_heartbeat_at', cutoff)
      .order('created_at', { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();

    const poll = setInterval(fetchSessions, POLL_INTERVAL_MS);
    const channel = supabase
      .channel('active-sessions')
      .on('postgres_changes', { event: '*', schema: 'mcmusic_hub', table: 'sessions' }, fetchSessions)
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  return { sessions, loading, rescan: fetchSessions };
}

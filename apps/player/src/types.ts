// Matches docs/schema.sql exactly — these are the real column/enum names,
// not guessed.

export type ItemSource = 'plex' | 'youtube' | 'spotify';
export type ItemStatus = 'queued' | 'playing' | 'played';

export interface QueueItem {
  id: string;
  session_id: string;
  status: ItemStatus;
  source: ItemSource;
  source_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
  added_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Session {
  id: string;
  display_name: string;
  mode: 'open' | 'battle';
  created_at: string;
  last_heartbeat_at: string;
}

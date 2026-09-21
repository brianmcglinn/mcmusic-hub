// Matches docs/schema.sql exactly for the shared shapes. SearchResult is
// reconstructed from real usage in McJukebox's queueClient.ts
// (addToQueue(item: SearchResult, ...) reads item.source, item.sourceId,
// item.title, item.artist, item.thumbnailUrl, item.durationSeconds) —
// not guessed, but McJukebox Remote's own types.ts was never inspected
// directly, so treat this as a solid starting point to confirm/adjust.

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

export interface SearchResult {
  source: ItemSource;
  sourceId: string;
  title: string;
  artist?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

// Browse types — real shapes, from McJukebox's actual types.ts (Plex) and
// its recovered real edge function (Spotify), not guessed.

export interface PlexArtist {
  ratingKey: string;
  name: string;
  thumbnailUrl: string | null;
}

export interface PlexAlbum {
  ratingKey: string;
  title: string;
  year: number | null;
  thumbnailUrl: string | null;
  // Only present when returned from listPlexAlbumsForGenre — genre
  // browsing skips a separate artist-selection step, so the artist name
  // rides along with the album instead.
  artistName?: string | null;
}

export interface PlexFilterValue {
  key: string;
  fastKey: string | null;
  title: string;
}

export interface PlexPlaylist {
  ratingKey: string;
  title: string;
  trackCount: number;
  thumbnailUrl: string | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

export interface SpotifyAlbum {
  id: string;
  title: string;
  year: number | null;
  thumbnailUrl: string | null;
}

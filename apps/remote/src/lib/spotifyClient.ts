import type { SearchResult, SpotifyArtist, SpotifyAlbum } from '../types';

const FUNCTION_NAME = 'mcmusic-hub-spotify-search';

// supabase.functions.invoke() always POSTs — but McJukebox's real,
// recovered function (the one actually proven to work, pagination logic
// included) expects a plain GET with query-string params. Rather than
// adapt proven-correct logic to a different calling shape, this calls it
// via a raw fetch matching that exact real convention instead.
async function callFunction(params: Record<string, string>): Promise<any> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}?${qs}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) {
    throw new Error(`${FUNCTION_NAME} returned ${res.status}`);
  }
  return res.json();
}

export async function searchSpotifyTracks(query: string): Promise<SearchResult[]> {
  const json = await callFunction({ type: 'track', q: query });
  return json.results ?? [];
}

export async function searchSpotifyArtists(query: string): Promise<SpotifyArtist[]> {
  const json = await callFunction({ type: 'artist', q: query });
  return json.artists ?? [];
}

export async function listSpotifyAlbumsForArtist(
  artistId: string,
  offset = 0,
  knownTotal?: number
): Promise<{ albums: SpotifyAlbum[]; total: number }> {
  const params: Record<string, string> = { type: 'artist-albums', artistId, offset: String(offset) };
  if (knownTotal != null) params.knownTotal = String(knownTotal);
  const json = await callFunction(params);
  return { albums: json.albums ?? [], total: json.total ?? 0 };
}

export async function listSpotifyTracksForAlbum(albumId: string, albumArt: string | null): Promise<SearchResult[]> {
  const params: Record<string, string> = { type: 'album-tracks', albumId };
  if (albumArt) params.albumArt = albumArt;
  const json = await callFunction(params);
  return json.results ?? [];
}

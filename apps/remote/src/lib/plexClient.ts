import type { SearchResult, PlexArtist, PlexAlbum, PlexFilterValue, PlexPlaylist } from '../types';

// Remote's full Plex client — search plus the complete real browse
// implementation, ported directly from McJukebox's actual plexClient.ts
// (already fully read, not reconstructed). getPlexStreamUrl is
// deliberately left out — that's Player-only, for actual playback.

const PLEX_SERVER = process.env.EXPO_PUBLIC_PLEX_SERVER_URL!.replace(/\/+$/, '');
const PLEX_TOKEN = process.env.EXPO_PUBLIC_PLEX_TOKEN!;

async function plexFetch(path: string): Promise<any> {
  const url = `${PLEX_SERVER}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'X-Plex-Token': PLEX_TOKEN, Accept: 'application/json' },
    });
  } catch (err) {
    console.error(`[Plex] Request failed: ${url}`, err);
    throw new Error(`Could not reach Plex at ${PLEX_SERVER}. Check the server is running and reachable.`);
  }
  if (!res.ok) {
    console.error(`[Plex] ${res.status} ${res.statusText} for ${url}`);
    throw new Error(`Plex returned ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json();
}

function thumbUrl(thumb: string | null | undefined): string | null {
  return thumb ? `${PLEX_SERVER}${thumb}?X-Plex-Token=${PLEX_TOKEN}` : null;
}

function toSearchResult(t: any): SearchResult {
  return {
    source: 'plex' as const,
    sourceId: t.ratingKey,
    title: t.title,
    artist: t.grandparentTitle ?? null,
    thumbnailUrl: thumbUrl(t.thumb),
    durationSeconds: t.duration ? Math.round(t.duration / 1000) : null,
  };
}

// Combined song + artist search in one call — /hubs/search returns
// multiple hub types in a single response, so both are extracted from
// the same request rather than two separate ones.
export async function searchPlexAll(query: string): Promise<{ tracks: SearchResult[]; artists: PlexArtist[] }> {
  const json = await plexFetch(`/hubs/search?query=${encodeURIComponent(query)}&limit=15`);
  const hubs = json.MediaContainer.Hub ?? [];
  const trackHub = hubs.find((h: any) => h.type === 'track');
  const artistHub = hubs.find((h: any) => h.type === 'artist');

  const tracks = (trackHub?.Metadata ?? []).map(toSearchResult);
  const artists = (artistHub?.Metadata ?? []).map((a: any) => ({
    ratingKey: a.ratingKey,
    name: a.title,
    thumbnailUrl: thumbUrl(a.thumb),
  }));

  return { tracks, artists };
}

let cachedMusicSectionId: string | null = null;

async function getMusicSectionId(): Promise<string> {
  if (cachedMusicSectionId) return cachedMusicSectionId;
  const json = await plexFetch('/library/sections');
  const musicSection = (json.MediaContainer.Directory ?? []).find((d: any) => d.type === 'artist');
  if (!musicSection) throw new Error('No music library section found on this Plex server.');
  cachedMusicSectionId = musicSection.key;
  return cachedMusicSectionId!;
}

export async function listPlexArtists(): Promise<PlexArtist[]> {
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(`/library/sections/${sectionId}/all?type=8&sort=titleSort`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((a: any) => ({
    ratingKey: a.ratingKey,
    name: a.title,
    thumbnailUrl: thumbUrl(a.thumb),
  }));
}

export async function listPlexAlbumsForArtist(artistRatingKey: string): Promise<PlexAlbum[]> {
  const json = await plexFetch(`/library/metadata/${artistRatingKey}/children?sort=year:desc`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((al: any) => ({
    ratingKey: al.ratingKey,
    title: al.title,
    year: al.year ?? null,
    thumbnailUrl: thumbUrl(al.thumb),
  }));
}

export async function listPlexTracksForAlbum(albumRatingKey: string): Promise<SearchResult[]> {
  const json = await plexFetch(`/library/metadata/${albumRatingKey}/children`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map(toSearchResult);
}

export async function listPlexGenres(): Promise<PlexFilterValue[]> {
  // Scoped to type=9 (albums) — matches the "by Album Artist" genre view
  // in the Plex client itself, rather than Plex's much larger/noisier
  // default set of track-level genre tags.
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(`/library/sections/${sectionId}/genre?type=9`);
  const items = json.MediaContainer.Directory ?? [];
  return items.map((d: any) => ({
    key: d.key,
    fastKey: d.fastKey ?? null,
    title: d.title,
  }));
}

export async function listPlexAlbumsForGenre(genreValue: PlexFilterValue): Promise<PlexAlbum[]> {
  // Deliberately not using genreValue.fastKey — proven unreliable
  // (returned track/artist-scoped results unexpectedly). Always construct
  // the query explicitly so the type=9 (album) scope is guaranteed.
  const sectionId = await getMusicSectionId();
  const json = await plexFetch(
    `/library/sections/${sectionId}/all?genre=${encodeURIComponent(genreValue.key)}&type=9`
  );
  const items = json.MediaContainer.Metadata ?? [];
  return items.map((al: any) => ({
    ratingKey: al.ratingKey,
    title: al.title,
    year: al.year ?? null,
    thumbnailUrl: thumbUrl(al.thumb),
    artistName: al.parentTitle ?? null,
  }));
}

// Plex auto-generates several system/smart playlists that aren't things a
// guest would ever want to add songs from — filtered by name, since
// there's no reliable API flag distinguishing all of them.
const EXCLUDED_PLAYLIST_TITLES = new Set([
  'liked songs',
  'fresh liked songs',
  'all music',
  'recently added',
  'recently played',
]);

export async function listPlexPlaylists(): Promise<PlexPlaylist[]> {
  const json = await plexFetch('/playlists?playlistType=audio');
  const items = json.MediaContainer.Metadata ?? [];
  return items
    .filter((p: any) => !EXCLUDED_PLAYLIST_TITLES.has((p.title ?? '').trim().toLowerCase()))
    .map((p: any) => ({
      ratingKey: p.ratingKey,
      title: p.title,
      trackCount: p.leafCount ?? 0,
      thumbnailUrl: thumbUrl(p.thumb ?? p.composite),
    }));
}

export async function listPlexTracksForPlaylist(playlistRatingKey: string): Promise<SearchResult[]> {
  const json = await plexFetch(`/playlists/${playlistRatingKey}/items`);
  const items = json.MediaContainer.Metadata ?? [];
  return items.map(toSearchResult);
}

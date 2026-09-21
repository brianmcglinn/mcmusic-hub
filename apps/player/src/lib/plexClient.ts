// Player-only subset of McJukebox's plexClient.ts. Every search/browse
// function (searchPlexMusic, listPlexArtists, listPlexAlbumsForArtist,
// etc.) is deliberately left out — Player never searches or browses
// anything; Remote owns all of that. Only what's needed to actually
// start playback of a song Remote already added is kept.

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

// Resolved fresh right before playback, not stored in the queue row.
export async function getPlexStreamUrl(ratingKey: string): Promise<string> {
  const json = await plexFetch(`/library/metadata/${ratingKey}`);
  const part = json?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0];
  if (!part?.key) {
    throw new Error(`Plex returned no playable media for ratingKey ${ratingKey}`);
  }
  return `${PLEX_SERVER}${part.key}?X-Plex-Token=${PLEX_TOKEN}`;
}

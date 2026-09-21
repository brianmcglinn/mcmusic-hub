// Supabase Edge Function (Deno) — Spotify search + browse via Client
// Credentials. This is McJukebox's real, proven implementation (recovered
// directly from that project's own history after an earlier accidental
// overwrite) — not a reconstruction. Upgraded from this function's
// original track-only version to match it exactly, since Remote now
// needs the same Song/Artist search + Artist -> Album -> Song drill-down
// McJukebox's own Remote already has.
//
// Named distinctly from McJukebox's own "spotify-search" function on
// purpose — the two must never share a folder name again, after the
// earlier mistake that overwrote McJukebox's real one.
//
// Reuses the SAME Deno.env SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET
// values already wired into the functions container for McJukebox —
// Client Credentials search has no concept of package name or SHA-1
// fingerprint the way the native App Remote module does, so there's no
// real reason to register a second Spotify app just for this.
//
// Accepts, via ?type=:
//   track          (default) q=<query>                       -> { results: SearchResult[] }
//   artist         q=<query>                                 -> { artists: SpotifyArtist[] }
//   artist-albums  artistId=<id>&offset=<n>&knownTotal=<n>    -> { albums: SpotifyAlbum[], total: number }
//   album-tracks   albumId=<id>&albumArt=<url>                -> { results: SearchResult[] }

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Client Credentials flow: app identity only, no user ever involved,
      // so this never touches Spotify's Development Mode user allowlist.
      Authorization: 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  cachedToken = {
    token: json.access_token,
    // Refresh 60s before actual expiry to avoid a request landing exactly
    // on the boundary.
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function spotifyGet(path: string): Promise<any> {
  const token = await getAppToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // Spotify's 429 responses normally include a Retry-After header (in
    // seconds) with the authoritative wait time — surfaced explicitly here
    // since community reports show this value varying wildly (minutes to
    // over 13 hours) rather than following one fixed, predictable window.
    const retryAfter = res.headers.get('Retry-After');
    const retryInfo = retryAfter ? ` (Retry-After: ${retryAfter}s = ${(parseInt(retryAfter, 10) / 3600).toFixed(1)}h)` : ' (no Retry-After header present)';
    throw new Error(`Spotify request failed: ${res.status}${retryInfo} ${await res.text()}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? 'track';
    const jsonHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

    if (type === 'artist-albums') {
      const artistId = url.searchParams.get('artistId')?.trim() ?? '';
      const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
      const knownTotalParam = url.searchParams.get('knownTotal');
      const PAGE_SIZE = 10; // Spotify's own documented maximum for this endpoint

      if (!artistId) {
        return new Response(JSON.stringify({ albums: [], total: 0 }), { headers: jsonHeaders });
      }

      // Spotify's own order is newest-first with no sort parameter offered
      // at all, and — unlike a plain search — every response here (even a
      // one-item request) includes the artist's full album `total`. That
      // lets us compute exactly which slice of Spotify's own ordering
      // corresponds to "the Nth page counting from the oldest end",
      // without ever pre-fetching the whole discography. The very first
      // page for a given artist costs one small extra call just to learn
      // that total; every subsequent "Load More" tap sends it back, so it
      // costs exactly one Spotify call per page from then on.
      let total: number;
      if (knownTotalParam != null) {
        total = parseInt(knownTotalParam, 10) || 0;
      } else {
        const peek = await spotifyGet(
          `/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&limit=1&offset=0`
        );
        total = peek.total ?? 0;
      }

      if (total === 0) {
        return new Response(JSON.stringify({ albums: [], total: 0 }), { headers: jsonHeaders });
      }

      // Walking backward from the oldest end as the client's own offset
      // increases — e.g. for a 23-album artist, client offset 0 asks
      // Spotify for its own offset 13/limit 10 (its last 10 = our oldest
      // 10), offset 10 asks for its offset 3/limit 10, offset 20 asks for
      // its offset 0/limit 3 (whatever's left, the newest few).
      const spotifyOffset = Math.max(0, total - offset - PAGE_SIZE);
      const spotifyLimit = Math.min(PAGE_SIZE, Math.max(0, total - offset));

      if (spotifyLimit === 0) {
        return new Response(JSON.stringify({ albums: [], total }), { headers: jsonHeaders });
      }

      const json = await spotifyGet(
        `/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&limit=${spotifyLimit}&offset=${spotifyOffset}`
      );

      // Within this one slice, Spotify still orders newest-first — reverse
      // it so the oldest item in this batch comes first, matching the
      // overall oldest-to-newest flow across pages.
      const albums = (json.items ?? []).reverse().map((al: any) => ({
        id: al.id,
        title: al.name,
        year: al.release_date ? parseInt(al.release_date.slice(0, 4), 10) : null,
        thumbnailUrl: al.images?.[0]?.url ?? null,
      }));

      return new Response(JSON.stringify({ albums, total }), { headers: jsonHeaders });
    }

    if (type === 'album-tracks') {
      const albumId = url.searchParams.get('albumId')?.trim() ?? '';
      const albumArt = url.searchParams.get('albumArt') ?? null;
      if (!albumId) {
        return new Response(JSON.stringify({ results: [] }), { headers: jsonHeaders });
      }
      // 50 is this endpoint's own documented maximum (a separate, higher
      // cap than artist-albums' max of 10) — covers all but the longest
      // deluxe/compilation albums in a single request.
      const json = await spotifyGet(`/albums/${encodeURIComponent(albumId)}/tracks?limit=50`);

      // Album track objects don't carry their own album artwork (you're
      // already scoped to one album) — passed through from the client,
      // which already has it from the artist-albums step, rather than
      // making a second round-trip to fetch the album again here.
      const results = (json.items ?? []).map((t: any) => ({
        source: 'spotify',
        sourceId: t.uri,
        title: t.name,
        artist: (t.artists ?? []).map((a: any) => a.name).join(', ') || null,
        thumbnailUrl: albumArt,
        durationSeconds: t.duration_ms ? Math.round(t.duration_ms / 1000) : null,
      }));
      return new Response(JSON.stringify({ results }), { headers: jsonHeaders });
    }

    // type === 'track' | 'artist' — text search.
    const query = url.searchParams.get('q')?.trim() ?? '';
    const searchType = type === 'artist' ? 'artist' : 'track';
    const emptyShape = searchType === 'artist' ? { artists: [] } : { results: [] };

    if (query.length < 2) {
      return new Response(JSON.stringify(emptyShape), { headers: jsonHeaders });
    }

    const json = await spotifyGet(`/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=10`);

    if (searchType === 'artist') {
      const artists = (json.artists?.items ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        thumbnailUrl: a.images?.[0]?.url ?? null,
      }));
      return new Response(JSON.stringify({ artists }), { headers: jsonHeaders });
    }

    const results = (json.tracks?.items ?? []).map((t: any) => ({
      source: 'spotify',
      sourceId: t.uri,
      title: t.name,
      artist: (t.artists ?? []).map((a: any) => a.name).join(', ') || null,
      thumbnailUrl: t.album?.images?.[0]?.url ?? null,
      durationSeconds: t.duration_ms ? Math.round(t.duration_ms / 1000) : null,
    }));

    return new Response(JSON.stringify({ results }), { headers: jsonHeaders });
  } catch (err) {
    console.error('[mcmusic-hub-spotify-search]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

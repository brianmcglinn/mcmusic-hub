// Player-only subset of McJukebox's spotifyClient.ts. All the search
// functions (searchSpotifyTracks, getSpotifyAlbumsForArtist, etc.) are
// left out — they call a Supabase Edge Function that's a Remote-side
// concern, not Player's. Only the two constants SpotifyNowPlaying
// actually needs are kept.
//
// SPOTIFY_CLIENT_ID lives in .env, not hardcoded here — this is a
// machine/account-specific value, exactly like the Supabase URL or Plex
// token, and .env is the one place already consistently protected from
// being overwritten by any file sync. A hardcoded placeholder here got
// silently reverted by an unrelated file sync at least once already.
//
// SPOTIFY_REDIRECT_URI stays hardcoded — it's just this app's own
// registered custom scheme (see app.json's "scheme"), not a secret or
// something that varies per environment.

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
export const SPOTIFY_REDIRECT_URI = 'mcmusichubplayer://spotify-auth';

# spotify-remote

Local Expo module wrapping Spotify's official Android App Remote SDK
directly — no third-party wrapper library involved. Ported from
McJukebox Player's own working version; the Kotlin wrapper, the JS-facing
API, and the SDK `.aar` itself are all unchanged.

## What this module does NOT need

- No config plugin entry in `app.json` — Expo's autolinking finds local
  modules under `modules/` automatically.
- No browser, no OAuth redirect handling, no Expo Router route.
  Authorization happens natively, inside the Spotify app itself, the
  first time `connect()` is called.

## Still required before this actually works: your own Spotify app registration

The `.aar` and code are shared; the Developer Dashboard registration is
not. McJukebox's registration (`com.mcglinn.jukeboxplayer`,
`jukeboxplayer://spotify-auth`) is tied to *that* app's identity and
won't authorize this one. Before Spotify playback will work here:

1. Register a new app at https://developer.spotify.com/dashboard
2. Set the redirect URI to match `SPOTIFY_REDIRECT_URI` in
   `src/lib/spotifyClient.ts` (currently `mcmusichubplayer://spotify-auth`)
3. Replace `SPOTIFY_CLIENT_ID` in that same file with the new app's
   Client ID
4. Under the app's Android platform settings, add this build's package
   name (`com.mcglinn.mcmusichubplayer`, from `app.json`) paired with
   its signing certificate's SHA-1 fingerprint (`apksigner verify
   --print-certs` on the built APK) — the exact process already worked
   through for McJukebox Player.

## The `.aar` itself

McJukebox deliberately excludes this file from git — it's a binary tied
to a specific SDK release, and every machine building that project gets
its own copy. This repo makes a different, deliberate choice: since the
exact file was already available, it's included directly at
`android/libs/spotify-app-remote-release-0.8.0.aar` rather than adding a
manual download step that would just reproduce the same bytes. Worth
reconsidering only if a future SDK version upgrade is wanted.

## Known incomplete piece (carried over from McJukebox)

`getPlayerState()` / `onPlayerStateChanged` return `imageUri` as
Spotify's raw internal image identifier, not a directly-loadable URL.
Resolving real album artwork requires an additional call through the
SDK's `ImagesApi` — not yet wired up.

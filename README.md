# McMusic Hub (v2)

Home hub letting guests queue songs from their own phones (Plex, YouTube,
Spotify) to a shared Google TV, played through each service's own native
SDK — no audio capture, no AirPlay relay. See `docs/design-doc.md` for the
full architecture and reasoning.

## Structure

- `apps/player/` — native Android app for a Google TV. Registers a
  session on launch, consumes that session's queue, plays via each
  source's own SDK (Spotify App Remote, a track-player library for Plex,
  a webview for YouTube). No search/browse/add-song UI at all — that's
  Remote's job entirely.
- `apps/remote/` — mobile app guests use to search and add songs. Picks
  which active session ("gathering") to join, then hands songs off to
  whichever Player is running that session. Also renders the queue
  itself, with Battle Mode's conceal/reveal logic.
- `supabase/functions/spotify-search/` — the one server-side piece.
  Spotify search needs Client Credentials, which needs a secret that can
  never live in a mobile app bundle — Plex and YouTube search call their
  APIs directly from Remote and need no function of their own.
- `docs/schema.sql` — the Supabase schema both apps talk to.
- `docs/design-doc.md` — full v2 design doc.

## Getting started

```bash
# Each app
cd apps/player   # or apps/remote
npm install
cp .env.example .env
# fill in .env — see each file for exactly which vars it needs
npx expo start --dev-client   # player needs a dev client (custom native module)
npx expo start                # remote can usually run in plain Expo Go

# The edge function (once, from the repo root)
supabase functions deploy spotify-search
supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...
```

## Status

Player: session registration, queue consumption, and all three source
players are wired and complete on the JS/TS side. The native
`spotify-remote` module is fully ported (Kotlin wrapper + the real SDK
`.aar`) — the one remaining step is registering McMusic Hub Player's own
Spotify Developer Dashboard app (see
`apps/player/modules/spotify-remote/README.md`), since McJukebox's
registration is tied to its own package identity and won't authorize
this app.

Remote: name entry, session picker, search (all three sources) and the
mode-aware queue view are all built. The Spotify search edge function is
a from-scratch reconstruction of Spotify's standard Client Credentials +
Search flow, not a verified port of McJukebox's actual deployed
function (that source wasn't available) — worth testing directly once
deployed.

Neither app has any real visual design applied yet — both are
functional-first passes, plain default styling, no neon theming. See
`docs/design-doc.md` for what's confirmed vs. still open at the
architecture level.

## A note on the two package.json files

Player's dependency list is grounded in McJukebox Player's real,
already-working package.json, with the admin-reorder library and what
looked like an abandoned OAuth-based Spotify auth attempt (superseded by
the native App Remote module) left out. Remote's is a reasonable
estimate — lighter, no native playback modules — since McJukebox Remote's
actual package.json was never inspected.

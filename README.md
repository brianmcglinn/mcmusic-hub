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
  whichever Player is running that session.
- `docs/schema.sql` — the Supabase schema both apps talk to.
- `docs/design-doc.md` — full v2 design doc.

## Getting started (each app)

```bash
cd apps/player   # or apps/remote
npm install
cp .env.example .env
# fill in .env with your Supabase URL + anon key
npx expo start --dev-client   # player needs a dev client (custom native module)
npx expo start                # remote can usually run in plain Expo Go
```

## Status

Fresh v2 scaffold. Player has a working session-registration +
queue-consumption hook (`useSessionQueue`) and a simplified root screen.
Everything else — per-source now-playing rendering, the ported Spotify
native module, Remote's search/session-picker UI — is still to be built.
See `docs/design-doc.md` for what's confirmed vs. still open.

## A note on the two package.json files

Player's dependency list is grounded in McJukebox Player's real,
already-working package.json, with the admin-reorder library and what
looked like an abandoned OAuth-based Spotify auth attempt (superseded by
the native App Remote module) left out. Remote's is a reasonable
estimate — lighter, no native playback modules — since McJukebox Remote's
actual package.json was never inspected. Treat Remote's as a starting
point to adjust once real screens are being built against it.

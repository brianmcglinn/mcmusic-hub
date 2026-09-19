# McMusic Hub — Redesign (v2): Native Android Player Architecture

## 1. Status and why this redesign exists

The original McMusic Hub (documented separately in `mcmusic_hub_design_doc.md`) used an AirPlay-capture relay: guests' phones AirPlayed to shairport-sync on a home server, which piped audio through ffmpeg into Icecast, which a target watcher pointed a chosen Chromecast at. It was eventually made to work end-to-end, but the path there was extremely fragile — AirPlay's single-session limit, a hidden Control Center volume setting, a decoder bug that took hours to isolate, zeroconf lifecycle bugs, firewall gaps specific to AirPlay 2's ephemeral port range, and more. That document is kept as-is for historical reference and for anyone who ever needs the debugging lessons in it, but it no longer reflects the direction of the project.

This redesign is a deliberate pivot, inspired by a separate, already-working project: **McGlinn Jukebox (McJukebox)**, a two-app Remote + Player system that plays Plex, YouTube, and Spotify by having the Player app authenticate and play natively through each service's own SDK, rather than capturing audio from anywhere. That sidesteps essentially every problem the original McMusic Hub ran into, because there's no audio capture step at all.

## 2. Architecture overview

```
Guest's phone (McMusic Hub Remote app)
   │  search Plex / Spotify / YouTube, add to queue
   ▼
Supabase (queue, scoped per active gathering/session)
   │  realtime
   ▼
McMusic Hub Player (native Android app, sideloaded on a Google TV)
   │  plays via each service's own native SDK, logged in on that device
   ▼
Google TV's own wired audio/video output → TV / sound system
```

No shairport-sync, no NQPTP, no Icecast, no ffmpeg re-streaming, no AirPlay anywhere in this design. The Player's own audio output is the entire "cast" mechanism — there is no separate relay step.

## 3. Components

### McMusic Hub Player
- A native Android app, reusing the large majority of McJukebox Player's existing code — specifically its native SDK integrations (Spotify App Remote SDK, YouTube, Plex).
- Installed (sideloaded, or via Play Store) on any of Brian's Google TV / Android TV OS devices — **not** compatible with non-Android-TV Cast devices (WiiM Pros, plain Chromecast Ultras, Google speakers), since those can't host an installed app at all.
- Omits McJukebox Player's own add-song / search / browse screens entirely — those responsibilities move to the Remote app. The Player is purely a receiver, queue display, and playback engine.
- Audio/video output is whatever the Google TV's own wired connection already does — same reliable path McJukebox already runs on.
- **Spotify (and Plex) need their own separate install-and-login on each physical Google TV** the Player might run on — App Remote SDK authenticates against the real Spotify app already logged in on that same device. This isn't a one-time central setup; it's per-device.

### McMusic Hub Remote
- A mobile app, functionally identical in design to McJukebox Remote, with its own styling/branding.
- Handles all search, browse, and add-to-queue — the Player has none of this itself.
- Shows the live queue (subject to mode — see below).

### Backend
- Self-hosted Supabase, same pattern as McJukebox and the original McMusic Hub.
- Queue rows now hold real song data (title, artist, artwork, source, added-by) rather than the original design's name-only, AirPlay-session-timing-inferred turn order.

## 4. Session / gathering model

Because there's more than one genuine Google TV in the house, more than one could plausibly have the Player open at once — which would otherwise mean two rooms silently fighting over the same global queue. Sessions solve this:

- Each Player instance, on opening, registers itself as an active session (a row with an ID, a display name, and a periodic heartbeat so a closed/idle Player's session doesn't linger forever).
- The song queue is scoped to a session, not global.
- The Remote app asks which active session ("room") to join before it lets someone search or queue anything — conceptually similar to the original McMusic Hub's device picker, except picking a room instead of a raw Chromecast target.
- This isn't expected to be a common case day-to-day, but it's cheap to build in from the start and expensive to retrofit later.

## 5. Operating modes: Open vs Battle

Mode is chosen **per session** (per gathering), not as a fixed system-wide setting — a family BBQ and a competitive friends' hangout can run differently without needing two different systems.

### Open Mode
Identical in spirit to McJukebox today: anyone in the session can add unlimited songs, and everyone sees the full queue — title, artist, artwork, who added it — for every entry.

### Battle Mode
For competitive play, where players are trying to "one-up" whoever played before them, and don't want opponents scouting the queue in advance.

- **Player (the shared TV) never reveals a song's details before it's actually playing**, for anyone — it's the one public display everyone's watching together, so there's no "whose turn is it to see this" question. Concealed entries show only "Added by Player X"; full details replace that the moment the entry becomes Now Playing.
- **Remote (each guest's own phone) shows the adder their own entries in full**, while every other entry still only shows "Added by Player X." This is scoped by comparing each row's `added_by` against the name that phone's Remote app is currently using — the same lightweight, typed-display-name identity used everywhere else in this whole family of apps, not a real authentication system.
- No scoring or voting mechanic — purely conceal/reveal. Any judging of whose song "won" happens socially, outside the app.
- **Worth being explicit about a real limitation:** this concealment is enforced at the display layer, not the database layer. Since there's no strong per-player authentication, someone technically curious could still see "hidden" data by inspecting network requests directly. True enforcement would need database-level row security scoped to a real per-player identity — a meaningfully bigger lift than the display logic itself, and not in scope unless it turns out to actually matter in practice.

## 6. Known constraints and trade-offs

- **Device flexibility is narrower than the original design's "any Cast-capable device."** Only true Google TV / Android TV OS hardware can host the Player. Several of Brian's devices qualify; his WiiM Pros, plain Chromecast Ultras, and Google speakers do not.
- **Manual launch is accepted, not a gap to close.** Google Cast's picker automatically launches a receiver app the instant it's selected; a sideloaded native app doesn't get that for free. Someone needs to physically open the Player app on the target Google TV before a gathering starts — a one-time, per-gathering action. Google's Cast Connect technology could close this gap, but was investigated and deliberately set aside (see Section 7): it requires the sender to use Google's official Cast Sender SDK rather than the simpler backend-driven model this design already uses successfully, and it only buys skipping one short walk to the TV — not worth the added engineering surface (a real Android `MediaSession` in Player, a full Sender-SDK rebuild of Remote, per-device Cast console registration).
- **Shared-account model, not bring-your-own-app.** Guests never open their own Spotify or Apple Music and hit AirPlay/Cast — they exclusively use the Remote app, and playback runs on whichever account is logged into that Player device. Nobody needs their own subscription; the trade-off is that it's the household's account playing, not each guest's personal one.

## 7. Open questions, not yet verified

- **YouTube playback mechanism**: expected to carry over from McJukebox's existing Player without changes (same Android family), but hasn't been separately confirmed the way Spotify's App Remote SDK approach has.
- **Session heartbeat/expiry specifics**: the mechanism is sound in concept; exact timing/cleanup rules aren't designed yet.

## 7a. Phase 0 results (resolved questions)

- **McJukebox Player confirmed working on a real Google TV**, including live Spotify playback. One real, non-obvious requirement surfaced in testing: the Google TV's default Play Store Spotify install is the TV-optimized "Spotify for Android TV" app (`com.spotify.tv.android`), which App Remote SDK cannot connect to — it responds to Android TV's own Cast-receiver launch model instead of the plain foreground-app binding App Remote expects. The standard mobile Spotify APK must be sideloaded and logged in on every Google TV that runs Player. Worth writing into the setup checklist for any new device.
- **Cast Connect investigated and deliberately shelved.** It would only save a single physical walk to the TV per gathering, at the cost of a real Android `MediaSession` implementation in Player and rebuilding Remote around Google's official Cast Sender SDK instead of the simpler backend-driven model already proven working. Not worth it — manual launch is an accepted trade-off, not a problem to keep solving.

## 8. What's being retired from v1

Removed entirely, not adapted: shairport-sync, NQPTP, Icecast, the ffmpeg re-stream service, the AirPlay-session-timing turn-inference logic, and the `queue_advance.py` shairport-sync-hook mechanism. None of this carries forward — the entire audio-capture layer is gone, replaced by the Player's own native SDK playback.

Worth keeping conceptually, even though the code won't carry over as-is: the Supabase schema patterns (a session/config table, a members/queue table, realtime-driven display), and the visual language of the original Cast receiver (the neon aesthetic, the live "Now Playing" panel) — good reference points for the new Player's own UI.

## 9. Relationship to McJukebox

This is best understood as McMusic Hub adopting McJukebox's proven playback architecture wholesale, while keeping McMusic Hub's own identity, branding, and the additional session/mode features McJukebox doesn't have. It is not a merger of the two projects — McJukebox continues to exist and run as its own system.

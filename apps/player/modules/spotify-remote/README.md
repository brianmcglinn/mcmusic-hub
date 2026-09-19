# spotify-remote (placeholder)

McJukebox Player has a real, working version of this module — a thin
Expo native module wrapping Spotify's official App Remote SDK `.aar`
directly (`SpotifyRemoteModule.kt`), authorizing natively through the
Spotify app already installed and logged in on the device.

Not ported yet. When it is:
- Copy the `.aar`, the Kotlin wrapper, and `index.ts` across
- Register a **new, separate** Spotify Developer Dashboard app for
  McMusic Hub Player specifically — its own Client ID, redirect URI, and
  package name + SHA-1 fingerprint pairing. McJukebox's registration
  (`com.mcglinn.jukeboxplayer`, `jukeboxplayer://spotify-auth`) is tied to
  that app's identity and won't work for this one.

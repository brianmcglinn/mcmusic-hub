import { View, Text } from 'react-native';

// Placeholder — real screens still to be built:
//   1. Session picker: list active sessions (query in docs/schema.sql —
//      "Active sessions" reference query), let the guest pick one.
//   2. Search + queue: reuse McJukebox's source-client pattern (search
//      hits a Supabase Edge Function, never Spotify/YouTube/Plex
//      directly), call add_to_queue_item with the chosen session_id.
//   3. Queue view: show the session's queue_items, with Battle Mode's
//      conceal/reveal logic (full details for the caller's own added_by,
//      "Added by X" for everyone else's).

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>McMusic Hub Remote — scaffold placeholder</Text>
    </View>
  );
}

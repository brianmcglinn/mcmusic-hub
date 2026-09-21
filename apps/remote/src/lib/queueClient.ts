import { supabase } from './supabase';
import type { SearchResult } from '../types';

export async function addToQueue(sessionId: string, item: SearchResult, addedBy: string) {
  const { data, error } = await supabase.rpc('add_to_queue_item', {
    p_session_id: sessionId,
    p_source: item.source,
    p_source_id: item.sourceId,
    p_title: item.title,
    p_artist: item.artist ?? null,
    p_thumbnail_url: item.thumbnailUrl ?? null,
    p_duration_seconds: item.durationSeconds ?? null,
    p_added_by: addedBy,
  });
  if (error) throw error;
  return data;
}

export async function removeOwnQueueItem(itemId: string, addedBy: string) {
  const { error } = await supabase.rpc('remove_own_queue_item', {
    p_item_id: itemId,
    p_added_by: addedBy,
  });
  if (error) throw error;
}

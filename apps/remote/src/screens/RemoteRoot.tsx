import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NameEntryScreen } from './NameEntryScreen';
import { SessionPickerScreen } from './SessionPickerScreen';
import { SearchScreen } from './SearchScreen';
import { QueueScreen } from './QueueScreen';
import { LogoWithWordmark } from '../components/Logo';
import { colors, fonts } from '../lib/colors';
import type { Session } from '../types';

export function RemoteRoot() {
  const [myName, setMyName] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<'search' | 'queue'>('search');
  const insets = useSafeAreaInsets();

  if (!myName) {
    return <NameEntryScreen onSubmit={setMyName} />;
  }

  if (!session) {
    return <SessionPickerScreen onSelect={setSession} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.brandRow, { paddingTop: insets.top + 16 }]}>
        <LogoWithWordmark markSize={26} textSize={16} />
      </View>
      <View style={styles.tabBar}>
        <Pressable style={[styles.tabBtn, tab === 'search' && styles.tabBtnActive]} onPress={() => setTab('search')}>
          <Text style={[styles.tabBtnText, tab === 'search' && styles.tabBtnTextActive]}>Search</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'queue' && styles.tabBtnActive]} onPress={() => setTab('queue')}>
          <Text style={[styles.tabBtnText, tab === 'queue' && styles.tabBtnTextActive]}>Queue</Text>
        </Pressable>
      </View>
      {tab === 'search' ? (
        <SearchScreen sessionId={session.id} addedBy={myName} />
      ) : (
        <QueueScreen sessionId={session.id} mode={session.mode} myName={myName} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { paddingHorizontal: 16, paddingBottom: 12 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 12 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tabBtnActive: { backgroundColor: colors.panel, borderColor: colors.ice },
  tabBtnText: { fontFamily: fonts.bodyMedium, color: colors.steel, fontSize: 14 },
  tabBtnTextActive: { color: colors.ice },
});

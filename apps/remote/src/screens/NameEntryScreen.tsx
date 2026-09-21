import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LogoWithWordmark } from '../components/Logo';
import { colors, fonts, chromeGradient } from '../lib/colors';
import { LinearGradientButton } from '../components/LinearGradientButton';

// Not persisted across app launches — deliberately simple for a first
// pass. This is the same lightweight, typed-display-name identity used
// throughout this whole project (no real auth) — it's what drives
// added_by on every queue write and Battle Mode's "adder sees their own"
// logic downstream.
export function NameEntryScreen({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <View style={styles.container}>
      <LogoWithWordmark markSize={40} textSize={24} />
      <Text style={styles.subtitle}>What's your name?</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.steel}
        autoFocus
        maxLength={30}
        onSubmitEditing={() => name.trim() && onSubmit(name.trim())}
      />
      <LinearGradientButton
        label="Continue"
        disabled={!name.trim()}
        onPress={() => onSubmit(name.trim())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
    backgroundColor: colors.background,
  },
  subtitle: { fontFamily: fonts.body, color: colors.steel, fontSize: 17 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.chrome,
    backgroundColor: colors.card,
  },
});
